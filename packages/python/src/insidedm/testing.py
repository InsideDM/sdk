"""Synthetic offline clients. No fixture request can fall through to the network."""
from __future__ import annotations

import re
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable

import httpx2

from ._client import AsyncInsideDM, InsideDM
from ._codec import OPERATIONS, SCHEMAS, resolve
from ._version import API_ORIGIN

TEST_ID = "00000000-0000-4000-8000-000000000001"
TEST_REQUEST_ID = "req_" + "A" * 22
TEST_API_KEY = "idm_" + "A" * 16 + "_" + "A" * 43


@dataclass(frozen=True)
class WebhookFixture:
    raw_body: bytes = field(repr=False)
    signature: str = field(repr=False)
    secret: str = field(repr=False)


def create_webhook_fixture(event: dict | None = None, *, timestamp: int | None = None) -> WebhookFixture:
    """Sign synthetic bytes using the same protocol as real webhook verification."""
    import json
    import time
    from ._codec import SCHEMAS
    from .webhooks import _secret, _signature
    value = event if event is not None else _sample(SCHEMAS["EndpointTestEventEnvelope"])
    body = json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode()
    at = int(time.time()) if timestamp is None else timestamp
    if type(at) is not int or at < 0:
        raise ValueError("Fixture timestamp must be non-negative integer seconds.")
    secret = "whsec_" + "A" * 43
    return WebhookFixture(body, f"t={at},v1={_signature(_secret(secret), at, body)}", secret)


def _sample(schema, name=""):
    schema = resolve(schema)
    if "const" in schema:
        return schema["const"]
    if "enum" in schema:
        return schema["enum"][0]
    if "allOf" in schema:
        value = {}
        for child in schema["allOf"]:
            value.update(_sample(child, name))
        return value
    if "oneOf" in schema:
        return _sample(schema["oneOf"][0], name)
    if "anyOf" in schema:
        return _sample(schema["anyOf"][0], name)
    kinds = schema.get("type", "string")
    if isinstance(kinds, list):
        if "null" in kinds:
            return None
        kinds = kinds[0]
    if kinds == "null":
        return None
    if kinds == "object":
        properties = schema.get("properties", {})
        value = {k: _sample(v, k) for k, v in properties.items() if k in schema.get("required", [])}
        if schema.get("minProperties", 0) and not value and isinstance(schema.get("additionalProperties"), dict):
            value["example"] = _sample(schema["additionalProperties"])
        return value
    if kinds == "array":
        count = max(schema.get("minItems", 0), min(1, schema.get("maxItems", 1)))
        return [_sample(schema.get("items", {}), name) for _ in range(count)]
    if kinds == "boolean":
        return name not in {"hasMore", "ready", "replayable", "replayPending"}
    if kinds in {"integer", "number"}:
        return schema.get("minimum", 0)
    if schema.get("format") == "uuid":
        return TEST_ID
    if schema.get("format") == "date-time":
        return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    if schema.get("format") == "date":
        return "2026-10-21"
    if name == "requestId":
        return TEST_REQUEST_ID
    if schema.get("pattern") == "^cc1_[a-f0-9]{64}$":
        return "cc1_" + "0" * 64
    candidates = ["fixture", "test", "a", "1", "0", "", "whatsapp", "+919800000099",
                  "op1_" + "A" * 43, "sha256:" + "a" * 64, "a" * 64,
                  "whsec_" + "A" * 43, "https://example.invalid/callback",
                  "idmd_" + "A" * 16 + "_" + "A" * 43,
                  "A" * 43, "a" * max(1, schema.get("minLength", 1))]
    for value in candidates:
        if not schema.get("minLength", 0) <= len(value) <= schema.get("maxLength", 10000):
            continue
        if "pattern" not in schema or re.search(schema["pattern"], value, flags=re.ASCII):
            return value
    raise ValueError("This operation needs an explicit offline response fixture.")


# Concrete OpenAPI routes precede templates regardless of declaration order.
# A fixed discovery word must not become a synthetic conversation ID.
_OPERATIONS_BY_SPECIFICITY = sorted(OPERATIONS.items(), key=lambda item: tuple(segment.startswith("{") for segment in item[1]["path"].split("/")))


def _default_response(request: httpx2.Request) -> httpx2.Response:
    if str(request.url.copy_with(path="/", query=None)).rstrip("/") != API_ORIGIN:
        raise AssertionError("Offline transport refuses unexpected API origins.")
    for operation_id, operation in _OPERATIONS_BY_SPECIFICITY:
        match = re.fullmatch(re.sub(r"\{([^}]+)\}", r"(?P<\1>[^/]+)", operation["path"]), request.url.path)
        if operation["method"] != request.method or not match:
            continue
        body = _sample(operation["response"])
        if operation_id == "updateConversationControl":
            submitted = json.loads(request.content)
            assignee = TEST_ID if submitted["action"] == "take_over" else submitted["assigneeUserId"]
            body = {"data": {"businessId": TEST_ID, "conversationId": match.groupdict()["conversationId"], "auditId": TEST_ID,
                             "requestId": TEST_REQUEST_ID, "action": submitted["action"], "assigneeUserId": assignee.lower() if assignee is not None else None,
                             "changed": True, "appliedRevision": "cc1_" + "1" * 64}}
        if operation_id == "getConversationControl":
            body = {"data": {"businessId": TEST_ID, "conversationId": match.groupdict()["conversationId"], "revision": "cc1_" + "0" * 64,
                             "channel": "whatsapp", "lifecycle": "open", "owner": {"kind": "unassigned", "userId": None},
                             "automation": {"paused": False, "pausedAt": None}, "snoozedUntil": None, "handoff": None,
                             "updatedAt": "2026-01-01T00:00:00.000Z"}}
        if operation_id in {"prepareMessagingConfiguration", "getPreparedMessagingConfiguration", "applyPreparedMessagingConfiguration"}:
            preparation_id = match.groupdict().get("preparationId", TEST_ID)
            body = {"data": {"businessId": TEST_ID, "id": preparation_id, "kind": "messaging_configuration",
                             "state": "awaiting_review", "revision": 1, "intentDigest": "0" * 64,
                             "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z",
                             "expiresAt": "2026-01-01T00:15:00.000Z", "reviewedAt": None, "reasonCode": None, "result": None,
                             "review": {"url": f"https://insidedm.io/approve/settings/{TEST_ID}/{preparation_id}",
                                        "expiresAt": "2026-01-01T00:15:00.000Z"}}}
        if operation_id == "getFlowDeployment" and request.url.params.get("view") == "draft":
            body = {"data": {"businessId": TEST_ID, "recipeId": match.groupdict()["recipeId"], "deploymentRevision": 1, "revision": None,
                             "fingerprint": None, "state": "unavailable", "reasons": ["missing_draft"], "definition": None, "sideEffects": False}}
        if operation_id == "getFlowTemplateCatalog" and request.url.params.get("view") == "flow_deployments":
            body = {"data": {"businessId": TEST_ID, "deployments": [], "page": {"hasMore": False, "nextCursor": None}}}
        if operation_id == "saveFlowDraft":
            submitted = json.loads(request.content)
            body = {"data": {"businessId": TEST_ID, "recipeId": match.groupdict()["recipeId"],
                             "deploymentRevision": submitted["expectedDeploymentRevision"], "draftRevision": submitted["expectedDraftRevision"], "status": "unchanged",
                             **({"kind": "managed_draft", "fingerprint": "sha256:" + "0" * 64, "sideEffects": False} if submitted["kind"] == "managed_draft" else {"target": submitted["target"]})}}
        if operation_id == "updateMessagingConfiguration":
            submitted = json.loads(request.content)
            body = {"configuration": {"value": submitted["configuration"], "version": (submitted["expectedVersion"] or 0) + 1}}
        if operation_id == "getBusinessAnalytics":
            body.update(channel=request.url.params.get("channel", "all"), range=request.url.params.get("range", "month"))
        if operation_id == "getSoftwareUsage":
            view = "SoftwareUsageSummary" if request.url.params["view"] == "software_usage" else "SoftwareLimits"
            body = {"data": _sample(SCHEMAS[view])}
        if operation_id == "getLoyaltyMembership":
            body = {"data": {"businessId": TEST_ID, "contactId": match.groupdict()["contactId"],
                             "observedAt": "2026-01-01T00:00:00.000Z", "enrolled": False,
                             "preMember": False, "joinedAt": None, "tier": None,
                             "wallets": [], "openHoldCount": 0}}
        data = body.get("data")
        if isinstance(data, dict):
            params = match.groupdict()
            if operation_id == "getConsentState":
                data.update(contactId=request.url.params["contactId"], identities=[])
            if operation_id == "getSoftwareUsage" and "period" in data:
                data["period"] = {name: request.url.params[name] for name in ["from", "to"]}
            for key in ["businessId", "subscriptionId", "contactId", "recipeId", "packId"]:
                if key in params and key in data:
                    data[key] = params[key]
            for key in ["contactId", "operationId", "conversationId", "messageId", "orderId", "shipmentId", "installationId"]:
                if key in params and "id" in data:
                    data["id"] = params[key]
        return httpx2.Response(operation["success_status"], json=body,
                               headers={"x-request-id": TEST_REQUEST_ID})
    raise AssertionError("Offline transport refuses unknown operations.")


def create_test_client(*, respond: Callable[[httpx2.Request], httpx2.Response | None] | None = None) -> InsideDM:
    """Explore real business resource methods using synthetic contract data only.

    `respond` can supply a specific response or return None for the default.
    It is not a real-service sandbox or evidence of provider acceptance.
    """
    def handler(request):
        return (respond(request) if respond else None) or _default_response(request)
    http = httpx2.Client(transport=httpx2.MockTransport(handler))
    client = InsideDM(api_key=TEST_API_KEY, http_client=http, max_retries=0)
    client._transport.owned = True
    return client


def create_async_test_client(*, respond=None) -> AsyncInsideDM:
    """Async equivalent of create_test_client; also never contacts the service."""
    import inspect

    async def handler(request):
        response = respond(request) if respond else None
        if inspect.isawaitable(response):
            response = await response
        return response or _default_response(request)
    http = httpx2.AsyncClient(transport=httpx2.MockTransport(handler))
    client = AsyncInsideDM(api_key=TEST_API_KEY, http_client=http, max_retries=0)
    client._transport.owned = True
    return client
