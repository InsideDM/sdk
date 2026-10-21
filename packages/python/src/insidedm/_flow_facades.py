"""Typed saved-source and revision-pinned helpers over existing flow owners."""
from __future__ import annotations

import json
from typing import NotRequired, TypedDict, Unpack

from pydantic import BaseModel, TypeAdapter

from ._codec import SCHEMAS, SchemaMismatch, decode
from ._errors import InsideDMConfigurationError
from ._generated import inputs, models
from ._generated.resources import BusinessFlows, BusinessFlowsDeployments
from ._generated.async_resources import AsyncBusinessFlows, AsyncBusinessFlowsDeployments
from ._models import Result
from ._policy import CONTROLS


class ReadOptions(TypedDict, total=False):
    timeout_seconds: float
    attempt_timeout_seconds: float
    max_retries: int


class WriteOptions(ReadOptions, total=False):
    idempotency_key: str


class DeployOptions(WriteOptions, total=False):
    bindings: inputs.FlowTemplateBindings
    overrides: inputs.BlueprintParameters


class PreviewOptions(ReadOptions, total=False):
    bindings: inputs.FlowTemplateBindings


class PublicationOptions(WriteOptions, total=False):
    note: str


def _snapshot(value, *, limit=4 * 1024 * 1024):
    if isinstance(value, BaseModel):
        value = value.model_dump(mode="json", by_alias=True, exclude_unset=True)
    try:
        body = json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode()
        if len(body) > limit:
            raise ValueError()
        return json.loads(body)
    except (ValueError, TypeError, UnicodeError, RecursionError):
        raise InsideDMConfigurationError("Use a bounded saved source, preview or rollout plan.") from None


def capture(name, value):
    try:
        return decode({"$ref": "#/components/schemas/" + name}, _snapshot(value))
    except SchemaMismatch:
        raise InsideDMConfigurationError("Use the saved typed source or current server preview.") from None


def _as_input(value):
    if isinstance(value, BaseModel):
        return value.model_dump(exclude_unset=True)
    if isinstance(value, dict):
        return {k: _as_input(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_as_input(v) for v in value]
    return value


def _native(name, wire):
    return _as_input(TypeAdapter(getattr(models, name)).validate_python(wire))


def _options(values, extra=(), *, write=False):
    allowed = CONTROLS | set(extra) | ({"idempotency_key"} if write else set())
    if set(values) - allowed:
        raise InsideDMConfigurationError("Use only the documented options for this operation.")
    return dict(values)


def blueprint_target(blueprint):
    source = capture("PublicBlueprintVersion", blueprint)
    return source, {"applicationId": source["applicationId"], "key": source["definition"]["key"],
                    "version": source["definition"]["version"], "digest": source["digest"]}


def _deploy(blueprint, kwargs):
    source, _ = blueprint_target(blueprint)
    options = _options(kwargs, ["bindings", "overrides"], write=True)
    return source["definition"]["key"], {
        "version": str(source["definition"]["version"]),
        "blueprint": {"application_id": source["applicationId"], "digest": source["digest"]}, **options,
    }


def _preview(blueprint, kwargs):
    _, target = blueprint_target(blueprint)
    return {"target": _native("BlueprintUpdateTarget", target), **_options(kwargs, ["bindings"])}


def _apply(preview, kwargs):
    captured = capture("BlueprintUpdatePreview", preview)
    if captured["state"] == "action_required" or captured["draftRevision"] is None:
        raise InsideDMConfigurationError("Resolve action-required items and obtain a current preview before applying it.")
    return captured, {
        "target": _native("BlueprintUpdateTarget", captured["target"]),
        "bindings": _native("FlowTemplateBindings", captured["bindings"]),
        "expected_deployment_revision": captured["deploymentRevision"],
        "expected_draft_revision": captured["draftRevision"], **_options(kwargs, write=True),
    }


def _publication(deployment, kwargs):
    captured = capture("FlowTemplateDeployment", deployment)
    if captured["draft"]["state"] != "unchanged" or captured["draft"]["revision"] is None:
        raise InsideDMConfigurationError("Read a current unchanged deployment before requesting publication.")
    return captured, {
        "expected_deployment_revision": captured["revision"],
        "expected_draft_revision": captured["draft"]["revision"],
        "expected_published_version_id": captured["publication"]["versionId"],
        **_options(kwargs, ["note"], write=True),
    }


class FlowBlueprints:
    def __init__(self, transport):
        self._transport = transport

    def deploy(self, blueprint: models.PublicBlueprintVersion, **kwargs: Unpack[DeployOptions]) -> Result[models.FlowTemplateImportReceipt]:
        """Create a client-owned draft from saved source; never publish it."""
        pack_id, values = _deploy(blueprint, kwargs)
        return self._transport.invoke("business.flows.templates.import_", {"packId": pack_id}, values)


class AsyncFlowBlueprints:
    def __init__(self, transport):
        self._transport = transport

    async def deploy(self, blueprint: models.PublicBlueprintVersion, **kwargs: Unpack[DeployOptions]) -> Result[models.FlowTemplateImportReceipt]:
        """Create a client-owned draft from saved source; never publish it."""
        pack_id, values = _deploy(blueprint, kwargs)
        return await self._transport.invoke("business.flows.templates.import_", {"packId": pack_id}, values)


class Deployments(BusinessFlowsDeployments):
    def preview_update(self, recipe_id: str, blueprint: models.PublicBlueprintVersion,
                       **kwargs: Unpack[PreviewOptions]) -> Result[models.BlueprintUpdatePreview]:
        """Inspect drift and source changes without changing the draft."""
        return self._preview_update(recipe_id, **_preview(blueprint, kwargs))

    def apply_update(self, preview: models.BlueprintUpdatePreview,
                     **kwargs: Unpack[WriteOptions]) -> Result[models.BlueprintUpdateReceipt]:
        """Apply the captured revision-pinned preview to its own business draft."""
        captured, values = _apply(preview, kwargs)
        return self._transport.invoke("business.flows.deployments._apply_update", {"recipeId": captured["recipeId"]}, values,
                                      expected_business_id=captured["businessId"])

    def request_publication(self, deployment: models.FlowTemplateDeployment,
                            **kwargs: Unpack[PublicationOptions]) -> Result[models.ManagedPublicationRequest]:
        """Submit an unchanged managed draft for native human review."""
        captured, values = _publication(deployment, kwargs)
        return self._transport.invoke("business.flows.deployments._request_publication", {"recipeId": captured["recipeId"]}, values,
                                      expected_business_id=captured["businessId"])


class AsyncDeployments(AsyncBusinessFlowsDeployments):
    async def preview_update(self, recipe_id: str, blueprint: models.PublicBlueprintVersion,
                             **kwargs: Unpack[PreviewOptions]) -> Result[models.BlueprintUpdatePreview]:
        """Inspect drift and source changes without changing the draft."""
        return await self._preview_update(recipe_id, **_preview(blueprint, kwargs))

    async def apply_update(self, preview: models.BlueprintUpdatePreview,
                           **kwargs: Unpack[WriteOptions]) -> Result[models.BlueprintUpdateReceipt]:
        """Apply the captured revision-pinned preview to its own business draft."""
        captured, values = _apply(preview, kwargs)
        return await self._transport.invoke("business.flows.deployments._apply_update", {"recipeId": captured["recipeId"]}, values,
                                            expected_business_id=captured["businessId"])

    async def request_publication(self, deployment: models.FlowTemplateDeployment,
                                  **kwargs: Unpack[PublicationOptions]) -> Result[models.ManagedPublicationRequest]:
        """Submit an unchanged managed draft for native human review."""
        captured, values = _publication(deployment, kwargs)
        return await self._transport.invoke("business.flows.deployments._request_publication", {"recipeId": captured["recipeId"]}, values,
                                            expected_business_id=captured["businessId"])


class Flows(BusinessFlows):
    deployments: Deployments
    blueprints: FlowBlueprints

    def __init__(self, transport):
        super().__init__(transport)
        self.deployments = Deployments(transport)
        self.blueprints = FlowBlueprints(transport)


class AsyncFlows(AsyncBusinessFlows):
    deployments: AsyncDeployments
    blueprints: AsyncFlowBlueprints

    def __init__(self, transport):
        super().__init__(transport)
        self.deployments = AsyncDeployments(transport)
        self.blueprints = AsyncFlowBlueprints(transport)
