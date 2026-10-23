"""Typed saved-source and revision-pinned helpers over existing flow owners."""
from __future__ import annotations

import json
from typing import Literal, NotRequired, TypedDict, Unpack, overload

from pydantic import BaseModel, TypeAdapter

from ._codec import SCHEMAS, SchemaMismatch, decode, input_value
from ._errors import InsideDMConfigurationError
from ._generated import inputs, models
from ._generated.resources import BusinessFlows, BusinessFlowsDeployments, BusinessFlowsRegressions, BusinessFlowsDrafts
from ._generated.async_resources import AsyncBusinessFlows, AsyncBusinessFlowsDeployments, AsyncBusinessFlowsRegressions, AsyncBusinessFlowsDrafts
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


class RegressionSuiteEdits(WriteOptions, total=False):
    name: str
    required: bool
    status: Literal['active', 'archived']
    cases: list[inputs.FlowRegressionCase]


class SimulationOptions(ReadOptions, total=False):
    variables: dict[str, str]
    path_id: str


class PinnedSimulationOptions(SimulationOptions):
    expected_revision: int


class PinnedDraftSaveOptions(WriteOptions):
    expected_deployment_revision: int
    expected_draft_revision: int


class PinnedPublicationOptions(PublicationOptions):
    expected_deployment_revision: int
    expected_draft_revision: int
    expected_published_version_id: str | None


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
    value = _snapshot(blueprint)
    if not isinstance(value, dict):
        raise InsideDMConfigurationError("Use a saved blueprint or an exact application/key/version/digest reference.")
    if "definition" in value:
        _, target = blueprint_target(blueprint)
    else:
        target = capture("BlueprintUpdateTarget", blueprint) if isinstance(blueprint, BaseModel) else input_value({"$ref": "#/components/schemas/BlueprintUpdateTarget"}, value)
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
    if isinstance(deployment, str):
        pins = ["expected_deployment_revision", "expected_draft_revision", "expected_published_version_id"]
        values = _options(kwargs, [*pins, "note"], write=True)
        if any(pin not in values for pin in pins):
            raise InsideDMConfigurationError("Supply the exact deployment, draft and published-version revision pins.")
        return {"recipeId": deployment}, values
    captured = capture("FlowTemplateDeployment", deployment)
    if captured["draft"]["state"] not in {"unchanged", "modified"} or captured["draft"]["revision"] is None:
        raise InsideDMConfigurationError("Read a current deployment with an available draft before requesting publication.")
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
    def preview_update(self, recipe_id: str, blueprint: models.PublicBlueprintVersion | models.BlueprintUpdateTarget | inputs.BlueprintUpdateTarget,
                       **kwargs: Unpack[PreviewOptions]) -> Result[models.BlueprintUpdatePreview]:
        """Inspect drift and source changes without changing the draft."""
        return self._preview_update(recipe_id, **_preview(blueprint, kwargs))

    def apply_update(self, preview: models.BlueprintUpdatePreview,
                     **kwargs: Unpack[WriteOptions]) -> Result[models.BlueprintUpdateReceipt]:
        """Apply the captured revision-pinned preview to its own business draft."""
        captured, values = _apply(preview, kwargs)
        return self._transport.invoke("business.flows.deployments._apply_update", {"recipeId": captured["recipeId"]}, values,
                                      expected_business_id=captured["businessId"])

    @overload
    def request_publication(self, deployment: models.FlowTemplateDeployment,
                            **kwargs: Unpack[PublicationOptions]) -> Result[models.ManagedPublicationRequest]: ...

    @overload
    def request_publication(self, deployment: str,
                            **kwargs: Unpack[PinnedPublicationOptions]) -> Result[models.ManagedPublicationRequest]: ...

    def request_publication(self, deployment: models.FlowTemplateDeployment | str, **kwargs) -> Result[models.ManagedPublicationRequest]:
        """Request review using a saved deployment or a recipe ID and exact revision pins. Never publishes."""
        captured, values = _publication(deployment, kwargs)
        return self._transport.invoke("business.flows.deployments._request_publication", {"recipeId": captured["recipeId"]}, values,
                                      expected_business_id=captured.get("businessId"))


class AsyncDeployments(AsyncBusinessFlowsDeployments):
    async def preview_update(self, recipe_id: str, blueprint: models.PublicBlueprintVersion | models.BlueprintUpdateTarget | inputs.BlueprintUpdateTarget,
                             **kwargs: Unpack[PreviewOptions]) -> Result[models.BlueprintUpdatePreview]:
        """Inspect drift and source changes without changing the draft."""
        return await self._preview_update(recipe_id, **_preview(blueprint, kwargs))

    async def apply_update(self, preview: models.BlueprintUpdatePreview,
                           **kwargs: Unpack[WriteOptions]) -> Result[models.BlueprintUpdateReceipt]:
        """Apply the captured revision-pinned preview to its own business draft."""
        captured, values = _apply(preview, kwargs)
        return await self._transport.invoke("business.flows.deployments._apply_update", {"recipeId": captured["recipeId"]}, values,
                                            expected_business_id=captured["businessId"])

    @overload
    async def request_publication(self, deployment: models.FlowTemplateDeployment,
                                  **kwargs: Unpack[PublicationOptions]) -> Result[models.ManagedPublicationRequest]: ...

    @overload
    async def request_publication(self, deployment: str,
                                  **kwargs: Unpack[PinnedPublicationOptions]) -> Result[models.ManagedPublicationRequest]: ...

    async def request_publication(self, deployment: models.FlowTemplateDeployment | str, **kwargs) -> Result[models.ManagedPublicationRequest]:
        """Request review using a saved deployment or a recipe ID and exact revision pins. Never publishes."""
        captured, values = _publication(deployment, kwargs)
        return await self._transport.invoke("business.flows.deployments._request_publication", {"recipeId": captured["recipeId"]}, values,
                                            expected_business_id=captured.get("businessId"))


def _suite_edit(source, kwargs, recipe_id=None):
    if recipe_id is not None:
        if source is not None:
            raise InsideDMConfigurationError("Use a saved suite or a recipe ID, without overriding the saved target.")
        source = recipe_id
    if source is None:
        raise InsideDMConfigurationError("Provide a saved suite or a recipe ID and complete suite intent.")
    if isinstance(source, str):
        return {"recipeId": source}, kwargs
    suite = capture("FlowRegressionSuite", source)
    options = _options(kwargs, ["name", "required", "status", "cases"], write=True)
    return suite, {
        "suite_id": suite["id"], "expected_revision": suite["revision"], "name": suite["name"],
        "required": suite["required"], "status": suite["status"], "cases": [_native("FlowRegressionCase", case) for case in suite["cases"]], **options,
    }


class Regressions(BusinessFlowsRegressions):
    @overload
    def save_suite(self, suite: models.FlowRegressionSuite,
                   **kwargs: Unpack[RegressionSuiteEdits]) -> Result[models.FlowRegressionSuite]: ...

    @overload
    def save_suite(self, suite: str,
                   **kwargs: Unpack[inputs.BusinessFlowsRegressionsSaveSuiteArguments]) -> Result[models.FlowRegressionSuite]: ...

    @overload
    def save_suite(self, *, recipe_id: str,
                   **kwargs: Unpack[inputs.BusinessFlowsRegressionsSaveSuiteArguments]) -> Result[models.FlowRegressionSuite]: ...

    def save_suite(self, suite: models.FlowRegressionSuite | str | None = None, *, recipe_id: str | None = None, **kwargs) -> Result[models.FlowRegressionSuite]:
        """Edit the saved suite's own business/revision, or submit a complete explicit intent."""
        captured, values = _suite_edit(suite, kwargs, recipe_id)
        return self._transport.invoke("business.flows.regressions._save_suite", {"recipeId": captured["recipeId"]}, values,
                                      expected_business_id=captured.get("businessId"))


class AsyncRegressions(AsyncBusinessFlowsRegressions):
    @overload
    async def save_suite(self, suite: models.FlowRegressionSuite,
                         **kwargs: Unpack[RegressionSuiteEdits]) -> Result[models.FlowRegressionSuite]: ...

    @overload
    async def save_suite(self, suite: str,
                         **kwargs: Unpack[inputs.BusinessFlowsRegressionsSaveSuiteArguments]) -> Result[models.FlowRegressionSuite]: ...

    @overload
    async def save_suite(self, *, recipe_id: str,
                         **kwargs: Unpack[inputs.BusinessFlowsRegressionsSaveSuiteArguments]) -> Result[models.FlowRegressionSuite]: ...

    async def save_suite(self, suite: models.FlowRegressionSuite | str | None = None, *, recipe_id: str | None = None, **kwargs) -> Result[models.FlowRegressionSuite]:
        """Edit the saved suite's own business/revision, or submit a complete explicit intent."""
        captured, values = _suite_edit(suite, kwargs, recipe_id)
        return await self._transport.invoke("business.flows.regressions._save_suite", {"recipeId": captured["recipeId"]}, values,
                                            expected_business_id=captured.get("businessId"))


def _simulation(deployment, kwargs):
    if isinstance(deployment, str):
        return {"recipeId": deployment}, _options(kwargs, ["expected_revision", "variables", "path_id"])
    captured = capture("FlowTemplateDeployment", deployment)
    if captured["draft"]["state"] not in {"unchanged", "modified"} or captured["draft"]["revision"] is None:
        raise InsideDMConfigurationError("Read a current deployment with an available draft before simulating it.")
    return captured, {"expected_revision": captured["draft"]["revision"], **_options(kwargs, ["variables", "path_id"])}


def _draft_save(source, definition, kwargs):
    wire = capture("FlowDefinitionV1", definition)
    if isinstance(source, str):
        options = _options(kwargs, ["expected_deployment_revision", "expected_draft_revision"], write=True)
        captured = {"recipeId": source, "businessId": wire["businessId"]}
    else:
        captured = capture("FlowDraftSnapshot", source)
        if captured["state"] != "available":
            raise InsideDMConfigurationError("Read an available native draft before editing it.")
        options = {**_options(kwargs, write=True), "expected_deployment_revision": captured["deploymentRevision"], "expected_draft_revision": captured["revision"]}
    if wire["id"] != captured["recipeId"] or wire["businessId"] != captured["businessId"]:
        raise InsideDMConfigurationError("Use the draft and definition from the same business and flow.")
    return captured, {**options, "definition": _native("FlowDefinitionV1", wire)}


class Drafts(BusinessFlowsDrafts):
    @overload
    def save(self, draft: models.AvailableFlowDraft, definition: models.FlowDefinitionV1 | inputs.FlowDefinitionV1, **kwargs: Unpack[WriteOptions]) -> Result[models.ManagedFlowDraftSaveReceipt]: ...

    @overload
    def save(self, draft: str, definition: models.FlowDefinitionV1 | inputs.FlowDefinitionV1, **kwargs: Unpack[PinnedDraftSaveOptions]) -> Result[models.ManagedFlowDraftSaveReceipt]: ...

    def save(self, draft, definition, **kwargs) -> Result[models.ManagedFlowDraftSaveReceipt]:
        """Save a native draft with exact observed pins. Retains layout; never publishes."""
        captured, values = _draft_save(draft, definition, kwargs)
        return self._transport.invoke("business.flows.drafts._save", {"recipeId": captured["recipeId"]}, values, expected_business_id=captured["businessId"])


class AsyncDrafts(AsyncBusinessFlowsDrafts):
    @overload
    async def save(self, draft: models.AvailableFlowDraft, definition: models.FlowDefinitionV1 | inputs.FlowDefinitionV1, **kwargs: Unpack[WriteOptions]) -> Result[models.ManagedFlowDraftSaveReceipt]: ...

    @overload
    async def save(self, draft: str, definition: models.FlowDefinitionV1 | inputs.FlowDefinitionV1, **kwargs: Unpack[PinnedDraftSaveOptions]) -> Result[models.ManagedFlowDraftSaveReceipt]: ...

    async def save(self, draft, definition, **kwargs) -> Result[models.ManagedFlowDraftSaveReceipt]:
        """Save a native draft with exact observed pins. Retains layout; never publishes."""
        captured, values = _draft_save(draft, definition, kwargs)
        return await self._transport.invoke("business.flows.drafts._save", {"recipeId": captured["recipeId"]}, values, expected_business_id=captured["businessId"])


class Flows(BusinessFlows):
    drafts: Drafts
    deployments: Deployments
    blueprints: FlowBlueprints
    regressions: Regressions

    def __init__(self, transport):
        super().__init__(transport)
        self.deployments = Deployments(transport)
        self.blueprints = FlowBlueprints(transport)
        self.regressions = Regressions(transport)
        self.drafts = Drafts(transport)

    @overload
    def simulate(self, deployment: models.FlowTemplateDeployment, **kwargs: Unpack[SimulationOptions]) -> Result[models.FlowDraftSimulation]: ...

    @overload
    def simulate(self, deployment: str, **kwargs: Unpack[PinnedSimulationOptions]) -> Result[models.FlowDraftSimulation]: ...

    def simulate(self, deployment: models.FlowTemplateDeployment | str, **kwargs) -> Result[models.FlowDraftSimulation]:
        """Use the native simulator with retained draft pins. Never executes providers or publishes."""
        captured, values = _simulation(deployment, kwargs)
        return self._transport.invoke("business.flows._simulate", {"recipeId": captured["recipeId"]}, values,
                                      expected_business_id=captured.get("businessId"))


class AsyncFlows(AsyncBusinessFlows):
    drafts: AsyncDrafts
    deployments: AsyncDeployments
    blueprints: AsyncFlowBlueprints
    regressions: AsyncRegressions

    def __init__(self, transport):
        super().__init__(transport)
        self.deployments = AsyncDeployments(transport)
        self.blueprints = AsyncFlowBlueprints(transport)
        self.regressions = AsyncRegressions(transport)
        self.drafts = AsyncDrafts(transport)

    @overload
    async def simulate(self, deployment: models.FlowTemplateDeployment, **kwargs: Unpack[SimulationOptions]) -> Result[models.FlowDraftSimulation]: ...

    @overload
    async def simulate(self, deployment: str, **kwargs: Unpack[PinnedSimulationOptions]) -> Result[models.FlowDraftSimulation]: ...

    async def simulate(self, deployment: models.FlowTemplateDeployment | str, **kwargs) -> Result[models.FlowDraftSimulation]:
        """Use the native simulator with retained draft pins. Never executes providers or publishes."""
        captured, values = _simulation(deployment, kwargs)
        return await self._transport.invoke("business.flows._simulate", {"recipeId": captured["recipeId"]}, values,
                                            expected_business_id=captured.get("businessId"))
