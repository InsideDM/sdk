"""Native asyncio adapter; cancellation never becomes a retryable failure."""
from __future__ import annotations

import asyncio
import time

import httpx2

from ._codec import OPERATIONS
from ._errors import InsideDMAPIError, InsideDMConfigurationError, InsideDMError, InsideDMProtocolError, InsideDMTransportError
from ._models import ResponseMeta
from ._policy import Budget, MAX_BODY_BYTES, Settings, prepare
from ._transport import ResponsePolicy


class AsyncTransport(ResponsePolicy):
    def __init__(self, *, api_key, platform=False, settings=Settings(), http_client=None,
                 business_id=None, token_provider=None, invalidate=None):
        super().__init__(api_key=api_key, platform=platform, settings=settings,
                         business_id=business_id, token_provider=token_provider, invalidate=invalidate)
        if http_client is not None and not isinstance(http_client, httpx2.AsyncClient):
            raise InsideDMConfigurationError("Use an asynchronous HTTPX2 AsyncClient.", field="http_client")
        self.http = http_client or httpx2.AsyncClient(follow_redirects=False)
        self.owned = http_client is None
        self._workspace_lock = asyncio.Lock()

    async def aclose(self):
        if not self.closed:
            self.closed = True
            if self.owned:
                await self.http.aclose()

    async def invoke(self, key, paths, values, *, expected_business_id=None):
        prepared = self._prepare(key, paths, values)
        budget = Budget(time.monotonic() + prepared.settings.timeout_seconds)
        try:
            async with asyncio.timeout(prepared.settings.timeout_seconds):
                if not self.platform and "businessId" in OPERATIONS[prepared.operation]["path_parameters"] and self.business_id is None:
                    async with self._workspace_lock:
                        if self.business_id is None:
                            discovery = prepare("business.workspace.get", {}, {}, prepared.settings, platform=False)
                            await self._execute(discovery, budget)
                if expected_business_id is not None and self.business_id != expected_business_id:
                    raise InsideDMConfigurationError("Use this deployment's own business client.", field="business_id")
                raw, meta = await self._execute(prepared, budget)
                return self._result(prepared, raw, meta)
        except TimeoutError:
            error = InsideDMTransportError("InsideDM request timed out.", code="request_timeout", retryable=True)
            raise self._recover(error, prepared) from None
        except InsideDMError as error:
            raise self._recover(error, prepared) from None

    async def _execute(self, prepared, budget):
        retries, attempt, refreshed = 0, 0, False
        while True:
            if self.closed:
                raise InsideDMConfigurationError("Create a new client after closing this one.", field="client")
            budget.remaining()
            token = await self.token_provider(budget, prepared.settings) if self.token_provider else self._api_key
            attempt += 1
            request = self._request(self.http, prepared, budget, token)
            response = None
            meta = ResponseMeta(None, None, attempt)
            try:
                async with asyncio.timeout(min(budget.remaining(), prepared.settings.attempt_timeout_seconds)) as attempt_timeout:
                    response = await self.http.send(request, stream=True, follow_redirects=False)
                    meta = self._meta(response, attempt, prepared)
                    self._length(response, meta)
                    chunks, size = [], 0
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        size += len(chunk)
                        if size > MAX_BODY_BYTES:
                            raise InsideDMProtocolError("InsideDM returned an oversized response.", code="response_too_large", meta=meta)
                        chunks.append(chunk)
                    return self._decode(b"".join(chunks), response, meta, prepared)
            except InsideDMError as error:
                failure = error
            except Exception as error:
                if isinstance(error, TimeoutError) and attempt_timeout.expired():
                    failure = InsideDMTransportError("InsideDM request timed out.", code="request_timeout", meta=meta, retryable=True)
                else:
                    failure = self._http_failure(error, meta)
            finally:
                if response is not None:
                    await response.aclose()
            if self.token_provider and isinstance(failure, InsideDMAPIError) and failure.code == "invalid_token":
                self.invalidate(token)
                if not refreshed:
                    refreshed = True
                    continue
            delay = self._retry(failure, prepared, retries, budget)
            if delay is None:
                raise failure from None
            retries += 1
            await asyncio.sleep(delay)
