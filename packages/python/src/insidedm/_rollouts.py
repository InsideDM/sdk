"""Bounded local draft orchestration; no scheduler or publication authority."""
from __future__ import annotations

import hashlib
import json
from collections.abc import AsyncIterator, Iterator, Sequence
from typing import Literal, NotRequired, TypedDict, Unpack
from uuid import uuid4

from pydantic import Field, TypeAdapter

from ._codec import SCHEMAS, SchemaMismatch, decode, input_value
from ._errors import (InsideDMAPIError, InsideDMConfigurationError, InsideDMError,
                      InsideDMProtocolError, InsideDMTransportError)
from ._flow_facades import ReadOptions, _native, _options, _snapshot, blueprint_target
from ._generated import inputs, models
from ._generated.resources import PlatformBlueprints
from ._generated.async_resources import AsyncPlatformBlueprints
from ._models import ResponseModel

SCHEMA_VERSION = "inside-blueprint-draft-rollout/v1"
UUID = {"type": "string", "pattern": "^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$"}


class RolloutSelection(TypedDict):
    business_id: str
    recipe_id: str
    bindings: NotRequired[inputs.FlowTemplateBindings]


class RolloutFailure(ResponseModel):
    kind: Literal["configuration", "api", "transport", "timeout", "aborted", "protocol", "webhook_verification", "unexpected"]
    code: str
    status: int | None
    request_id: str | None = Field(alias="requestId")
    retryable: bool
    retry_after_seconds: float | None = Field(alias="retryAfterSeconds")


class RolloutClientPreview(ResponseModel):
    business_id: str = Field(alias="businessId")
    recipe_id: str = Field(alias="recipeId")
    preview: models.BlueprintUpdatePreview | None
    error: RolloutFailure | None


class BlueprintRolloutPlan(ResponseModel):
    schema_version: Literal["inside-blueprint-draft-rollout/v1"] = Field(alias="schemaVersion")
    id: str
    target: models.BlueprintUpdateTarget
    clients: list[RolloutClientPreview]


class BlueprintRolloutOutcome(ResponseModel):
    business_id: str = Field(alias="businessId")
    recipe_id: str = Field(alias="recipeId")
    state: Literal["draft_updated", "unchanged", "action_required", "preview_failed", "not_attempted", "failed"]
    idempotency_key: str | None = Field(alias="idempotencyKey", repr=False)
    receipt: models.BlueprintUpdateReceipt | None
    reasons: list[str]
    error: RolloutFailure | None
    request_id: str | None = Field(alias="requestId")


_FAILURE = {"type": "object", "additionalProperties": False,
    "required": ["kind", "code", "status", "requestId", "retryable", "retryAfterSeconds"],
    "properties": {
        "kind": {"type": "string", "enum": ["configuration", "api", "transport", "timeout", "aborted", "protocol", "webhook_verification", "unexpected"]},
        "code": {"type": "string", "pattern": "^[a-z][a-z0-9_]{0,127}$"},
        "status": {"type": ["integer", "null"], "minimum": 100, "maximum": 599},
        "requestId": {"oneOf": [{"type": "null"}, {"type": "string", "pattern": "^[A-Za-z0-9_-]{1,128}$"}]},
        "retryable": {"type": "boolean"}, "retryAfterSeconds": {"type": ["number", "null"], "minimum": 0},
    }}
_PLAN = {"type": "object", "additionalProperties": False, "required": ["schemaVersion", "id", "target", "clients"],
    "properties": {
        "schemaVersion": {"const": SCHEMA_VERSION}, "id": UUID,
        "target": {"$ref": "#/components/schemas/BlueprintUpdateTarget"},
        "clients": {"type": "array", "minItems": 1, "maxItems": 25, "items": {
            "type": "object", "additionalProperties": False, "required": ["businessId", "recipeId", "preview", "error"],
            "properties": {"businessId": UUID, "recipeId": UUID,
                "preview": {"oneOf": [{"type": "null"}, {"$ref": "#/components/schemas/BlueprintUpdatePreview"}]},
                "error": {"oneOf": [{"type": "null"}, _FAILURE]}}}},
    }}
_SELECTION = {"type": "object", "additionalProperties": False, "required": ["businessId", "recipeId"],
    "properties": {"businessId": UUID, "recipeId": UUID, "bindings": {"$ref": "#/components/schemas/FlowTemplateBindings"}}}


def _failure(error):
    if not isinstance(error, InsideDMError):
        return {"kind": "unexpected", "code": "unexpected_failure", "status": None, "requestId": None,
                "retryable": False, "retryAfterSeconds": None}
    kind = ("configuration" if isinstance(error, InsideDMConfigurationError) else
            "api" if isinstance(error, InsideDMAPIError) else "protocol" if isinstance(error, InsideDMProtocolError) else
            "timeout" if error.code == "request_timeout" else "transport")
    return {"kind": kind, "code": error.code, "status": error.status, "requestId": error.request_id,
            "retryable": error.retryable, "retryAfterSeconds": error.meta.retry_after_seconds}


def _read_plan(value):
    try:
        plan = decode(_PLAN, _snapshot(value))
        seen = set()
        for client in plan["clients"]:
            key = (client["businessId"], client["recipeId"])
            if key in seen or (client["preview"] is None) == (client["error"] is None):
                raise ValueError()
            seen.add(key)
            preview = client["preview"]
            if preview is not None and (preview["businessId"] != key[0] or preview["recipeId"] != key[1] or preview["target"] != plan["target"]):
                raise ValueError()
        return plan
    except (SchemaMismatch, ValueError, TypeError, KeyError):
        raise InsideDMConfigurationError("Use the original bounded rollout plan with distinct client/flow selections.") from None


def _preview_inputs(blueprint, clients, kwargs, settings):
    source, target = blueprint_target(blueprint)
    options = _options(kwargs)
    settings.override(options)
    if not isinstance(clients, (list, tuple)) or not 1 <= len(clients) <= 25:
        raise InsideDMConfigurationError("Select 1–25 distinct business/flow pairs.")
    captured, seen = [], set()
    for client in clients:
        held = input_value(_SELECTION, client)
        key = held["businessId"], held["recipeId"]
        if key in seen:
            raise InsideDMConfigurationError("Select distinct business/flow pairs.")
        seen.add(key)
        captured.append(held)
    return source, target, captured, options


def _outcome(client, **values):
    return BlueprintRolloutOutcome.model_validate({"businessId": client["businessId"], "recipeId": client["recipeId"],
        "idempotencyKey": None, "receipt": None, "reasons": [], "error": None, "requestId": None, **values})


def _intent(plan, client):
    raw = json.dumps([plan["id"], client["businessId"], client["recipeId"]], separators=(",", ":")).encode()
    return "blueprint-rollout/v1/" + hashlib.sha256(raw).hexdigest()


class BlueprintRollouts:
    def __init__(self, platform):
        self._platform = platform

    def preview(self, blueprint: models.PublicBlueprintVersion, clients: Sequence[RolloutSelection],
                **kwargs: Unpack[ReadOptions]) -> BlueprintRolloutPlan:
        """Inspect up to 25 explicitly selected drafts; persist the resulting plan."""
        source, target, captured, options = _preview_inputs(blueprint, clients, kwargs, self._platform._transport.settings)
        plan = {"schemaVersion": SCHEMA_VERSION, "id": str(uuid4()), "target": target, "clients": []}
        for client in captured:
            item = {"businessId": client["businessId"], "recipeId": client["recipeId"], "preview": None, "error": None}
            try:
                values = {"bindings": _native("FlowTemplateBindings", client["bindings"])} if "bindings" in client else {}
                result = self._platform.for_business(client["businessId"]).flows.deployments.preview_update(client["recipeId"], source, **values, **options)
                item["preview"] = result.data.model_dump(mode="json", by_alias=True, exclude_unset=True)
            except Exception as error:
                item["error"] = _failure(error)
            plan["clients"].append(item)
        return BlueprintRolloutPlan.model_validate(_read_plan(plan))

    def apply(self, plan: BlueprintRolloutPlan, **kwargs: Unpack[ReadOptions]) -> Iterator[BlueprintRolloutOutcome]:
        """Yield serial draft outcomes lazily; restart with the same saved plan."""
        captured, options = _read_plan(plan), _options(kwargs)
        self._platform._transport.settings.override(options)

        def outcomes():
            for client in captured["clients"]:
                preview = client["preview"]
                if preview is None:
                    yield _outcome(client, state="preview_failed", error=client["error"])
                    continue
                if preview["state"] == "action_required":
                    yield _outcome(client, state="action_required", reasons=preview["reasons"])
                    continue
                key = _intent(captured, client)
                try:
                    result = self._platform.for_business(client["businessId"]).flows.deployments.apply_update(preview, idempotency_key=key, **options)
                    yield _outcome(client, state=result.data.status, idempotencyKey=key,
                                   receipt=result.data, requestId=result.meta.request_id)
                except Exception as error:
                    failure = _failure(error)
                    yield _outcome(client, state="failed", idempotencyKey=key, error=failure, requestId=failure["requestId"])
        return outcomes()


class AsyncBlueprintRollouts:
    def __init__(self, platform):
        self._platform = platform

    async def preview(self, blueprint: models.PublicBlueprintVersion, clients: Sequence[RolloutSelection],
                      **kwargs: Unpack[ReadOptions]) -> BlueprintRolloutPlan:
        """Inspect selected drafts serially; cancellation stops further reads."""
        source, target, captured, options = _preview_inputs(blueprint, clients, kwargs, self._platform._transport.settings)
        plan = {"schemaVersion": SCHEMA_VERSION, "id": str(uuid4()), "target": target, "clients": []}
        for client in captured:
            item = {"businessId": client["businessId"], "recipeId": client["recipeId"], "preview": None, "error": None}
            try:
                values = {"bindings": _native("FlowTemplateBindings", client["bindings"])} if "bindings" in client else {}
                result = await self._platform.for_business(client["businessId"]).flows.deployments.preview_update(client["recipeId"], source, **values, **options)
                item["preview"] = result.data.model_dump(mode="json", by_alias=True, exclude_unset=True)
            except Exception as error:
                item["error"] = _failure(error)
            plan["clients"].append(item)
        return BlueprintRolloutPlan.model_validate(_read_plan(plan))

    def apply(self, plan: BlueprintRolloutPlan, **kwargs: Unpack[ReadOptions]) -> AsyncIterator[BlueprintRolloutOutcome]:
        """Yield serial draft writes; cancellation/break prevents later clients."""
        captured, options = _read_plan(plan), _options(kwargs)
        self._platform._transport.settings.override(options)

        async def outcomes():
            for client in captured["clients"]:
                preview = client["preview"]
                if preview is None:
                    yield _outcome(client, state="preview_failed", error=client["error"])
                    continue
                if preview["state"] == "action_required":
                    yield _outcome(client, state="action_required", reasons=preview["reasons"])
                    continue
                key = _intent(captured, client)
                try:
                    result = await self._platform.for_business(client["businessId"]).flows.deployments.apply_update(preview, idempotency_key=key, **options)
                    yield _outcome(client, state=result.data.status, idempotencyKey=key,
                                   receipt=result.data, requestId=result.meta.request_id)
                except Exception as error:
                    failure = _failure(error)
                    yield _outcome(client, state="failed", idempotencyKey=key, error=failure, requestId=failure["requestId"])
        return outcomes()


class PlatformBlueprintFacade(PlatformBlueprints):
    def __init__(self, platform):
        super().__init__(platform._transport)
        self.rollouts = BlueprintRollouts(platform)


class AsyncPlatformBlueprintFacade(AsyncPlatformBlueprints):
    def __init__(self, platform):
        super().__init__(platform._transport)
        self.rollouts = AsyncBlueprintRollouts(platform)
