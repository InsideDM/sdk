"""Small shared model surface; request validation lives in the contract codec."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ResponseModel(BaseModel):
    model_config = ConfigDict(strict=True, extra="ignore", hide_input_in_errors=True)

    def __repr_args__(self):
        # Results can contain customer data and one-time setup links.
        return [("id", self.__dict__["id"])] if "id" in self.__dict__ else []


@dataclass(frozen=True)
class ResponseMeta:
    request_id: str | None
    status: int | None
    attempts: int
    retry_after_seconds: float | None = None
    idempotency_key: str | None = field(default=None, repr=False)


@dataclass(frozen=True, repr=False)
class Result(Generic[T]):
    data: T
    meta: ResponseMeta

    def __repr__(self) -> str:
        return f"Result(meta={self.meta!r})"


@dataclass(frozen=True)
class Page:
    next_cursor: str | None


@dataclass(frozen=True, repr=False)
class PageResult(Result[list[T]], Generic[T]):
    page: Page


class NotGiven:
    __slots__ = ()

    def __repr__(self) -> str:
        return "NOT_GIVEN"


NOT_GIVEN = NotGiven()
