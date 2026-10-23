"""One scoped server key, with the same resources in sync and async code."""
from __future__ import annotations

import httpx2

from ._async_transport import AsyncTransport
from ._generated.async_resources import AsyncBusinessResources
from ._generated.resources import BusinessResources
from ._flow_facades import AsyncFlows, Flows
from ._policy import Settings
from ._transport import Transport
from ._credentials import AccessTokenProvider, AsyncAccessTokenProvider


class InsideDM(BusinessResources):
    """Server-side insideDM client. Construction never calls the API.

    Keep this client for your process lifetime or use it as a context manager.
    The API origin and organization's WhatsApp account are resolved for you.
    An injected HTTP client remains owned by its caller.
    """

    flows: Flows

    def __init__(self, *, api_key: str | None = None, access_token: str | AccessTokenProvider | None = None, timeout_seconds: float = 20,
                 attempt_timeout_seconds: float = 10, max_retries: int = 2,
                 http_client: httpx2.Client | None = None):
        self._transport = Transport(api_key=api_key, access_token=access_token, http_client=http_client,
                                    settings=Settings(timeout_seconds, attempt_timeout_seconds, max_retries))
        self._init_resources(self._transport)
        self.flows = Flows(self._transport)

    @classmethod
    def _from_transport(cls, transport):
        client = cls.__new__(cls)
        client._transport = transport
        client._init_resources(transport)
        client.flows = Flows(transport)
        return client

    def close(self) -> None:
        self._transport.close()

    def __enter__(self) -> InsideDM:
        return self

    def __exit__(self, *_exc) -> None:
        self.close()


class AsyncInsideDM(AsyncBusinessResources):
    """Native asyncio client. Use one instance within a single event loop."""

    flows: AsyncFlows

    def __init__(self, *, api_key: str | None = None, access_token: str | AsyncAccessTokenProvider | None = None, timeout_seconds: float = 20,
                 attempt_timeout_seconds: float = 10, max_retries: int = 2,
                 http_client: httpx2.AsyncClient | None = None):
        self._transport = AsyncTransport(api_key=api_key, access_token=access_token, http_client=http_client,
                                         settings=Settings(timeout_seconds, attempt_timeout_seconds, max_retries))
        self._init_resources(self._transport)
        self.flows = AsyncFlows(self._transport)

    @classmethod
    def _from_transport(cls, transport):
        client = cls.__new__(cls)
        client._transport = transport
        client._init_resources(transport)
        client.flows = AsyncFlows(transport)
        return client

    async def aclose(self) -> None:
        await self._transport.aclose()

    async def __aenter__(self) -> AsyncInsideDM:
        return self

    async def __aexit__(self, *_exc) -> None:
        await self.aclose()
