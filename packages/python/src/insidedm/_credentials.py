"""Optional API-resource credentials; the token manager retains refresh tokens."""
from __future__ import annotations

import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field

from ._errors import InsideDMConfigurationError


@dataclass(frozen=True)
class AccessTokenRequest:
    operation: str
    method: str
    route: str = field(repr=False)
    body: bytes | None = field(repr=False)
    idempotency_key: str | None = field(repr=False)
    business_id: str | None
    grant_id: str | None
    timeout_seconds: float


AccessTokenProvider = Callable[[AccessTokenRequest], str]
AsyncAccessTokenProvider = Callable[[AccessTokenRequest], Awaitable[str]]


def access_credential(value: object) -> str:
    if not isinstance(value, str) or not re.fullmatch(r"(?:idmi_)?[A-Za-z0-9_-]{43}", value):
        raise InsideDMConfigurationError("Provide an InsideDM API access token.", field="access_token")
    return value
