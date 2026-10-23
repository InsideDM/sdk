"""Native synchronous HTTP adapter and shared response policy."""
from __future__ import annotations

import json
import inspect
import re
import threading
import time
from types import GenericAlias
from typing import Any, cast
from typing_extensions import TypeForm
from urllib.parse import urlsplit

import httpx2
from pydantic import TypeAdapter, ValidationError

from ._codec import CONTRACT, OPERATIONS, SCHEMAS, SchemaMismatch, decode, identities
from ._errors import (InsideDMAPIError, InsideDMConfigurationError, InsideDMError,
                      InsideDMProtocolError, InsideDMTransportError, WriteRecovery)
from ._generated import models
from ._models import Page, PageResult, ResponseMeta, Result
from ._policy import (Budget, MAX_BODY_BYTES, RETRY_STATUSES, Prepared, Settings,
                      credential, prepare, retry_after, retry_delay, url_for)
from ._version import __version__
from ._credentials import AccessTokenRequest, access_credential


class ResponsePolicy:
    def __init__(self, *, api_key: str | None, platform: bool, settings: Settings,
                 business_id: str | None = None, token_provider=None, invalidate=None, access_token=None):
        if access_token is not None:
            if api_key is not None or platform or token_provider is not None or not isinstance(access_token, str) and not callable(access_token):
                raise InsideDMConfigurationError("Provide access_token separately from api_key.", field="access_token")
            if isinstance(access_token, str):
                access_credential(access_token)
        if api_key is None and token_provider is None and access_token is None:
            raise InsideDMConfigurationError("Provide a server credential.", field="api_key")
        self._api_key = credential(api_key, platform=platform) if api_key is not None else None
        self.platform = platform
        self.settings = settings.override({})
        self.business_id = business_id
        self.application_id: str | None = None
        self.token_provider = token_provider
        self.invalidate = invalidate
        self._access_token = access_token
        self.oauth_grant_id: str | None = None
        self.closed = False
        self._adapters: dict[str, TypeAdapter] = {}

    def _prepare(self, key, paths, values):
        if self.closed:
            raise InsideDMConfigurationError("Create a new client after closing this one.", field="client")
        return prepare(key, paths, values, self.settings, platform=self.platform)

    def _request(self, http, prepared, budget, token):
        seconds = min(budget.remaining(), prepared.settings.attempt_timeout_seconds)
        headers = {"authorization": "Bearer " + token, "accept": "application/json",
                   "user-agent": "insidedm-python/" + __version__}
        if prepared.body is not None:
            headers["content-type"] = "application/json"
        if prepared.idempotency_key:
            headers["idempotency-key"] = prepared.idempotency_key
        if self._access_token is not None and self.business_id is not None and self.oauth_grant_id is not None:
            headers["x-insidedm-business-id"] = self.business_id
            headers["x-insidedm-grant-id"] = self.oauth_grant_id
        return http.build_request(OPERATIONS[prepared.operation]["method"], url_for(prepared, self.business_id),
                                  headers=headers, content=prepared.body, timeout=httpx2.Timeout(seconds))

    def _meta(self, response, attempt, prepared):
        request_id = response.headers.get("x-request-id")
        if not request_id or not re.fullmatch(r"req_[A-Za-z0-9_-]{22}", request_id):
            raise InsideDMProtocolError("InsideDM returned an invalid request identifier.", code="invalid_response",
                                        meta=ResponseMeta(None, response.status_code, attempt))
        return ResponseMeta(request_id, response.status_code, attempt,
                            retry_after(response.headers.get("retry-after")), prepared.idempotency_key)

    def _length(self, response, meta):
        value = response.headers.get("content-length")
        digits = (value.lstrip("0") or "0") if value is not None else "0"
        if value is not None and (not re.fullmatch(r"[0-9]+", value) or len(digits) > len(str(MAX_BODY_BYTES)) or int(digits) > MAX_BODY_BYTES):
            raise InsideDMProtocolError("InsideDM returned an oversized response.", code="response_too_large", meta=meta)
        content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
        if content_type not in {"application/json", "application/problem+json"}:
            raise InsideDMProtocolError("InsideDM returned an unexpected content type.", code="invalid_response", meta=meta)

    def _decode(self, content, response, meta, prepared):
        def refuse_constant(_):
            raise ValueError()
        try:
            raw = json.loads(content.decode("utf-8"), parse_constant=refuse_constant)
        except (ValueError, UnicodeError, RecursionError):
            raise InsideDMProtocolError("InsideDM returned invalid JSON.", code="invalid_json", meta=meta) from None
        if response.status_code != OPERATIONS[prepared.operation]["success_status"]:
            try:
                problem = decode(SCHEMAS["Problem"], raw, response=True)
                if problem["status"] != response.status_code or problem["requestId"] != meta.request_id:
                    raise ValueError()
            except (SchemaMismatch, ValueError, KeyError, TypeError):
                raise InsideDMProtocolError("InsideDM returned invalid problem details.", code="invalid_problem", meta=meta) from None
            error = InsideDMAPIError("InsideDM API request failed.", code=problem["code"], meta=meta, retryable=problem["retryable"])
            error._problem = problem
            raise error
        try:
            decoded = decode(OPERATIONS[prepared.operation]["response"], raw, response=True)
            context = self._oauth_context(response, meta) if self._access_token is not None else None
            self._identity(prepared, decoded, meta, oauth_business_id=context[0] if context else None)
            if context:
                self.business_id, self.oauth_grant_id = context
            return decoded, meta
        except SchemaMismatch:
            raise InsideDMProtocolError("InsideDM returned data outside the public contract.", code="invalid_response", meta=meta) from None

    def _access_token_request(self, prepared, budget):
        url = urlsplit(url_for(prepared, self.business_id))
        return AccessTokenRequest(operation=prepared.operation, method=OPERATIONS[prepared.operation]["method"],
                                  route=url.path + ("?" + url.query if url.query else ""), body=prepared.body,
                                  idempotency_key=prepared.idempotency_key, business_id=self.business_id,
                                  grant_id=self.oauth_grant_id, timeout_seconds=budget.remaining())

    def _oauth_context(self, response, meta):
        business = response.headers.get("x-insidedm-business-id")
        grant = response.headers.get("x-insidedm-grant-id")
        uuid = r"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"
        if not business or not grant or not re.fullmatch(uuid, business) or not re.fullmatch(uuid, grant) \
                or self.business_id is not None and self.business_id != business \
                or self.oauth_grant_id is not None and self.oauth_grant_id != grant:
            raise InsideDMProtocolError("The authorized connection changed. Create a separate client for each connection.",
                                        code="credential_context_changed", meta=meta)
        return business, grant

    def _identity(self, prepared, decoded, meta, *, oauth_business_id=None):
        def invalid():
            raise InsideDMProtocolError("InsideDM returned a different resource identity.", code="invalid_response", meta=meta)
        data = decoded.get("data", decoded)
        if prepared.operation == "getBusinessAnalytics" and any(data[key] != prepared.query[key] for key in ["channel", "range"]):
            invalid()
        requested = json.loads(prepared.body) if prepared.body is not None else {}
        if prepared.operation == "importWebsiteKnowledge":
            if data["url"] != requested["url"] or data["maxPages"] != requested.get("maxPages", 100):
                invalid()
        if prepared.operation == "removeWebsiteKnowledge" and data["url"] != requested["url"]:
            invalid()
        if prepared.operation == "removeKnowledgeSource" and (data["sourceId"] != prepared.paths["sourceId"].lower()
                or data["documentVersion"] < requested["expectedVersion"]):
            invalid()
        if prepared.operation in {"setKnowledgeSectionOverride", "acknowledgeKnowledgeSectionOverride"}:
            action = "acknowledge_override" if prepared.operation == "acknowledgeKnowledgeSectionOverride" else "clear_override" if requested["overrideMd"] is None else "set_override"
            if data["sectionId"] != prepared.paths["sectionId"].lower() or data["action"] != action or data["documentVersion"] != requested["expectedVersion"] + 1:
                invalid()
        expected_business = prepared.paths.get("businessId") or self.business_id or requested.get("businessId")
        for key, value in identities(OPERATIONS[prepared.operation]["response"], decoded):
            if key == "businessId" and expected_business and value != expected_business:
                invalid()
            if self.platform and key == "applicationId":
                if self.application_id is not None and value != self.application_id:
                    invalid()
                self.application_id = value
        list_identity_fields = {
            "listFlowRuns": "id",
            "listKnowledgeRuns": "id", "listKnowledgeSources": "id", "listKnowledgeSections": "id", "listSavedFlowBlocks": "flowId",
        }
        list_id = list_identity_fields.get(prepared.operation)
        if list_id is not None:
            if len({item[list_id] for item in data}) != len(data) or len(data) > prepared.query.get("limit", 25) \
                    or decoded["page"]["hasMore"] != (decoded["page"]["nextCursor"] is not None):
                invalid()
            filters = ("flowId", "status") if prepared.operation == "listFlowRuns" else \
                ("kind", "status") if prepared.operation == "listKnowledgeSources" else \
                ("status",) if prepared.operation == "listKnowledgeRuns" else ()
            if any(key in prepared.query and any(item[key] != prepared.query[key] for item in data) for key in filters):
                invalid()
            return
        if not isinstance(data, dict):
            return
        if prepared.operation == "getWorkspace":
            if self.business_id is not None and data["id"] != self.business_id or oauth_business_id is not None and data["id"] != oauth_business_id:
                invalid()
            self.business_id = data["id"]
        for path_name, result_name in [("contactId", "contactId"), ("conversationId", "conversationId"), ("subscriptionId", "subscriptionId"), ("installationId", "id"), ("operationId", "id"), ("recipeId", "recipeId"), ("preparationId", "id")]:
            if path_name in prepared.paths and result_name in data and prepared.paths[path_name] != data[result_name]:
                invalid()
        if prepared.operation == "updateConversationControl":
            if data["action"] != requested["action"]:
                invalid()
            if requested["action"] == "assign":
                expected_assignee = requested["assigneeUserId"]
                if data["assigneeUserId"] != (expected_assignee.lower() if expected_assignee is not None else None):
                    invalid()
        if prepared.operation == "listFlowSteps":
            if len({step["type"] for step in data["steps"]}) != len(data["steps"]):
                invalid()
        if prepared.operation == "getSavedFlowBlockInterface":
            if data["flowId"] != prepared.paths["flowId"] or data["versionId"] != prepared.query["versionId"].lower() \
                    or any(len({port["variableId"] for port in data[kind]}) != len(data[kind])
                           or len({port["key"] for port in data[kind]}) != len(data[kind]) for kind in ("inputs", "outputs")):
                invalid()
        if prepared.operation == "createContactField":
            definition = data["definition"]
            if definition["label"] != requested["label"].strip() or definition["type"] != requested.get("type", "text"):
                invalid()
            if requested.get("key") is not None and definition["key"] != requested["key"]:
                invalid()
            if definition["agentMayRemember"] or definition["agentHint"] is not None:
                invalid()
        if prepared.operation == "archiveContactField":
            if data["definitionId"] != prepared.paths["definitionId"] or data["appliedVersion"] != requested["expectedVersion"] + 1:
                invalid()
        if prepared.operation == "configureContactFieldMemory":
            definition = data["definition"]
            if definition["id"] != prepared.paths["definitionId"] or definition["agentMayRemember"] != requested["agentMayRemember"] \
                    or data["appliedVersion"] != requested["expectedVersion"] + int(data["changed"]):
                invalid()
            if "agentHint" in requested and requested["agentHint"] is None and definition["agentHint"] is not None:
                invalid()
        if prepared.operation == "getPlatformBusiness" and data.get("id") != prepared.paths["businessId"]:
            invalid()
        id_operations = {
            "getKnowledgeRun": "runId",
            "getContact": "contactId", "getConversation": "conversationId",
            "getMessage": "messageId", "getOrder": "orderId", "getShipment": "shipmentId",
            "getFlowRun": "runId", "getBusinessCreation": "creationId", "renewBusinessClaimLink": "creationId",
            "getOnboardingSession": "sessionId", "getInstallationRequest": "requestId",
            "cancelInstallationRequest": "requestId", "getFlowPublicationRequest": "releaseRequestId",
        }
        path_id = id_operations.get(prepared.operation)
        if path_id and data.get("id") != prepared.paths[path_id]:
            invalid()
        if prepared.operation == "getBlueprintVersion" and (data["definition"]["key"] != prepared.paths["blueprintKey"]
                or str(data["definition"]["version"]) != prepared.paths["version"]):
            invalid()
        if "subscriptionId" in prepared.paths and isinstance(data.get("subscription"), dict) and data["subscription"]["id"] != prepared.paths["subscriptionId"]:
            invalid()
        if prepared.operation == "getPlatformSubscriptionDelivery" and data["delivery"]["id"] != prepared.paths["deliveryId"]:
            invalid()
        if prepared.operation == "createPlatformBusiness" and data["externalId"] != requested["externalId"]:
            invalid()
        if prepared.operation == "getConsentState" and data["contactId"] != prepared.query["contactId"]:
            invalid()
        if prepared.operation == "getSoftwareUsage" and prepared.query["view"] == "software_usage":
            if data["period"]["from"] != prepared.query["from"] or data["period"]["to"] != prepared.query["to"]:
                invalid()
        if prepared.operation == "getPartnerApiUsage":
            if data["granularity"] != prepared.query.get("granularity", "day") or any(
                data[key] != prepared.query[key] for key in ["from", "to"] if key in prepared.query
            ):
                invalid()
        if prepared.body is not None:
            requested = json.loads(prepared.body)
            if prepared.operation == "importFlowTemplate":
                if data["packId"] != prepared.paths["packId"] or data["version"] != requested["version"] or ("blueprint" in requested and data["digest"] != requested["blueprint"]["digest"]):
                    invalid()
            if prepared.operation == "saveFlowDraft" and requested["kind"] == "managed_draft":
                if (data.get("kind") != "managed_draft" or data["deploymentRevision"] != requested["expectedDeploymentRevision"]
                    or data["draftRevision"] != requested["expectedDraftRevision"] + int(data["status"] == "draft_updated")):
                    invalid()
            elif prepared.operation in {"previewBlueprintUpdate", "saveFlowDraft"}:
                if data["target"] != requested["target"]:
                    invalid()
                if prepared.operation == "previewBlueprintUpdate" and "bindings" in requested and data["bindings"] != requested["bindings"]:
                    invalid()
                if prepared.operation == "saveFlowDraft":
                    updated = data["status"] == "draft_updated"
                    if (data["deploymentRevision"] != requested["expectedDeploymentRevision"] + int(updated)
                        or data["draftRevision"] not in [requested["expectedDraftRevision"], *([requested["expectedDraftRevision"] + 1] if updated else [])]):
                        invalid()
        app_id = data.get("applicationId") or (data.get("application", {}).get("id") if isinstance(data.get("application"), dict) else None)
        if self.platform and app_id is not None:
            if self.application_id is not None and app_id != self.application_id:
                invalid()
            self.application_id = app_id

    def _result(self, prepared, raw, meta):
        binding = CONTRACT["bindings"][prepared.key]
        page_type = binding["page"]
        data = raw if binding["bare"] else raw[binding["result_property"]]
        if page_type == "nested_page":
            data, cursor = data["data"], data["page"]["nextCursor"]
        elif page_type == "deliveries":
            data, cursor = data["deliveries"], data["nextCursor"]
        elif page_type:
            cursor = raw["page"]["nextCursor"]
        type_name = binding["result"]
        if type_name not in self._adapters:
            model = getattr(models, type_name)
            # Runtime types are selected only from our generated namespace.
            self._adapters[type_name] = TypeAdapter(cast(TypeForm[Any], GenericAlias(list, model) if page_type else model))
        try:
            parsed = self._adapters[type_name].validate_python(data)
        except ValidationError:
            raise InsideDMProtocolError("InsideDM returned invalid typed data.", code="invalid_response", meta=meta) from None
        return PageResult(parsed, meta, Page(cursor)) if page_type else Result(parsed, meta)

    def _recover(self, error, prepared):
        if prepared.idempotency_key:
            error._recovery = WriteRecovery(prepared.operation, self.business_id, prepared.idempotency_key)
        return error

    def _retry(self, error, prepared, retries, budget):
        retryable = (isinstance(error, InsideDMTransportError) and error.retryable) or (
            isinstance(error, InsideDMAPIError) and error.status in RETRY_STATUSES and error.retryable)
        if not retryable or retries >= prepared.settings.max_retries:
            return None
        delay = retry_delay(retries + 1, error.meta.retry_after_seconds)
        if delay >= budget.remaining():
            return None
        return delay

    def _http_failure(self, error, meta):
        if isinstance(error, httpx2.TimeoutException):
            return InsideDMTransportError("InsideDM request timed out.", code="request_timeout", meta=meta, retryable=True)
        if isinstance(error, httpx2.DecodingError):
            return InsideDMProtocolError("InsideDM returned an invalid encoded response.", code="invalid_response", meta=meta)
        retryable = isinstance(error, (httpx2.NetworkError, httpx2.ProxyError, httpx2.RemoteProtocolError))
        # Caller hooks, local protocol/configuration errors and implementation
        # failures must never be retried as though a network connection failed.
        return InsideDMTransportError(
            "InsideDM network request failed." if retryable else "The HTTP client could not execute the request.",
            code="network_error" if retryable else "http_client_error", meta=meta, retryable=retryable,
        )


class Transport(ResponsePolicy):
    def __init__(self, *, api_key, platform=False, settings=Settings(), http_client=None,
                 business_id=None, token_provider=None, invalidate=None, access_token=None):
        super().__init__(api_key=api_key, platform=platform, settings=settings,
                         business_id=business_id, token_provider=token_provider, invalidate=invalidate, access_token=access_token)
        if http_client is not None and not isinstance(http_client, httpx2.Client):
            raise InsideDMConfigurationError("Use a synchronous HTTPX2 Client.", field="http_client")
        self.http = http_client or httpx2.Client(follow_redirects=False)
        self.owned = http_client is None
        self._workspace_lock = threading.Lock()

    def close(self):
        if not self.closed:
            self.closed = True
            if self.owned:
                self.http.close()

    def invoke(self, key, paths, values, *, expected_business_id=None):
        prepared = self._prepare(key, paths, values)
        budget = Budget(time.monotonic() + prepared.settings.timeout_seconds)
        try:
            if not self.platform and self.business_id is None and ("businessId" in OPERATIONS[prepared.operation]["path_parameters"]
                    or self._access_token is not None and prepared.operation != "getWorkspace"):
                if not self._workspace_lock.acquire(timeout=budget.remaining()):
                    budget.remaining()
                    raise InsideDMTransportError("InsideDM workspace discovery timed out.", code="request_timeout")
                try:
                    if self.business_id is None:
                        discovery = prepare("business.workspace.get", {}, {}, prepared.settings, platform=False)
                        self._execute(discovery, budget)
                finally:
                    self._workspace_lock.release()
            if expected_business_id is not None and self.business_id != expected_business_id:
                raise InsideDMConfigurationError("Use this deployment's own business client.", field="business_id")
            raw, meta = self._execute(prepared, budget)
            return self._result(prepared, raw, meta)
        except InsideDMError as error:
            raise self._recover(error, prepared) from None

    def _execute(self, prepared, budget):
        retries, attempt, refreshed = 0, 0, False
        while True:
            if self.closed:
                raise InsideDMConfigurationError("Create a new client after closing this one.", field="client")
            budget.remaining()
            token: str | None
            if self._access_token is not None:
                try:
                    provided = self._access_token(self._access_token_request(prepared, budget)) if callable(self._access_token) else self._access_token
                except Exception:
                    budget.remaining()
                    raise InsideDMConfigurationError("The access_token provider failed. Check your token manager.", field="access_token") from None
                if inspect.isawaitable(provided):
                    if inspect.iscoroutine(provided):
                        provided.close()
                    raise InsideDMConfigurationError("Use an asynchronous token provider with AsyncInsideDM.", field="access_token")
                token = access_credential(provided)
                budget.remaining()
            else:
                token = self.token_provider(budget, prepared.settings) if self.token_provider else self._api_key
            attempt += 1
            request = self._request(self.http, prepared, budget, token)
            attempt_deadline = min(budget.deadline, time.monotonic() + prepared.settings.attempt_timeout_seconds)
            response = None
            meta = ResponseMeta(None, None, attempt)
            try:
                response = self.http.send(request, stream=True, follow_redirects=False)
                meta = self._meta(response, attempt, prepared)
                self._length(response, meta)
                chunks, size = [], 0
                iterator = response.iter_bytes(chunk_size=65536)
                while True:
                    seconds = min(budget.remaining(), attempt_deadline - time.monotonic())
                    if seconds <= 0:
                        raise httpx2.ReadTimeout("SDK attempt budget exhausted.")
                    request.extensions["timeout"]["read"] = seconds
                    try:
                        chunk = next(iterator)
                    except StopIteration:
                        break
                    size += len(chunk)
                    if size > MAX_BODY_BYTES:
                        raise InsideDMProtocolError("InsideDM returned an oversized response.", code="response_too_large", meta=meta)
                    chunks.append(chunk)
                budget.remaining()
                return self._decode(b"".join(chunks), response, meta, prepared)
            except InsideDMError as error:
                failure = error
            except Exception as error:
                failure = self._http_failure(error, meta)
            finally:
                if response is not None:
                    response.close()
            if self.token_provider and isinstance(failure, InsideDMAPIError) and failure.code == "invalid_token":
                self.invalidate(token)
                if not refreshed:
                    refreshed = True
                    continue
            delay = self._retry(failure, prepared, retries, budget)
            if delay is None:
                raise failure from None
            retries += 1
            time.sleep(delay)
