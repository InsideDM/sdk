"""Verify InsideDM's exact raw webhook bytes before parsing the event."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal, NoReturn, Sequence

from pydantic import TypeAdapter, ValidationError

from ._codec import SCHEMAS, SchemaMismatch, decode
from ._errors import InsideDMWebhookVerificationError
from ._generated import models

Event = (models.DeveloperChangedEventEnvelope | models.MessageDeliveryChangedEventEnvelope |
         models.OperationChangedEventEnvelope | models.ApplicationResourceEventEnvelope |
         models.EndpointTestEventEnvelope)


@dataclass(frozen=True, repr=False)
class VerifiedEvent:
    event: Event
    kind: Literal["event"] = field(default="event", init=False)


@dataclass(frozen=True, repr=False)
class Verification:
    challenge: models.WebhookVerificationChallenge
    response: models.WebhookVerificationProof
    kind: Literal["verification"] = field(default="verification", init=False)


@dataclass(frozen=True)
class UnknownEvent:
    id: str | None
    type: str
    version: int


@dataclass(frozen=True)
class UnknownWebhook:
    event: UnknownEvent
    kind: Literal["unknown"] = field(default="unknown", init=False)


VerifiedWebhook = VerifiedEvent | Verification | UnknownWebhook


def _secret(value: str) -> bytes:
    if not isinstance(value, str) or not re.fullmatch(r"whsec_[A-Za-z0-9_-]{43}", value):
        raise InsideDMWebhookVerificationError("invalid_secret")
    result = base64.urlsafe_b64decode(value[6:] + "=")
    if len(result) != 32 or base64.urlsafe_b64encode(result).decode().rstrip("=") != value[6:]:
        raise InsideDMWebhookVerificationError("invalid_secret")
    return result


def _signature(secret: bytes, timestamp: int, body: bytes) -> str:
    return hmac.new(secret, str(timestamp).encode("ascii") + b"." + body, hashlib.sha256).hexdigest()


def construct_webhook_event(*, raw_body: bytes | str, signature: str | None,
                            secret: str | Sequence[str], now_seconds: int | None = None,
                            tolerance_seconds: int = 300) -> VerifiedWebhook:
    """Authenticate an event, endpoint challenge or safely ignored future version.

    Supply bytes from the original HTTP body, never parsed/re-serialized JSON.
    The caller still owns durable deduplication and application/business checks.
    One or two secrets are accepted during a deliberate rotation overlap.
    """
    def refuse(code: str) -> NoReturn:
        raise InsideDMWebhookVerificationError(code)

    if not isinstance(raw_body, (bytes, str)):
        refuse("invalid_raw_body")
    try:
        body = raw_body.encode("utf-8") if isinstance(raw_body, str) else raw_body
    except UnicodeError:
        refuse("invalid_raw_body")
    if len(body) > 65536:
        refuse("body_too_large")
    now = int(time.time()) if now_seconds is None else now_seconds
    if type(now) is not int or now < 0 or type(tolerance_seconds) is not int or not 1 <= tolerance_seconds <= 300:
        refuse("invalid_verification_options")
    secrets = [secret] if isinstance(secret, str) else secret
    if not isinstance(secrets, (list, tuple)) or not 1 <= len(secrets) <= 2:
        refuse("invalid_secret")
    decoded_secrets = [_secret(s) for s in secrets]
    if not isinstance(signature, str) or not 0 < len(signature) <= 256:
        refuse("invalid_signature")
    timestamp, signatures = None, []
    for part in signature.split(","):
        key, sep, value = part.partition("=")
        if key == "t" and timestamp is None and re.fullmatch(r"0|[1-9][0-9]{0,11}", value):
            timestamp = int(value)
        elif key == "v1" and re.fullmatch(r"[0-9a-f]{64}", value) and value not in signatures:
            signatures.append(value)
        else:
            refuse("invalid_signature")
    if timestamp is None or not 1 <= len(signatures) <= 2 or abs(now - timestamp) > tolerance_seconds:
        refuse("invalid_signature")
    matched = None
    for decoded in decoded_secrets:
        expected = _signature(decoded, timestamp, body)
        for candidate in signatures:
            if hmac.compare_digest(expected, candidate):
                matched = decoded
    if matched is None:
        refuse("invalid_signature")
    try:
        raw = json.loads(body.decode("utf-8"), parse_constant=lambda _: refuse("invalid_json"))
    except (ValueError, UnicodeError, RecursionError):
        refuse("invalid_json")
    if not isinstance(raw, dict) or not isinstance(raw.get("type"), str) or not 1 <= len(raw["type"]) <= 128 or type(raw.get("version")) is not int or not 1 <= raw["version"] <= 9007199254740991:
        refuse("invalid_envelope")
    try:
        if raw["type"] == "endpoint.verify":
            value = decode(SCHEMAS["WebhookVerificationChallenge"], raw)
            if datetime.fromisoformat(value["expiresAt"].replace("Z", "+00:00")).timestamp() <= now:
                refuse("expired_challenge")
            challenge = TypeAdapter(models.WebhookVerificationChallenge).validate_python(value)
            proof = hmac.new(matched, ("insidedm.endpoint.verify.v1." + value["verificationId"] + "." + value["challenge"]).encode(), hashlib.sha256).hexdigest()
            return Verification(challenge, models.WebhookVerificationProof(challenge=value["challenge"], proof=proof))
        known = {"endpoint.test", "contact.changed", "conversation.changed", "message.created", "message.delivery_changed", "order.changed", "shipment.changed", "operation.changed"}
        kind, version = raw["type"], raw["version"]
        supported = version == 2 if kind == "operation.changed" else (version == 1 or version == 2 and kind != "endpoint.test" and "application" in raw)
        if kind not in known or not supported:
            identifier = raw.get("id")
            return UnknownWebhook(UnknownEvent(identifier if isinstance(identifier, str) and len(identifier) <= 256 else None, kind, version))
        name = ("ApplicationResourceEventEnvelope" if version == 2 and kind != "operation.changed" else
                "EndpointTestEventEnvelope" if kind == "endpoint.test" else
                "MessageDeliveryChangedEventEnvelope" if kind == "message.delivery_changed" else
                "OperationChangedEventEnvelope" if kind == "operation.changed" else "DeveloperChangedEventEnvelope")
        value = decode(SCHEMAS[name], raw)
        if kind != "endpoint.test":
            expected_resource = "message" if kind in {"message.created", "message.delivery_changed"} else kind[:-len(".changed")]
            if value["resource"]["type"] != expected_resource:
                refuse("invalid_envelope")
            if kind == "message.delivery_changed" and (value["change"] != "updated" or value["resource"]["deleted"] or (value["resource"].get("parent") or {}).get("type") != "conversation"):
                refuse("invalid_envelope")
            if version == 2 and value.get("application") and kind == "operation.changed":
                producer, app = value["producer"], value["application"]
                if producer["kind"] != "installation" or producer["id"] != app["installationId"] or producer["authorityVersion"] != app["authorityVersion"]:
                    refuse("invalid_envelope")
        return VerifiedEvent(TypeAdapter(getattr(models, name)).validate_python(value))
    except (SchemaMismatch, ValidationError, ValueError, TypeError, KeyError):
        refuse("invalid_envelope")
