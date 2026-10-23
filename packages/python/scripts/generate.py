"""Generate static Python types and resource methods from the reviewed contract.

No backend imports, network access or generator dependency is needed at runtime.
Run from either repository: python scripts/generate.py [--check].
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "src/insidedm/_generated"

# The only handwritten mapping: customer-facing resource grammar and fixed owner
# views. Routes, schemas, security and idempotency all come from OpenAPI.
# family, resource, method, operation, fixed query, fixed body, collection projection
BINDINGS = [
    ("business", "workspace", "get", "getWorkspace", {}, {}, None),
    ("business", "contacts", "list", "listContacts", {}, {}, "page"),
    ("business", "contacts", "get", "getContact", {}, {}, None),
    ("business", "contacts", "create", "createContact", {"view": "reference"}, {"channel": "whatsapp"}, None),
    ("business", "contacts", "update", "updateContact", {}, {}, None),
    ("business", "contacts.tags", "replace", "replaceContactTags", {}, {}, None),
    ("business", "contacts.attributes", "update", "updateContactAttributes", {}, {}, None),
    ("business", "contacts.fields", "list", "listContactFields", {}, {}, None),
    ("business", "flows.steps", "list", "listFlowSteps", {"view": "built_in_steps"}, {}, None),
    ("business", "flows.blocks", "list", "listSavedFlowBlocks", {"view": "saved_references"}, {}, "page"),
    ("business", "flows.blocks", "get", "getSavedFlowBlockInterface", {"view": "interface"}, {}, None),
    ("business", "knowledge.runs", "get", "getKnowledgeRun", {"view": "progress"}, {}, None),
    ("business", "knowledge.runs", "list", "listKnowledgeRuns", {"view": "ingestion_runs"}, {}, "page"),
    ("business", "knowledge.sources", "list", "listKnowledgeSources", {"view": "catalog"}, {}, "page"),
    ("business", "knowledge.sections", "list", "listKnowledgeSections", {"view": "sections"}, {}, "page"),
    ("business", "knowledge.sections", "set_override", "setKnowledgeSectionOverride", {"view": "edit"}, {}, None),
    ("business", "knowledge.sections", "acknowledge_override", "acknowledgeKnowledgeSectionOverride", {"view": "edit"}, {}, None),
    ("business", "knowledge.sources", "import_website", "importWebsiteKnowledge", {"view": "import"}, {}, None),
    ("business", "knowledge.sources", "remove_website", "removeWebsiteKnowledge", {"view": "remove"}, {}, None),
    ("business", "knowledge.sources", "remove", "removeKnowledgeSource", {"view": "remove"}, {}, None),
    ("business", "knowledge", "get", "getKnowledgeDocument", {}, {}, None),
    ("business", "loyalty.members", "get", "getLoyaltyMembership", {}, {}, None),
    ("business", "contacts.fields", "create", "createContactField", {"view": "creation"}, {}, None),
    ("business", "contacts.fields", "archive", "archiveContactField", {"view": "archive"}, {}, None),
    ("business", "contacts.fields", "configure_memory", "configureContactFieldMemory", {"view": "memory"}, {}, None),
    ("business", "conversations", "list", "listConversations", {}, {}, "page"),
    ("business", "conversations", "get", "getConversation", {}, {}, None),
    ("business", "conversations.messages", "list", "listConversationMessages", {}, {}, "page"),
    ("business", "conversations.controls", "get", "getConversationControl", {"view": "control"}, {}, None),
    ("business", "conversations.controls", "history", "getConversationControl", {"view": "control_history"}, {}, None),
    ("business", "conversations.controls", "take_over", "updateConversationControl", {"view": "control"}, {"action": "take_over"}, None),
    ("business", "conversations.controls", "assign", "updateConversationControl", {"view": "control"}, {"action": "assign"}, None),
    ("business", "conversations.controls", "snooze", "updateConversationControl", {"view": "control"}, {"action": "snooze"}, None),
    ("business", "conversations.controls", "clear_snooze", "updateConversationControl", {"view": "control"}, {"action": "clear_snooze"}, None),
    ("business", "conversations.assignees", "list", "listConversationAssignees", {"view": "assignees"}, {}, "page"),
    ("business", "messages", "get", "getMessage", {}, {}, None),
    ("business", "messages", "send", "sendMessage", {}, {"intent": "notification"}, None),
    ("business", "messages", "preview", "previewMessage", {}, {"intent": "notification"}, None),
    ("business", "messages", "prepare", "prepareNotification", {}, {"intent": "notification"}, None),
    ("business", "messages.preparations", "get", "getPreparedNotification", {}, {}, None),
    ("business", "messages.preparations", "apply", "applyPreparedNotification", {}, {}, None),
    ("business", "orders", "list", "listOrders", {}, {}, "page"),
    ("business", "orders", "get", "getOrder", {}, {}, None),
    ("business", "orders.shipments", "list", "listOrderShipments", {}, {}, "page"),
    ("business", "shipments", "get", "getShipment", {}, {}, None),
    ("business", "templates", "list", "listTemplates", {}, {}, "page"),
    ("business", "messaging", "get_readiness", "getMessagingReadiness", {}, {}, None),
    ("business", "messaging", "get_configuration", "getMessagingConfiguration", {"view": "configuration"}, {}, None),
    ("business", "messaging", "update_configuration", "updateMessagingConfiguration", {}, {}, None),
    ("business", "messaging.preparations", "create", "prepareMessagingConfiguration", {}, {}, None),
    ("business", "messaging.preparations", "get", "getPreparedMessagingConfiguration", {}, {}, None),
    ("business", "messaging.preparations", "apply", "applyPreparedMessagingConfiguration", {}, {}, None),
    ("business", "consents", "get", "getConsentState", {"view": "messaging"}, {}, None),
    ("business", "consents", "withdraw", "withdrawConsent", {}, {}, None),
    ("business", "consents", "record_marketing_opt_in", "recordMarketingOptIn", {}, {}, None),
    ("business", "operations", "get", "getOperation", {}, {}, None),
    ("business", "operations", "lookup", "lookupOperation", {}, {}, None),
    ("business", "operations", "cancel", "cancelOperation", {}, {}, None),
    ("business", "events", "publish", "publishEvent", {}, {}, None),
    ("business", "events.bindings", "list", "listEventBindings", {"view": "event_bindings"}, {}, "page"),
    ("business", "flows.runs", "get", "getFlowRun", {"view": "progress"}, {}, None),
    ("business", "flows.runs", "list", "listFlowRuns", {"view": "progress"}, {}, "page"),
    ("business", "flows", "_simulate", "simulateFlowDraft", {}, {"kind": "managed_draft"}, None),
    ("business", "flows.regressions", "list_suites", "listFlowRegressionSuites", {"view": "managed"}, {}, None),
    ("business", "flows.governance", "get", "getFlowGovernance", {"view": "managed"}, {}, None),
    ("business", "flows.regressions", "get_configuration", "listFlowRegressionSuites", {"view": "configuration"}, {}, None),
    ("business", "flows.regressions", "get_suite", "listFlowRegressionSuites", {"view": "configuration"}, {}, None),
    ("business", "flows.regressions", "_save_suite", "saveFlowRegressionSuite", {}, {"kind": "managed_deployment"}, None),
    ("business", "flows.regressions", "run", "runFlowRegression", {}, {"kind": "managed_deployment"}, None),
    ("business", "flows.regressions", "get", "getFlowRegressionRun", {"view": "managed"}, {}, None),
    ("business", "flows.templates", "catalog", "getFlowTemplateCatalog", {"view": "flow_templates"}, {}, None),
    ("business", "flows.templates", "import_", "importFlowTemplate", {}, {}, None),
    ("business", "flows.deployments", "get", "getFlowDeployment", {"view": "deployment"}, {}, None),
    ("business", "flows.drafts", "get", "getFlowDeployment", {"view": "draft"}, {}, None),
    ("business", "flows.drafts", "_save", "saveFlowDraft", {}, {"kind": "managed_draft"}, None),
    ("business", "flows.deployments", "list", "getFlowTemplateCatalog", {"view": "flow_deployments"}, {}, None),
    ("business", "flows.deployments", "_preview_update", "previewBlueprintUpdate", {}, {}, None),
    ("business", "flows.deployments", "_apply_update", "saveFlowDraft", {}, {"kind": "blueprint_update"}, None),
    ("business", "flows.deployments", "_request_publication", "requestFlowPublication", {}, {"kind": "managed_deployment"}, None),
    ("business", "flows.deployments", "get_publication_request", "getFlowPublicationRequest", {"view": "managed"}, {}, None),
    ("business", "flows.deployments", "withdraw_publication", "withdrawFlowPublication", {}, {"kind": "managed_deployment"}, None),
    ("business", "analytics", "get", "getBusinessAnalytics", {}, {}, None),
    ("business", "usage", "get", "getSoftwareUsage", {"view": "software_usage"}, {}, None),
    ("business", "usage", "get_limits", "getSoftwareUsage", {"view": "software_limits"}, {}, None),
    ("platform", "self", "get", "getApplicationSelf", {}, {}, None),
    ("platform", "businesses", "list", "listPlatformBusinesses", {}, {}, "page"),
    ("platform", "businesses", "get", "getPlatformBusiness", {}, {}, None),
    ("platform", "businesses", "create", "createPlatformBusiness", {}, {}, None),
    ("platform", "business_creations", "get", "getBusinessCreation", {}, {}, None),
    ("platform", "business_creations", "renew_claim_link", "renewBusinessClaimLink", {}, {}, None),
    ("platform", "installation_requests", "create", "createInstallationRequest", {}, {}, None),
    ("platform", "installation_requests", "get", "getInstallationRequest", {}, {}, None),
    ("platform", "installations", "get", "getInstallation", {}, {}, None),
    ("platform", "installations", "revoke", "revokeInstallation", {}, {}, None),
    ("platform", "onboarding", "create", "createOnboardingSession", {}, {}, None),
    ("platform", "onboarding", "get", "getOnboardingSession", {}, {}, None),
    ("platform", "usage", "get", "getPartnerApiUsage", {}, {}, None),
    ("platform", "blueprints", "list_templates", "listBlueprintTemplates", {}, {}, None),
    ("platform", "blueprints", "create_version", "createBlueprintVersion", {}, {}, None),
    ("platform", "blueprints", "list_versions", "listBlueprintVersions", {}, {}, None),
    ("platform", "blueprints", "get_version", "getBlueprintVersion", {}, {}, None),
    ("platform", "subscriptions", "list", "listPlatformSubscriptions", {}, {}, None),
    ("platform", "subscriptions", "get", "getPlatformSubscription", {}, {}, None),
    ("platform", "subscriptions", "create", "createPlatformSubscription", {}, {}, None),
    ("platform", "subscriptions", "update", "updatePlatformSubscription", {}, {}, None),
    ("platform", "subscriptions", "verify", "verifyPlatformSubscription", {}, {}, None),
    ("platform", "subscriptions", "activate", "activatePlatformSubscription", {}, {}, None),
    ("platform", "subscriptions", "pause", "pausePlatformSubscription", {}, {}, None),
    ("platform", "subscriptions", "disable", "disablePlatformSubscription", {}, {}, None),
    ("platform", "subscriptions", "rotate_secret", "rotatePlatformSubscriptionSecret", {}, {}, None),
    ("platform", "subscriptions.businesses", "get_health", "getPlatformSubscriptionHealth", {}, {}, None),
    ("platform", "subscriptions.businesses", "recover", "recoverPlatformSubscriptionReceiver", {}, {}, None),
    ("platform", "subscriptions.businesses.deliveries", "list", "listPlatformSubscriptionDeliveries", {}, {}, "deliveries"),
    ("platform", "subscriptions.businesses.deliveries", "get", "getPlatformSubscriptionDelivery", {}, {}, None),
    ("platform", "subscriptions.businesses.deliveries", "replay", "replayPlatformSubscriptionDelivery", {}, {}, None),
]


def snake(name):
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", name)).lower()
    import keyword
    return value + "_" if keyword.iskeyword(value) else value


def title(name):
    return "".join(x.capitalize() for x in name.replace(".", "_").split("_") if x)


def generate():
    source = next((p for p in [ROOT.parent / "sdk/openapi/public-v1.yaml", ROOT.parent / "node/openapi/public-v1.yaml"] if p.exists()), None)
    if source is None:
        raise SystemExit("The reviewed sibling Node OpenAPI snapshot is required for generation.")
    raw = source.read_bytes()
    spec = json.loads(raw)
    schemas = spec["components"]["schemas"]

    def ref(value):
        return spec["components"][value["$ref"].split("/")[2]][value["$ref"].split("/")[3]] if "$ref" in value else value

    operations = {}
    for path, item in spec["paths"].items():
        for method, operation in item.items():
            if not isinstance(operation, dict) or "operationId" not in operation:
                continue
            parameters = [ref(p) for p in operation.get("parameters", [])]
            status = next(k for k in operation["responses"] if k.startswith("2"))
            response = ref(operation["responses"][status])["content"]["application/json"]["schema"]
            operations[operation["operationId"]] = {
                "method": method.upper(), "path": path, "success_status": int(status),
                "path_parameters": {p["name"]: p["schema"] for p in parameters if p["in"] == "path"},
                "query_parameters": {p["name"]: p["schema"] for p in parameters if p["in"] == "query"},
                "required_query": [p["name"] for p in parameters if p["in"] == "query" and p.get("required")],
                "response": response,
                "result_property": operation.get("x-result-property"),
                "request": operation.get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema"),
                "idempotency": any(p["in"] == "header" and p["name"].lower() == "idempotency-key" for p in parameters),
                "platform": any("applicationKey" in v for v in operation.get("security", [])),
                "summary": operation.get("summary", ""),
                "body_limit": operation.get("x-request-max-bytes"),
            }
    controls = {"timeoutSeconds": {"type": "number"}, "attemptTimeoutSeconds": {"type": "number"}, "maxRetries": {"type": "integer"}}
    definitions = copy.deepcopy(schemas)
    bindings = {}

    def resolved(schema):
        return schemas[schema["$ref"].rsplit("/", 1)[1]] if "$ref" in schema else schema

    def object_fields(schema):
        schema = resolved(schema)
        properties, required = dict(schema.get("properties", {})), set(schema.get("required", []))
        for kind in ["allOf", "oneOf", "anyOf"]:
            branches = [object_fields(s) for s in schema.get(kind, [])]
            for child, _ in branches:
                properties.update(child)
            if branches:
                required |= set.union(*(r for _, r in branches)) if kind == "allOf" else set.intersection(*(r for _, r in branches))
        return properties, required

    for family, resource, method, operation_id, fixed_query, fixed_body, page in BINDINGS:
        operation = operations[operation_id]
        key = family + "." + resource + "." + method
        name = title(key) + "Arguments"
        request_schema = operation["request"]
        if operation_id == "updateConversationControl":
            request_schema = {"$ref": "#/components/schemas/" + {
                "take_over": "ConversationTakeoverCommand", "assign": "ConversationAssignmentCommand",
                "snooze": "ConversationSnoozeCommand", "clear_snooze": "ConversationClearSnoozeCommand",
            }[method]}
        if operation_id == "saveFlowDraft":
            request_schema = {"$ref": "#/components/schemas/" + ("ManagedFlowDraftSaveInput" if resource == "flows.drafts" else "ApplyBlueprintUpdateInput")}
        body_properties, body_required = object_fields(request_schema) if request_schema else ({}, set())
        body = {"properties": body_properties, "required": sorted(body_required)}
        properties = {k: v for k, v in body.get("properties", {}).items() if k not in fixed_body}
        required = [k for k in body.get("required", []) if k not in fixed_body]
        properties.update({k: v for k, v in operation["query_parameters"].items() if k not in fixed_query})
        if operation_id == "getPartnerApiUsage":
            for parameter in ["from", "to"]:
                properties[parameter] = {"anyOf": [properties[parameter], {"type": "string", "format": "date-time"}]}
        required += [k for k in operation["required_query"] if k not in fixed_query]
        if operation_id == "getConversationControl" and method != "history":
            for field in ["limit", "cursor"]:
                properties.pop(field, None)
        if operation_id == "listFlowRegressionSuites":
            needed = "releaseRequestId" if method == "list_suites" else "suiteId" if method == "get_suite" else None
            for field in ["releaseRequestId", "suiteId"]:
                if field != needed:
                    properties.pop(field, None)
            if needed:
                required.append(needed)
        if operation["idempotency"] and operation_id != "publishEvent":
            properties["idempotencyKey"] = {"type": "string"}
        if set(properties) & set(controls):
            raise SystemExit("A business field collides with a request control.")
        properties.update(controls)
        definitions[name] = {"type": "object", "properties": properties, "required": required, "additionalProperties": False}
        path_names = [k for k in operation["path_parameters"] if family == "platform" or k != "businessId"]
        response = resolved(operation["response"])
        result_property = operation["result_property"] or ("data" if "data" in response.get("properties", {}) else None)
        bare = result_property is None
        data = operation["response"] if bare else response["properties"][result_property]
        if operation_id == "getConversationControl":
            data = {"$ref": "#/components/schemas/" + ("ConversationControlHistoryPage" if method == "history" else "ConversationControlState")}
        if operation_id == "updateConversationControl":
            data = {"$ref": "#/components/schemas/" + {
                "take_over": "ConversationTakeoverReceipt", "assign": "ConversationAssignmentReceipt",
                "snooze": "ConversationSnoozeReceipt", "clear_snooze": "ConversationClearSnoozeReceipt",
            }[method]}
        if page == "nested_page":
            data = resolved(data)["properties"]["data"]
        elif page == "deliveries":
            data = resolved(data)["properties"]["deliveries"]
        if page:
            data = data["items"]
        if operation_id == "getSoftwareUsage":
            data = {"$ref": "#/components/schemas/SoftwareLimits" if method == "get_limits" else "#/components/schemas/SoftwareUsageSummary"}
        if operation_id == "listFlowRegressionSuites":
            data = {"$ref": "#/components/schemas/" + {"list_suites": "FlowRegressionSuites", "get_configuration": "FlowRegressionConfiguration", "get_suite": "FlowRegressionSuite"}[method]}
        if operation_id == "getFlowTemplateCatalog":
            data = {"$ref": "#/components/schemas/" + ("FlowDeploymentCatalog" if resource == "flows.deployments" else "FlowTemplateCatalog")}
        if operation_id == "getFlowDeployment":
            data = {"$ref": "#/components/schemas/" + ("FlowDraftSnapshot" if resource == "flows.drafts" else "FlowTemplateDeployment")}
        if operation_id == "saveFlowDraft":
            data = {"$ref": "#/components/schemas/" + ("ManagedFlowDraftSaveReceipt" if resource == "flows.drafts" else "BlueprintUpdateReceipt")}
        result_name = title(key) + "Data"
        definitions[result_name] = data
        bindings[key] = {"operation": operation_id, "query": fixed_query, "body": fixed_body, "body_fields": sorted(body_properties), "paths": path_names,
                         "arguments": name, "result": result_name, "page": page, "bare": bare, "result_property": result_property}
        if page:
            definitions[name.replace("Arguments", "IteratorArguments")] = {**definitions[name], "properties": {**properties, "maxPages": {"type": "integer"}, "maxItems": {"type": "integer"}}}

    contract = {"sha256": hashlib.sha256(raw).hexdigest(), "schemas": schemas, "operations": operations, "bindings": bindings}
    outputs = {"contract.json": json.dumps(contract, ensure_ascii=False, separators=(",", ":")) + "\n"}

    # Constraint validation is performed by the bounded codec before constructing
    # output models. Strip formatting conversions so resource IDs and wire money
    # strings remain strings, rather than implicit UUID/decimal/datetime objects.
    def clean(value, input_types=False, property_map=False):
        if isinstance(value, list):
            return [clean(v, input_types) for v in value]
        if not isinstance(value, dict):
            return value
        if property_map:
            return {k: clean(v, input_types) for k, v in value.items()}
        result = {}
        for k, v in value.items():
            if k in {"format", "pattern", "minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems", "uniqueItems", "minProperties", "maxProperties", "propertyNames"}:
                continue
            result[k] = v.replace("#/components/schemas/", "#/$defs/") if k == "$ref" else clean(v, input_types, k in {"properties", "$defs"})
        if input_types and value.get("format") == "date-time":
            result = {"anyOf": [{"type": "string"}, {"type": "string", "format": "date-time"}] + ([{"type": "null"}] if isinstance(value.get("type"), list) and "null" in value["type"] else [])}
        return result

    with tempfile.TemporaryDirectory() as temp:
        schema = Path(temp) / "schema.json"
        for filename, model_type in [("models.py", "pydantic_v2.BaseModel"), ("inputs.py", "typing.TypedDict")]:
            schema.write_text(json.dumps({"$defs": clean(definitions, filename == "inputs.py", True)}))
            target = Path(temp) / filename
            args = [sys.executable, "-m", "datamodel_code_generator", "--input", str(schema), "--input-file-type", "jsonschema", "--output", str(target), "--output-model-type", model_type,
                    "--target-python-version", "3.11", "--snake-case-field", "--enum-field-as-literal", "all", "--disable-timestamp", "--use-standard-collections", "--use-union-operator", "--no-collapse-root-models"]
            if model_type.startswith("pydantic"):
                args += ["--base-class", "insidedm._models.ResponseModel", "--use-type-alias"]
            subprocess.run(args, check=True, capture_output=True, text=True)
            outputs[filename] = target.read_text()
    import ast
    for filename in ["inputs.py", "models.py"]:
        tree = ast.parse(outputs[filename])
        names = []
        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                names.append(node.name)
            elif isinstance(node, ast.Assign):
                names.extend(target.id for target in node.targets if isinstance(target, ast.Name) and not target.id.startswith("_"))
            elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and not node.target.id.startswith("_"):
                names.append(node.target.id)
        outputs[filename] += "\n__all__ = " + repr(sorted(names)) + "\n"

    for asynchronous in [False, True]:
        prefix = "Async" if asynchronous else ""
        lines = ["# Generated from the reviewed public contract. Do not edit.", "from __future__ import annotations", "from typing import Unpack, Iterator, AsyncIterator", "from . import models, inputs", "from .._models import Result, PageResult", "from .._resources import SyncResource, AsyncResource", ""]
        for family in ["business", "platform"]:
            resources = set()
            for f, resource, *_ in BINDINGS:
                if f == family:
                    parts = resource.split(".")
                    resources.update(".".join(parts[:n]) for n in range(1, len(parts) + 1))
            for resource in sorted(resources, key=lambda x: (-x.count("."), x)):
                class_name = prefix + title(family + "." + resource)
                lines += [f"class {class_name}({'AsyncResource' if asynchronous else 'SyncResource'}):", "    def __init__(self, transport):", "        super().__init__(transport)"]
                children = sorted(p for p in resources if p.rsplit(".", 1)[0] == resource and p != resource and "." in p)
                for child in children:
                    lines += [f"        self.{child.rsplit('.', 1)[1]} = {prefix + title(family + '.' + child)}(transport)"]
                for key, binding in bindings.items():
                    if not key.startswith(family + ".") or key.rsplit(".", 1)[0] != family + "." + resource:
                        continue
                    method = key.rsplit(".", 1)[1]
                    path_names = binding["paths"]
                    positional = "".join(f", {snake(p)}: {'int' if binding['operation'] == 'getBlueprintVersion' and p == 'version' else 'str'}" for p in path_names)
                    path_dict = "{" + ", ".join(repr(p) + ": " + snake(p) for p in path_names) + "}"
                    result = ("PageResult" if binding["page"] else "Result") + "[models." + binding["result"] + "]"
                    op = operations[binding["operation"]]
                    lines += ["", f"    {'async ' if asynchronous else ''}def {method}(self{positional}, **kwargs: Unpack[inputs.{binding['arguments']}]) -> {result}:", f"        {op['summary']!r}", f"        return {'await ' if asynchronous else ''}self._invoke({key!r}, {path_dict}, kwargs)"]
                    if binding["page"]:
                        arg_name = binding["arguments"].replace("Arguments", "IteratorArguments")
                        iterator = "AsyncIterator" if asynchronous else "Iterator"
                        for method_name, item_result in [("iter_pages", result), ("iter_items", "models." + binding["result"])]:
                            lines += ["", f"    def {method_name}(self{positional}, **kwargs: Unpack[inputs.{arg_name}]) -> {iterator}[{item_result}]:", f"        return self._{method_name}({key!r}, {path_dict}, kwargs)"]
            lines += ["", f"class {prefix + title(family)}Resources:", "    def _init_resources(self, transport):"]
            for resource in sorted(p for p in resources if "." not in p):
                lines += [f"        self.{resource} = {prefix + title(family + '.' + resource)}(transport)"]
            lines += [""]
        outputs[("async_" if asynchronous else "") + "resources.py"] = "\n".join(lines)
    outputs["parity.json"] = json.dumps({"contract_sha256": contract["sha256"], "http_operations": len(operations), "bound_operations": sorted(set(v["operation"] for v in bindings.values())), "internal_operations": ["createBusinessDelegation"], "facades": ["delegation", "blueprint_deploy", "blueprint_rollouts", "webhooks", "offline_client"]}, indent=2) + "\n"
    if set(operations) != {v["operation"] for v in bindings.values()} | {"createBusinessDelegation"}:
        raise SystemExit("The reviewed public contract has an unbound operation.")
    reference = ["# Python API reference", "", "Generated from the reviewed shared OpenAPI contract. Both clients expose the same", "resources; await I/O methods on `AsyncInsideDM` and `AsyncInsideDMPlatform`.", "", "Arguments use snake_case typed dictionaries. Click a request type for its fields.", "Every HTTP method returns `Result[T]` or `PageResult[T]`, with `.data` and `.meta`.", "Collection iterators fetch lazily and accept `max_pages` and `max_items`.", "", "[Usage, lifecycle and errors](../README.md) · [Webhooks](webhooks.md)", ""]
    for family, client in [("business", "InsideDM"), ("platform", "InsideDMPlatform")]:
        reference += ["## " + client, "", "| Method | Request arguments | Result data |", "| --- | --- | --- |"]
        for key, binding in bindings.items():
            method = key.split(".")[-1]
            if not key.startswith(family + ".") or method.startswith("_"):
                continue
            display = key[len(family) + 1:]
            paths = ", ".join(snake(p) for p in binding["paths"])
            signature = display + "(" + (paths + ", " if paths else "") + "**kwargs)"
            reference += [f"| `{signature}` | [`{binding['arguments']}`](../src/insidedm/_generated/inputs.py) | [`{binding['result']}`](../src/insidedm/_generated/models.py) |"]
        reference += [""]
    reference += [
        "## Saved-source helpers", "", "These helpers capture saved typed models, then call the same existing flow APIs:", "",
        "| Method | Behavior |", "| --- | --- |",
        "| `client.flows.drafts.save(draft, definition, **kwargs)` | Save a complete native definition using both pins from an available saved draft. No hidden refresh or merge. |",
        "| `client.flows.drafts.save(recipe_id, definition, expected_deployment_revision=revision, expected_draft_revision=revision, **kwargs)` | Save with explicitly observed pins. Matching retries recover the original receipt; read again for current state. |",
        "| `client.flows.blueprints.deploy(blueprint, **kwargs)` | Import saved version into a business-owned draft. |",
        "| `client.flows.deployments.preview_update(recipe_id, blueprint, **kwargs)` | Read drift and proposed changes from a saved version or exact application/key/version/digest reference. |",
        "| `client.flows.deployments.apply_update(preview, **kwargs)` | Apply the saved revision-pinned preview to its own business draft. |",
        "| `client.flows.deployments.request_publication(deployment, **kwargs)` | Request native human review of the exact observed draft, including customizations. |",
        "| `client.flows.simulate(deployment, **kwargs)` | Evaluate the saved draft with native readiness rules and record successful path coverage without provider actions. |",
        "| `client.flows.simulate(recipe_id, expected_revision=revision, **kwargs)` | Evaluate an explicitly observed draft revision with optional variables and path selection. |",
        "| `client.flows.regressions.save_suite(suite, **changes)` | Edit a saved suite with its own business, flow and revision; preserve fields not changed. |",
        "| `client.flows.regressions.save_suite(recipe_id, **kwargs)` | Create with null suite ID/revision or replace an explicitly observed revision. |",
        "| `platform.for_business(business_id, scopes=None)` | Select a merchant-approved business client; exchange credentials lazily. |",
        "| `platform.blueprints.rollouts.preview(blueprint, clients, **kwargs)` | Read up to 25 explicit business/flow pairs into a saved plan. |",
        "| `platform.blueprints.rollouts.apply(plan, **kwargs)` | Lazily yield serial draft outcomes with stable restart keys. |", "",
        "Draft creation and update never publish a flow. Persist source and plans with",
        "`model_dump_json(by_alias=True, exclude_unset=True)`. Apply validates saved identity",
        "and revision pins before writing; obtain a new preview after a revision conflict.", "",
        "An unavailable native draft can be explicitly repaired with known valid replacement content and its positive pins. The saved-draft helper requires an available model. Unsupported builder formats are never converted implicitly.", "",
        "See `insidedm.types.inputs`, `insidedm.types.responses` and rollout types in",
        "`insidedm.types`. Platform access requires approved application permissions and",
        "merchant authorization. Partner onboarding and deployment guides are distributed",
        "separately to approved partners.", "",
    ]
    outputs = {"src/insidedm/_generated/" + name: content for name, content in outputs.items()}
    outputs["docs/api-reference.md"] = "\n".join(reference)
    return outputs


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    arguments = parser.parse_args()
    outputs = generate()
    changed = []
    GENERATED.mkdir(parents=True, exist_ok=True)
    for name, content in outputs.items():
        path = ROOT / name
        if not path.exists() or path.read_text() != content:
            changed.append(name)
            if not arguments.check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content)
    if arguments.check and changed:
        raise SystemExit("Generated files need refreshing: " + ", ".join(changed))
    print(f"Reviewed contract: {len(BINDINGS)} resource bindings; {len(outputs)} generated files.")
