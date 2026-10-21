from __future__ import annotations

from dataclasses import dataclass, field

from ._models import ResponseMeta


@dataclass(frozen=True)
class WriteRecovery:
    operation: str
    business_id: str | None
    idempotency_key: str = field(repr=False)


class InsideDMError(Exception):
    """Safe diagnostics. Request bodies, credentials and private links stay out."""

    def __init__(self, message: str, *, code: str, meta: ResponseMeta | None = None,
                 retryable: bool = False) -> None:
        super().__init__(message)
        self.code = code
        self.meta = meta or ResponseMeta(None, None, 0)
        self.request_id = self.meta.request_id
        self.status = self.meta.status
        self.retryable = retryable
        self._recovery: WriteRecovery | None = None

    @property
    def recovery(self) -> WriteRecovery | None:
        """Explicit access for durable recovery; excluded from normal error text."""
        return self._recovery


class InsideDMConfigurationError(InsideDMError, ValueError):
    def __init__(self, message: str = "Use the documented input for this field.", *, field: str = "input"):
        super().__init__(f"{field}: {message}", code="invalid_configuration")
        self.field = field


class InsideDMAPIError(InsideDMError):
    _problem: dict[str, object] | None = None

    @property
    def problem(self) -> dict[str, object] | None:
        """Explicit problem-detail access; not included in exception text."""
        from copy import deepcopy
        return deepcopy(self._problem)


class InsideDMTransportError(InsideDMError):
    pass


class InsideDMProtocolError(InsideDMError):
    pass


class InsideDMWebhookVerificationError(InsideDMError):
    def __init__(self, code: str):
        super().__init__("InsideDM webhook verification failed.", code=code)
