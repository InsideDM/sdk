"""Cross-field invariants that JSON Schema cannot express in the shared contract.

Values have already passed the bounded schema decoder. These checks follow the
Node contract parsers and deliberately never interpret arbitrary customer maps.
"""
from __future__ import annotations

import re
from datetime import datetime
from urllib.parse import parse_qs, urlsplit

import httpx2

from ._usage import capture_partner_usage


class DomainMismatch(ValueError):
    def __init__(self, field: str, hint: str):
        self.field, self.hint = field, hint
        super().__init__("Invalid domain value.")


def _https(value, field="url"):
    try:
        parsed = httpx2.URL(value)
        valid = (parsed.scheme == "https" and bool(parsed.host) and not parsed.userinfo
                 and not parsed.fragment and str(parsed) == value and bool(urlsplit(value).path))
    except (httpx2.InvalidURL, ValueError):
        valid = False
    if not valid:
        raise DomainMismatch(field, "Use a canonical HTTPS URL with a path and without credentials or a fragment.")


def _website_import_url(value):
    try:
        parsed = httpx2.URL(value)
        valid = parsed.scheme in {"http", "https"} and bool(parsed.host) and not parsed.userinfo \
            and parsed.port in (None, 80 if parsed.scheme == "http" else 443)
        normalized = str(parsed.copy_with(fragment=None))
    except (httpx2.InvalidURL, ValueError):
        valid, normalized = False, ""
    if not valid:
        raise DomainMismatch("url", "Use a public HTTP(S) website without credentials or a nondefault port.")
    return normalized


def _revision(value, field="expectedRevision"):
    if not 1 <= int(value) <= 2147483647:
        raise DomainMismatch(field, "Use a positive revision no greater than 2147483647.")


def _subscription(value):
    if "name" in value and (value["name"] != value["name"].strip() or re.search(r"[\x00-\x1f\x7f]", value["name"])):
        raise DomainMismatch("name", "Use a nonblank name without surrounding whitespace or control characters.")
    if "url" in value:
        _https(value["url"])
    if "events" in value and len(value["events"]) != len(set(value["events"])):
        raise DomainMismatch("events", "Select distinct subscription events.")
    if "expectedRevision" in value:
        _revision(value["expectedRevision"])


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
    if name in {"CreatePartnerSubscription", "UpdatePartnerSubscription", "PartnerSubscriptionDecision", "RotatePartnerSubscriptionSecret"}:
        _subscription(value)
    elif name in {"CreatePlatformBusinessInput", "CreateInstallationRequestInput", "CreateOnboardingSessionInput"}:
        _https(value["returnUrl"], "returnUrl")
    elif name == "RevokeInstallationInput":
        _revision(value["expectedRevision"])
    elif name in {"ImportWebsiteKnowledgeInput", "RemoveWebsiteKnowledgeInput"}:
        return {**value, "url": _website_import_url(value["url"])}
    elif name == "WebsiteKnowledgeImportReceipt":
        require(_website_import_url(value["url"]) == value["url"])
    elif name == "SetKnowledgeSectionOverrideInput":
        text = value["overrideMd"]
        if text is not None:
            require("\x00" not in text and len(text.encode("utf-8")) <= 65_536)
    elif name == "KnowledgeSectionContent":
        parent = value["stableKey"].split("/")[0] if "/" in value["stableKey"] else None
        require(value["parentKey"] == parent)
        require(value["manualOverrideMd"] is not None or not (value["overrideStale"] or value["overrideOrphaned"]))
    elif name == "KnowledgeSectionContentPage":
        rows = value["data"]
        require(value["page"]["hasMore"] == (value["page"]["nextCursor"] is not None))
        require(not value["page"]["hasMore"] or len(rows) > 0)
        require(len({row["id"] for row in rows}) == len(rows))
        require(len({row["stableKey"] for row in rows}) == len(rows))
        require(all(row["businessId"] == value["businessId"] and row["documentId"] == rows[0]["documentId"]
                    and row["documentVersion"] == rows[0]["documentVersion"] for row in rows))
    elif name == "KnowledgeDocumentMetadata":
        require(value["id"] is not None or value["version"] == value["sectionCount"] == 0)
    elif name == "LoyaltyMembership":
        require(not (value["enrolled"] and value["preMember"]))
        require(value["enrolled"] or value["tier"] is None)
        require(len({wallet["wallet"] for wallet in value["wallets"]}) == len(value["wallets"]))
    elif name == "KnowledgeSourceRemovalReceipt":
        require(value["sectionsRequiringRefresh"] <= value["sectionsHidden"])
    elif name == "WebsiteKnowledgeRemovalReceipt":
        require(_website_import_url(value["url"]) == value["url"])
        require(value["sectionsRequiringRefresh"] <= value["sectionsHidden"])
        require(value["sourceId"] is not None or value["sectionsDropped"] == value["sectionsHidden"] == 0)
        require(value["outcome"] != "already_removed" or value["cancelledImports"] == value["sectionsDropped"] == value["sectionsHidden"] == 0)
    elif name == "ConversationControlState":
        require(value["owner"]["kind"] == "human" or value["owner"]["userId"] is None)
        require(value["owner"]["kind"] != "human" or value["owner"]["userId"] is not None)
        require(value["owner"]["kind"] != "human" or value["automation"]["paused"])
        require(value["automation"]["pausedAt"] is None or value["automation"]["paused"])
    elif name in {"ConversationControlReceipt", "ConversationTakeoverReceipt", "ConversationAssignmentReceipt"}:
        require(value["action"] != "take_over" or value["assigneeUserId"] is not None)
    elif name == "ConversationAssigneePage":
        require(value["page"]["hasMore"] == (value["page"]["nextCursor"] is not None))
        distinct([member["userId"] for member in value["data"]])
        require(sum(member["isCurrentUser"] for member in value["data"]) <= 1)
        require(all(member["displayName"].strip() and not re.search(r"[\x00-\x1f\x7f-\x9f]", member["displayName"]) for member in value["data"]))
    elif name == "PreparedMessagingConfiguration":
        created, updated, expires = [_instant(value[k]) for k in ["createdAt", "updatedAt", "expiresAt"]]
        state, reviewed = value["state"], value["reviewedAt"]
        require(updated >= created and 0 < (expires - created).total_seconds() <= 900)
        require((state == "applied") == (value["result"] is not None))
        require(state not in {"ready", "applied", "rejected"} or reviewed is not None)
        require(state != "awaiting_review" or reviewed is None)
        require((state == "awaiting_review") == (value["review"] is not None))
        require(value["reasonCode"] is None if state in {"awaiting_review", "ready", "applied"}
                else state == "unknown" or value["reasonCode"] is not None)
        require(state != "rejected" or value["reasonCode"] == "user_rejected")
        require(state != "expired" or value["reasonCode"] == "preparation_expired")
        require(state != "stale" or value["reasonCode"] in {"configuration_changed", "eligibility_changed"})
        if reviewed is not None:
            require(created <= _instant(reviewed) <= updated)
        if value["review"] is not None:
            review = value["review"]
            _https(review["url"])
            url = urlsplit(review["url"])
            require(not url.query and url.path == f'/approve/settings/{value["businessId"]}/{value["id"]}'
                    and review["expiresAt"] == value["expiresAt"])
    elif name == "ContactConsentState":
        distinct([identity["identityId"] for identity in value["identities"]])
        for identity in value["identities"]:
            decisions = identity["purposes"]
            require({decision["purpose"] for decision in decisions} == {"marketing", "utility", "service", "loyalty", "ad_measurement"})
            require(all(decision["status"] == "unknown" or decision["changedAt"] is not None for decision in decisions))
    elif name == "PublicPartnerApiUsage":
        return capture_partner_usage(value)
    elif name == "BlueprintUpdatePreview":
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
    elif name == "ManagedFlowDraftSaveReceipt":
        require(re.fullmatch(r"sha256:[a-f0-9]{64}", value["fingerprint"]) is not None)
    elif name == "ManagedFlowDraftSaveInput":
        import json
        require(len(json.dumps(value["definition"], ensure_ascii=False, separators=(",", ":")).encode()) <= 512000)
    elif name == "FlowDraftSnapshot":
        distinct(value["reasons"])
        require(value["fingerprint"] is None or re.fullmatch(r"sha256:[a-f0-9]{64}", value["fingerprint"]) is not None)
        if value["state"] == "available":
            require(value["revision"] is not None and value["fingerprint"] is not None and not value["reasons"] and value["definition"] is not None)
            require(value["definition"]["id"] == value["recipeId"] and value["definition"]["businessId"] == value["businessId"])
        else:
            require(value["definition"] is None and bool(value["reasons"]))
    elif name == "FlowRunPage":
        rows = value["data"]
        require(value["page"]["hasMore"] == (value["page"]["nextCursor"] is not None))
        require(len({row["id"] for row in rows}) == len(rows))
        require(all(rows[index - 1]["startedAt"] >= row["startedAt"] for index, row in enumerate(rows) if index > 0))
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
        _revision(value["authorityVersion"], "authorityVersion")
        if "revision" in value:
            _revision(value["revision"], "revision")
    elif name == "PartnerSubscription":
        _subscription(value)
        _revision(value["revision"], "revision")
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
