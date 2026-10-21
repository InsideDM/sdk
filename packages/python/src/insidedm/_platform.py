"""Application clients and bounded merchant-approved delegated credentials."""
from __future__ import annotations

import asyncio
import json
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Sequence

import httpx2

from ._async_transport import AsyncTransport
from ._client import AsyncInsideDM, InsideDM
from ._codec import SCHEMAS, input_value
from ._errors import InsideDMConfigurationError, InsideDMError, InsideDMProtocolError, InsideDMTransportError
from ._generated.async_resources import AsyncPlatformResources
from ._generated.resources import PlatformResources
from ._policy import Budget, Prepared, Settings
from ._transport import Transport
from ._rollouts import AsyncPlatformBlueprintFacade, PlatformBlueprintFacade

MAX_ENTRIES = 500
MAX_EXCHANGES = 100
REFRESH_SKEW_SECONDS = 30


@dataclass(repr=False)
class Entry:
    grant: dict | None = None
    flights: dict = field(default_factory=dict)


@dataclass(repr=False)
class SyncFlight:
    condition: threading.Condition
    done: bool = False
    token: str | None = None
    error: InsideDMError | None = None


@dataclass(repr=False)
class AsyncFlight:
    task: asyncio.Task
    waiters: int = 0


def selection(business_id, scopes):
    business_id = input_value({"type": "string", "format": "uuid"}, business_id, "business_id").lower()
    if scopes is not None:
        if not isinstance(scopes, Sequence) or isinstance(scopes, (str, bytes)):
            raise InsideDMConfigurationError("Use a nonempty set of business scopes.", field="scopes")
        scopes = input_value(SCHEMAS["DelegationExchangeInput"]["properties"]["scopes"], list(scopes), "scopes")
        if len(scopes) != len(set(scopes)):
            raise InsideDMConfigurationError("Use distinct business scopes.", field="scopes")
        scopes = tuple(sorted(scopes))
    return business_id, scopes, (business_id, scopes)


def _fresh(entry):
    if not entry.grant:
        return False
    return datetime.fromisoformat(entry.grant["expiresAt"].replace("Z", "+00:00")).timestamp() > time.time() + REFRESH_SKEW_SECONDS


def _grant(transport, raw, business_id, scopes):
    grant = raw["data"]
    expiration = datetime.fromisoformat(grant["expiresAt"].replace("Z", "+00:00")).timestamp()
    if (grant["businessId"] != business_id or not time.time() < expiration <= time.time() + 15 * 60 + REFRESH_SKEW_SECONDS
        or scopes is not None and set(grant["scopes"]) != set(scopes)
        or transport.application_id is not None and grant["applicationId"] != transport.application_id):
        raise InsideDMProtocolError("InsideDM returned an inconsistent business delegation.", code="invalid_response")
    transport.application_id = grant["applicationId"]
    return grant


def _exchange_request(business_id, scopes, settings):
    body = {"business_id": business_id, **({"scopes": list(scopes)} if scopes is not None else {})}
    wire = input_value(SCHEMAS["DelegationExchangeInput"], body)
    return Prepared("internal.delegation", "createBusinessDelegation", {}, {},
                    json.dumps(wire, separators=(",", ":")).encode(), None, settings)


def _entry(entries, key):
    if key in entries:
        entries.move_to_end(key)
        return entries[key]
    if len(entries) >= MAX_ENTRIES:
        idle = next((k for k, v in entries.items() if not v.flights), None)
        if idle is None:
            raise InsideDMTransportError("Delegation capacity is currently exhausted.", code="delegation_capacity", retryable=True)
        entries.pop(idle)
    entry = Entry()
    entries[key] = entry
    return entry


class InsideDMPlatform(PlatformResources):
    """One application key; each business still requires merchant approval.

    Use for_business() only with the business ID saved against your authenticated
    client. Selection grants no access and performs no network request.
    """

    blueprints: PlatformBlueprintFacade

    def __init__(self, *, api_key: str, timeout_seconds: float = 20,
                 attempt_timeout_seconds: float = 10, max_retries: int = 2,
                 http_client: httpx2.Client | None = None):
        self._transport = Transport(api_key=api_key, platform=True, http_client=http_client,
                                    settings=Settings(timeout_seconds, attempt_timeout_seconds, max_retries))
        self._entries: OrderedDict[tuple, Entry] = OrderedDict()
        self._lock = threading.RLock()
        self._pending = 0
        self._init_resources(self._transport)
        self.blueprints = PlatformBlueprintFacade(self)

    def for_business(self, business_id: str, *, scopes: Sequence[str] | None = None) -> InsideDM:
        business_id, scopes, key = selection(business_id, scopes)

        def invalidate(token):
            with self._lock:
                entry = self._entries.get(key)
                if entry and entry.grant and entry.grant["token"] == token:
                    entry.grant = None

        transport = Transport(api_key=None, business_id=business_id, settings=self._transport.settings,
                              http_client=self._transport.http,
                              token_provider=lambda budget, settings: self._acquire(key, business_id, scopes, budget, settings),
                              invalidate=invalidate)
        return InsideDM._from_transport(transport)

    def _acquire(self, key, business_id, scopes, budget, settings):
        with self._lock:
            if self._transport.closed:
                raise InsideDMConfigurationError("Create a new application client after closing it.", field="client")
            entry = _entry(self._entries, key)
            if _fresh(entry):
                return entry.grant["token"]
            policy = settings
            flight = entry.flights.get(policy)
            if flight:
                while not flight.done:
                    flight.condition.wait(timeout=budget.remaining())
                if flight.error:
                    # Do not share mutable exception traceback state among threads.
                    error = flight.error
                    if isinstance(error, InsideDMConfigurationError):
                        raise InsideDMConfigurationError("Business credential acquisition failed.") from None
                    raise type(error)("Business credential acquisition failed.", code=error.code,
                                      meta=error.meta, retryable=error.retryable) from None
                if flight.token is None:
                    raise InsideDMTransportError("Business credential acquisition was interrupted.", code="delegation_interrupted", retryable=True)
                return flight.token
            if self._pending >= MAX_EXCHANGES:
                raise InsideDMTransportError("Delegation capacity is currently exhausted.", code="delegation_capacity", retryable=True)
            flight = SyncFlight(threading.Condition(self._lock))
            entry.flights[policy] = flight
            self._pending += 1
        try:
            raw, _ = self._transport._execute(_exchange_request(business_id, scopes, settings), budget)
            grant = _grant(self._transport, raw, business_id, scopes)
            with self._lock:
                entry.grant = grant
                flight.token = grant["token"]
            return grant["token"]
        except InsideDMError as error:
            with self._lock:
                flight.error = error
            raise
        finally:
            with self._lock:
                flight.done = True
                entry.flights.pop(policy, None)
                self._pending -= 1
                flight.condition.notify_all()

    def close(self) -> None:
        self._transport.close()
        with self._lock:
            for entry in self._entries.values():
                entry.grant = None
            self._entries.clear()

    def __enter__(self) -> InsideDMPlatform:
        return self

    def __exit__(self, *_exc) -> None:
        self.close()


class AsyncInsideDMPlatform(AsyncPlatformResources):
    """Native asyncio application client; keep it within one event loop."""

    blueprints: AsyncPlatformBlueprintFacade

    def __init__(self, *, api_key: str, timeout_seconds: float = 20,
                 attempt_timeout_seconds: float = 10, max_retries: int = 2,
                 http_client: httpx2.AsyncClient | None = None):
        self._transport = AsyncTransport(api_key=api_key, platform=True, http_client=http_client,
                                         settings=Settings(timeout_seconds, attempt_timeout_seconds, max_retries))
        self._entries: OrderedDict[tuple, Entry] = OrderedDict()
        self._tasks: set[asyncio.Task] = set()
        self._init_resources(self._transport)
        self.blueprints = AsyncPlatformBlueprintFacade(self)

    def for_business(self, business_id: str, *, scopes: Sequence[str] | None = None) -> AsyncInsideDM:
        business_id, scopes, key = selection(business_id, scopes)

        def invalidate(token):
            entry = self._entries.get(key)
            if entry and entry.grant and entry.grant["token"] == token:
                entry.grant = None

        async def acquire(budget, settings):
            if self._transport.closed:
                raise InsideDMConfigurationError("Create a new application client after closing it.", field="client")
            entry = _entry(self._entries, key)
            if _fresh(entry):
                return entry.grant["token"]
            policy = (settings.attempt_timeout_seconds, settings.max_retries)
            flight = entry.flights.get(policy)
            if flight is None:
                if len(self._tasks) >= MAX_EXCHANGES:
                    raise InsideDMTransportError("Delegation capacity is currently exhausted.", code="delegation_capacity", retryable=True)

                async def exchange():
                    try:
                        shared = Budget(time.monotonic() + 120)
                        async with asyncio.timeout(120):
                            raw, _ = await self._transport._execute(_exchange_request(business_id, scopes, settings), shared)
                        grant = _grant(self._transport, raw, business_id, scopes)
                        entry.grant = grant
                        return grant["token"]
                    finally:
                        entry.flights.pop(policy, None)

                task = asyncio.create_task(exchange())
                flight = AsyncFlight(task)
                entry.flights[policy] = flight
                self._tasks.add(task)

                def finished(task):
                    self._tasks.discard(task)
                    if not task.cancelled():
                        task.exception()  # Retrieve an error if every waiter stopped.
                task.add_done_callback(finished)
            flight.waiters += 1
            try:
                async with asyncio.timeout(budget.remaining()):
                    return await asyncio.shield(flight.task)
            finally:
                flight.waiters -= 1
                if flight.waiters == 0 and not flight.task.done():
                    flight.task.cancel()

        transport = AsyncTransport(api_key=None, business_id=business_id, settings=self._transport.settings,
                                   http_client=self._transport.http, token_provider=acquire, invalidate=invalidate)
        return AsyncInsideDM._from_transport(transport)

    async def aclose(self) -> None:
        self._transport.closed = True
        tasks = list(self._tasks)
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self._entries.clear()
        if self._transport.owned:
            await self._transport.http.aclose()

    async def __aenter__(self) -> AsyncInsideDMPlatform:
        return self

    async def __aexit__(self, *_exc) -> None:
        await self.aclose()
