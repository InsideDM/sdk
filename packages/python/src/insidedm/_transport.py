"""Native synchronous HTTP adapter and shared response policy."""
from __future__ import annotations

import json
import re
import threading
import time
from types import GenericAlias
from typing import Any, cast
from typing_extensions import TypeForm

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


class ResponsePolicy:
    def __init__(self, *, api_key: str | None, platform: bool, settings: Settings,
                 business_id: str | None = None, token_provider=None, invalidate=None):
        if api_key is None and token_provider is None:
            raise InsideDMConfigurationError("Provide a server credential.", field="api_key")
        self._api_key = credential(api_key, platform=platform) if api_key is not None else None
        self.platform = platform
        self.settings = settings.override({})
        self.business_id = business_id
        self.application_id: str | None = None
        self.token_provider = token_provider
        self.invalidate = invalidate
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
        if value is not None and (not re.fullmatch(r"\d+", value) or int(value) > MAX_BODY_BYTES):
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
            self._identity(prepared, decoded, meta)
            return decoded, meta
        except SchemaMismatch:
            raise InsideDMProtocolError("InsideDM returned data outside the public contract.", code="invalid_response", meta=meta) from None

    def _identity(self, prepared, decoded, meta):
        def invalid():
            raise InsideDMProtocolError("InsideDM returned a different resource identity.", code="invalid_response", meta=meta)
        data = decoded["data"]
        requested = json.loads(prepared.body) if prepared.body is not None else {}
        expected_business = prepared.paths.get("businessId") or self.business_id or requested.get("businessId")
        for key, value in identities(OPERATIONS[prepared.operation]["response"], decoded):
            if key == "businessId" and expected_business and value != expected_business:
                invalid()
            if self.platform and key == "applicationId":
                if self.application_id is not None and value != self.application_id:
                    invalid()
                self.application_id = value
        if not isinstance(data, dict):
            return
        if prepared.operation == "getWorkspace":
            if self.business_id is not None and data["id"] != self.business_id:
                invalid()
            self.business_id = data["id"]
        for path_name, result_name in [("contactId", "contactId"), ("subscriptionId", "subscriptionId"), ("installationId", "id"), ("operationId", "id"), ("recipeId", "recipeId")]:
            if path_name in prepared.paths and result_name in data and prepared.paths[path_name] != data[result_name]:
                invalid()
        if prepared.operation == "getPlatformBusiness" and data.get("id") != prepared.paths["businessId"]:
            invalid()
        id_operations = {
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
        if prepared.body is not None:
            requested = json.loads(prepared.body)
            if prepared.operation == "importFlowTemplate":
                if data["packId"] != prepared.paths["packId"] or data["version"] != requested["version"] or ("blueprint" in requested and data["digest"] != requested["blueprint"]["digest"]):
                    invalid()
            if prepared.operation in {"previewBlueprintUpdate", "applyBlueprintUpdate"}:
                if data["target"] != requested["target"]:
                    invalid()
                if prepared.operation == "previewBlueprintUpdate" and "bindings" in requested and data["bindings"] != requested["bindings"]:
                    invalid()
                if prepared.operation == "applyBlueprintUpdate":
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
        data = raw["data"]
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
        retryable = isinstance(error, InsideDMTransportError) or (
            isinstance(error, InsideDMAPIError) and error.status in RETRY_STATUSES and error.retryable)
        if not retryable or retries >= prepared.settings.max_retries:
            return None
        delay = retry_delay(retries + 1, error.meta.retry_after_seconds)
        if delay >= budget.remaining():
            return None
        return delay


class Transport(ResponsePolicy):
    def __init__(self, *, api_key, platform=False, settings=Settings(), http_client=None,
                 business_id=None, token_provider=None, invalidate=None):
        super().__init__(api_key=api_key, platform=platform, settings=settings,
                         business_id=business_id, token_provider=token_provider, invalidate=invalidate)
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
            if not self.platform and "businessId" in OPERATIONS[prepared.operation]["path_parameters"] and self.business_id is None:
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
            token = self.token_provider(budget, prepared.settings) if self.token_provider else self._api_key
            attempt += 1
            request = self._request(self.http, prepared, budget, token)
            attempt_deadline = min(budget.deadline, time.monotonic() + prepared.settings.attempt_timeout_seconds)
            response = None
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
            except httpx2.TimeoutException:
                failure = InsideDMTransportError("InsideDM request timed out.", code="request_timeout", meta=ResponseMeta(None, None, attempt), retryable=True)
            except Exception:
                failure = InsideDMTransportError("InsideDM network request failed.", code="network_error", meta=ResponseMeta(None, None, attempt), retryable=True)
            finally:
                if response is not None:
                    response.close()
            if self.token_provider and isinstance(failure, InsideDMAPIError) and failure.code == "invalid_token" and not refreshed:
                self.invalidate(token)
                refreshed = True
                continue
            delay = self._retry(failure, prepared, retries, budget)
            if delay is None:
                raise failure from None
            retries += 1
            time.sleep(delay)
