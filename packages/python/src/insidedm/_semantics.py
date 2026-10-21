"""Cross-field invariants that JSON Schema cannot express in the shared contract.

Values have already passed the bounded schema decoder. These checks follow the
Node contract parsers and deliberately never interpret arbitrary customer maps.
"""
from __future__ import annotations

import re
from datetime import datetime
from urllib.parse import parse_qs, urlsplit


def require(condition):
    if not condition:
        raise ValueError("Inconsistent contract state.")


def distinct(values):
    require(len(set(values)) == len(values))


def _instant(value):
    require(re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z", value) is not None)
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _link(value, path, parameters):
    parsed = urlsplit(value)
    require(parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password
            and parsed.path == path and not parsed.query and not re.search(r"[\s\x00-\x1f\x7f]", value))
    query = parse_qs(parsed.fragment, keep_blank_values=True, strict_parsing=True)
    require(set(query) == {*parameters, "token"} and all(len(v) == 1 for v in query.values()))
    require(all(query[k] == [v] for k, v in parameters.items()))
    require(re.fullmatch(r"[-A-Za-z0-9_]{42}[AEIMQUYcgkosw048]", query["token"][0]) is not None)


def validate(name, value):
    if not isinstance(value, dict):
        return
    if name == "BlueprintUpdatePreview":
        require(all(value["from"][k] == value["target"][k] for k in ["applicationId", "key"]))
        distinct(value["reasons"])
        if value["state"] == "action_required":
            require(bool(value["reasons"]))
        else:
            require(not value["reasons"] and value["draftRevision"] is not None and value["changes"] is not None)
        changes = value["changes"]
        if changes is not None:
            distinct([item["key"] for item in changes["parameters"]])
            for item in changes["parameters"]:
                require(item["previous"] is not None or item["next"] is not None)
            for key in ["addedDependencySlots", "removedDependencySlots", "preservedOverrideKeys"]:
                distinct(changes[key])
            require(not set(changes["addedDependencySlots"]) & set(changes["removedDependencySlots"]))
    elif name == "FlowTemplateDeployment":
        _instant(value["createdAt"])
        if value["source"]["kind"] == "internal_template":
            require(not value["overrides"])
        publication, draft = value["publication"], value["draft"]
        require((publication["state"] == "not_published") == (publication["versionId"] is None))
        require(value["flowStatus"] not in {"active", "shadow"} or publication["versionId"] is not None)
        require(draft["state"] != "missing" or draft["revision"] is None)
        require(draft["state"] not in {"unchanged", "modified"} or draft["revision"] is not None)
    elif name == "PublicFlowRun":
        require((value["status"] in {"running", "waiting"}) == (value["completedAt"] is None))
    elif name == "ManagedPublicationRequest":
        require((value["status"] == "published") == (value["publishedVersionId"] is not None))
    elif name in {"PublicInstallationRequest", "CreatedInstallationRequest"}:
        require((value["status"] == "approved") == (value["result"] is not None))
        distinct(value["scopes"])
        if name == "CreatedInstallationRequest":
            if value["status"] == "pending":
                _link(value["authorizationUrl"], "/integrations/authorize", {"request": value["id"]})
            else:
                require(value["authorizationUrl"] is None)
    elif name in {"PublicOnboardingSession", "CreatedOnboardingSession"}:
        finish = value["finishExpiresAt"]
        if finish is not None:
            require(0 <= (_instant(finish) - _instant(value["expiresAt"])).total_seconds() <= 600)
        if value["status"] in {"created", "authorized"}:
            require(finish is None)
        if value["status"] in {"processing", "action_required", "completed"}:
            require(finish is not None)
        if name == "CreatedOnboardingSession":
            if value["status"] in {"created", "authorized"}:
                _link(value["url"], "/integrations/connect", {"session": value["id"], "business": value["businessId"]})
            else:
                require(value["url"] is None)
    elif name == "BusinessCreationLink":
        if value["status"] == "needs_owner_claim":
            _link(value["claimUrl"], "/integrations/claim", {"creation": value["id"]})
        else:
            require(value["claimUrl"] is None)
    elif name == "PublicBlueprintVersion":
        _instant(value["createdAt"])
        definition = value["definition"]
        for key in ["dependencies", "variables"]:
            distinct([item["id"] for item in definition[key]])
        require(all(item["scope"] != "business_secret" for item in definition["variables"]))
        distinct(definition["clientOverrides"])
        for items in definition["capabilities"].values():
            distinct(items)
    elif name in {"PublicInstallation", "BusinessDelegation"}:
        distinct(value["scopes"])
        require(1 <= int(value["authorityVersion"]) <= 2147483647)
    elif name == "PartnerSubscription":
        distinct(value["events"])
        require(not value["ready"] or (value["status"] not in {"disabled", "unavailable"} and value["readinessValidUntil"] is not None))
    elif name == "PartnerSubscriptionSecret":
        subscription, secret = value["subscription"], value["signingSecret"]
        require(secret is None or (secret.startswith(subscription["secretPrefix"]) and subscription["status"] not in {"disabled", "unavailable"}))
    elif name == "PartnerReceiverHealth":
        require(value["pausedReason"] is None or value["receiverStatus"] == "paused")
        if value["receiverStatus"] == "awaiting_event":
            require(value["revision"] is None and value["lastDelivery"] is None
                    and value["consecutiveFailures"] == 0 and value["health"] == "unknown")
        else:
            require(value["revision"] is not None)
    elif name in {"PartnerWebhookDelivery", "PartnerWebhookDeliveryDetail"}:
        require(not value["replayable"] or (value["kind"] == "automatic" and value["status"] in {"failed", "delivered"}
                and value["replayCount"] < 24 and not value["replayPending"]))
        require((value["kind"] == "automatic") == (value["replayOf"] is None))
        expected = "message" if value["eventType"] in {"message.created", "message.delivery_changed"} else value["eventType"].removesuffix(".changed")
        require(value["resource"] is None or value["resource"]["type"] == expected)
    elif name == "PartnerDeliveryPage":
        distinct([delivery["id"] for delivery in value["deliveries"]])
        require(value["nextCursor"] is None or bool(value["deliveries"]))
    elif name == "FlowTemplateCatalog":
        distinct([(item["id"], item["version"]) for item in value["templates"]])
        distinct([item["id"] for item in value["dependencies"]])
        for item in value["templates"]:
            distinct([slot["id"] for slot in item["dependencySlots"]])
        require(value["page"]["hasMore"] == (value["page"]["nextCursor"] is not None))
