"""Pure shared request policy for native sync and async adapters."""
from __future__ import annotations

import base64
import json
import math
import random
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import quote, urlencode
from uuid import uuid4

from ._codec import CONTRACT, OPERATIONS, SchemaMismatch, decode, input_value, resolve, snake
from ._errors import InsideDMConfigurationError, InsideDMProtocolError, InsideDMTransportError
from ._version import API_ORIGIN
from ._usage import capture_partner_usage_query, normalize_usage_instant

CONTROLS = {"timeout_seconds", "attempt_timeout_seconds", "max_retries"}
RETRY_STATUSES = {408, 429, 500, 502, 503, 504}
MAX_BODY_BYTES = 1024 * 1024


def credential(value: str, *, platform: bool) -> str:
    pattern = r"idmp_[A-Za-z0-9_-]{16}_[A-Za-z0-9_-]{43}" if platform else r"(?:idm|idmd)_[A-Za-z0-9_-]{16}_[A-Za-z0-9_-]{43}"
    if not isinstance(value, str) or not re.fullmatch(pattern, value):
        raise InsideDMConfigurationError("Provide the complete scoped server credential.", field="api_key")
    # The locator can contain underscores. Check the canonical secret tail.
    segment = value[-43:]
    decoded = base64.urlsafe_b64decode(segment + "=")
    if base64.urlsafe_b64encode(decoded).decode().rstrip("=") != segment:
        raise InsideDMConfigurationError("Provide the complete scoped server credential.", field="api_key")
    return value


def bounded(value, default, minimum, maximum, field, integer=False):
    if type(value) not in (int, float) or not minimum <= value <= maximum or not math.isfinite(value) or (integer and type(value) is not int):
        raise InsideDMConfigurationError("Use a value within the documented bounds.", field=field)
    return value


@dataclass(frozen=True)
class Settings:
    timeout_seconds: float = 20.0
    attempt_timeout_seconds: float = 10.0
    max_retries: int = 2

    def override(self, values: dict[str, Any]) -> Settings:
        return Settings(
            bounded(values.get("timeout_seconds", self.timeout_seconds), self.timeout_seconds, 0.001, 120, "timeout_seconds"),
            bounded(values.get("attempt_timeout_seconds", self.attempt_timeout_seconds), self.attempt_timeout_seconds, 0.001, 60, "attempt_timeout_seconds"),
            bounded(values.get("max_retries", self.max_retries), self.max_retries, 0, 5, "max_retries", True),
        )


@dataclass
class Budget:
    deadline: float

    def remaining(self) -> float:
        left = self.deadline - time.monotonic()
        if left <= 0:
            raise InsideDMTransportError("InsideDM request timed out.", code="request_timeout", retryable=True)
        return left


@dataclass(frozen=True)
class Prepared:
    key: str
    operation: str
    paths: dict[str, str]
    query: dict[str, Any]
    body: bytes | None
    idempotency_key: str | None
    settings: Settings


def validate_key(key):
    if not isinstance(key, str) or not re.fullmatch(r"[!-~]{1,128}", key) or "," in key:
        raise InsideDMConfigurationError("Use 1–128 printable ASCII characters without commas.", field="idempotency_key")
    return key


def _normalise(operation, body):
    if operation in {"updateMessagingConfiguration", "prepareMessagingConfiguration"}:
        configuration = body["configuration"]
        default = configuration["defaultTextPurposeBinding"]
        if default is not None and default not in configuration["textPurposeBindings"]:
            raise InsideDMConfigurationError("The default purpose binding must exist in text_purpose_bindings.", field="configuration.default_text_purpose_binding")
        configuration["templateAliases"] = {alias: value.lower() for alias, value in configuration["templateAliases"].items()}
    if operation in {"createPlatformSubscription", "updatePlatformSubscription"} and "events" in body:
        body["events"] = [event for event in CONTRACT["schemas"]["DeveloperEventType"]["enum"] if event in body["events"]]
    if operation in {"createContact", "updateContact"}:
        field = "name" if operation == "createContact" else "displayName"
        value = body.get(field)
        if value is not None:
            if not isinstance(value, str) or not value.strip() or re.search(r"[\x00-\x1f\x7f]", value):
                raise InsideDMConfigurationError("Use a nonblank name without control characters.", field=snake(field))
            body[field] = value.strip()
    if operation == "replaceContactTags":
        tags = body.get("tags")
        if isinstance(tags, list) and all(isinstance(v, str) for v in tags):
            if any(not v.strip() for v in tags):
                raise InsideDMConfigurationError("Use nonblank tags.", field="tags")
            body["tags"] = sorted({v.strip().lower() for v in tags})
    if operation in {"sendMessage", "previewMessage"}:
        content = body.get("content", {})
        if isinstance(content, dict):
            if isinstance(content.get("text"), str):
                content["text"] = content["text"].strip()
            if isinstance(content.get("variables"), dict):
                content["variables"] = {k: v.strip() if isinstance(v, str) else v for k, v in sorted(content["variables"].items())}
            if content.get("type") == "template":
                content.setdefault("variables", {})
        for name in ["clientReference", "purposeBinding"]:
            if isinstance(body.get(name), str):
                body[name] = body[name].strip()
        if isinstance(body.get("expiresAt"), str):
            parsed = datetime.fromisoformat(body["expiresAt"].replace("Z", "+00:00"))
            body["expiresAt"] = parsed.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    return body


def prepare(key: str, paths: dict[str, str], values: dict[str, Any], defaults: Settings, *, platform: bool) -> Prepared:
    binding = CONTRACT["bindings"][key]
    operation_id = binding["operation"]
    operation = OPERATIONS[operation_id]
    if operation["platform"] != platform:
        raise InsideDMConfigurationError("Use the matching business or application client.")
    body_fields = {snake(k): k for k in binding["body_fields"] if k not in binding["body"]}
    query_fields = {snake(k): k for k in operation["query_parameters"] if k not in binding["query"]}
    allowed = set(body_fields) | set(query_fields) | CONTROLS
    if operation["idempotency"] and operation_id != "publishEvent":
        allowed.add("idempotency_key")
    if set(values) - allowed:
        raise InsideDMConfigurationError("Remove fields not listed in this method's input type.")
    settings = defaults.override(values)
    captured_paths = {}
    for name, value in paths.items():
        schema = operation["path_parameters"][name]
        if operation_id == "getBlueprintVersion" and name == "version":
            value = str(bounded(value, None, 1, 2147483647, "version", True))
        captured_paths[name] = input_value(schema, value, snake(name))
        if schema.get("format") == "uuid":
            captured_paths[name] = captured_paths[name].lower()
    query = {**binding["query"]}
    for name in query_fields:
        if name in values:
            value = values[name]
            if operation_id == "getPartnerApiUsage" and name in {"from_", "to"}:
                try:
                    value = normalize_usage_instant(value)
                except (ValueError, OverflowError):
                    raise InsideDMConfigurationError("Use an ISO date or a timezone-aware timestamp.", field=name) from None
            query[query_fields[name]] = input_value(operation["query_parameters"][query_fields[name]], value, name)
    missing_query = set(operation["required_query"]) - set(query)
    if missing_query:
        raise InsideDMConfigurationError("Provide this required field.", field=snake(sorted(missing_query)[0]))
    if operation_id == "getBusinessAnalytics":
        query.setdefault("channel", "all")
        query.setdefault("range", "month")
        if query["range"] == "custom":
            if not {"start", "end"} <= set(query) or query["start"] > query["end"]:
                raise InsideDMConfigurationError("Custom analytics ranges require start and end calendar dates in order.")
        elif {"start", "end"} & set(query):
            raise InsideDMConfigurationError("Calendar dates are accepted only with range='custom'.")
    if operation_id == "getPartnerApiUsage":
        try:
            query = capture_partner_usage_query(query)
        except (ValueError, OverflowError):
            raise InsideDMConfigurationError("Use complete UTC buckets spanning at most 31 days, or 24 hours for minute telemetry.") from None
    if operation_id == "getSoftwareUsage" and binding["query"].get("view") == "software_usage":
        if set(query) != {"view", "from", "to"}:
            raise InsideDMConfigurationError("Provide from_ and to UTC instants.")
        start, end = [datetime.fromisoformat(query[n].replace("Z", "+00:00")) for n in ["from", "to"]]
        for name, instant in [("from", start), ("to", end)]:
            query[name] = instant.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        now = datetime.now(timezone.utc)
        if not 0 < (end - start).total_seconds() <= 31 * 86400 or end > now or (now - start).total_seconds() > 365 * 86400:
            raise InsideDMConfigurationError("Use a past UTC interval of at most 31 days within retained history.")
    body = None
    idempotency_key = None
    if operation["request"]:
        supplied = {n: values[n] for n in body_fields if n in values}
        supplied.update({snake(k): v for k, v in binding["body"].items()})
        decoded = input_value(operation["request"], supplied)
        decoded = _normalise(operation_id, decoded)
        # Normalisation cannot turn whitespace-only text into an admitted value.
        try:
            decoded = decode(operation["request"], decoded)
        except SchemaMismatch as error:
            raise InsideDMConfigurationError(error.hint, field=error.field) from None
        try:
            body = json.dumps(decoded, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")
        except (ValueError, TypeError, UnicodeError, RecursionError):
            raise InsideDMConfigurationError("Use finite, bounded JSON values.") from None
        limit = operation.get("body_limit") or (65536 if operation_id in {"sendMessage", "previewMessage", "createContact", "updateContact", "replaceContactTags", "updateContactAttributes", "publishEvent"} else MAX_BODY_BYTES)
        if len(body) > limit:
            raise InsideDMConfigurationError("The input exceeds the operation's JSON size limit.")
    if operation["idempotency"]:
        idempotency_key = validate_key(decoded["id"] if operation_id == "publishEvent" else values.get("idempotency_key", str(uuid4())))
        if body is None:
            body = b"{}"
    return Prepared(key, operation_id, captured_paths, query, body, idempotency_key, settings)


def url_for(prepared: Prepared, business_id: str | None) -> str:
    operation = OPERATIONS[prepared.operation]
    values = {**prepared.paths}
    if business_id is not None and "businessId" in operation["path_parameters"]:
        values["businessId"] = business_id
    path = operation["path"]
    for name, schema in operation["path_parameters"].items():
        if name not in values:
            raise InsideDMProtocolError("InsideDM workspace context is missing.", code="invalid_response")
        value = input_value(schema, values[name], snake(name))
        path = path.replace("{" + name + "}", quote(value, safe=""))
    return API_ORIGIN + path + ("?" + urlencode(prepared.query) if prepared.query else "")


def retry_after(value: str | None) -> float | None:
    if not value or len(value) > 128:
        return None
    try:
        seconds = float(value) if re.fullmatch(r"\d+(?:\.\d+)?", value) else parsedate_to_datetime(value).timestamp() - time.time()
        return min(86400.0, max(0.0, seconds)) if math.isfinite(seconds) else None
    except (ValueError, TypeError, OverflowError):
        return None


def retry_delay(attempt: int, retry_seconds: float | None) -> float:
    return max(retry_seconds or 0, random.uniform(0, min(5, 0.25 * 2 ** (attempt - 1))))
