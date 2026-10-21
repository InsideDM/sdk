"""Behavioral regressions reproduced during the holistic SDK review."""
import asyncio
import inspect
import json
from datetime import datetime, timedelta, timezone

import httpx2
import pytest

from insidedm import (AsyncInsideDM, AsyncInsideDMPlatform, InsideDM,
                      InsideDMAPIError, InsideDMConfigurationError,
                      InsideDMPlatform, InsideDMProtocolError, InsideDMTransportError)
from insidedm._codec import SCHEMAS
from insidedm.testing import TEST_API_KEY, TEST_ID, TEST_REQUEST_ID, _default_response, _sample

APP_KEY = "idmp_" + "A" * 16 + "_" + "A" * 43
OTHER_ID = "00000000-0000-4000-8000-000000000002"


async def call(method, *args, **kwargs):
    result = method(*args, **kwargs)
    return await result if inspect.isawaitable(result) else result


async def close(client, http):
    for owner in [client, http]:
        if hasattr(owner, "aclose"):
            await owner.aclose()
        else:
            owner.close()


def client_pair(asynchronous, respond, *, platform=False, **kwargs):
    http_type = httpx2.AsyncClient if asynchronous else httpx2.Client
    sdk_type = ((AsyncInsideDMPlatform if asynchronous else InsideDMPlatform) if platform
                else (AsyncInsideDM if asynchronous else InsideDM))
    http = http_type(transport=httpx2.MockTransport(respond), **kwargs.pop("http_options", {}))
    return sdk_type(api_key=APP_KEY if platform else TEST_API_KEY, http_client=http, **kwargs), http


def reply(data):
    return httpx2.Response(200, json={"data": data}, headers={"x-request-id": TEST_REQUEST_ID})


def invalid_token():
    value = _sample(SCHEMAS["Problem"])
    value.update(status=401, code="invalid_token", retryable=False, requestId=TEST_REQUEST_ID)
    return httpx2.Response(401, json=value, headers={"x-request-id": TEST_REQUEST_ID})


def grant():
    value = _sample(SCHEMAS["BusinessDelegation"])
    value["expiresAt"] = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    return value


@pytest.mark.parametrize("asynchronous", [False, True])
@pytest.mark.asyncio
async def test_unexpected_hook_failure_is_safe_and_never_retried(asynchronous):
    calls = []

    def hook(request):
        calls.append(request)
        raise ValueError("private hook diagnostics")

    async def async_hook(request):
        hook(request)

    client, http = client_pair(asynchronous, _default_response, max_retries=2,
                              http_options={"event_hooks": {"request": [async_hook if asynchronous else hook]}})
    try:
        with pytest.raises(InsideDMTransportError) as caught:
            await call(client.workspace.get)
        assert caught.value.code == "http_client_error" and not caught.value.retryable
        assert caught.value.meta.attempts == len(calls) == 1
        assert "private hook diagnostics" not in str(caught.value)
    finally:
        await close(client, http)


def test_extreme_numeric_controls_use_configuration_errors():
    for sdk_type, key in [(InsideDM, TEST_API_KEY), (AsyncInsideDM, TEST_API_KEY),
                          (InsideDMPlatform, APP_KEY), (AsyncInsideDMPlatform, APP_KEY)]:
        with pytest.raises(InsideDMConfigurationError):
            sdk_type(api_key=key, timeout_seconds=10**1000)


@pytest.mark.parametrize("asynchronous", [False, True])
@pytest.mark.asyncio
async def test_domain_validation_precedes_io_and_preserves_event_order(asynchronous):
    seen = []

    def respond(request):
        seen.append(request)
        return invalid_token()

    client, http = client_pair(asynchronous, respond, platform=True, max_retries=0)
    valid = {"name": "Updates", "url": "https://example.invalid/events", "events": ["contact.changed"]}
    invalid = [{"name": " Updates "}, {"url": "https://user:password@example.invalid/events"},
               {"url": "https://example.invalid/events#fragment"},
               {"events": ["contact.changed", "contact.changed"]}]
    try:
        for fields in invalid:
            with pytest.raises(InsideDMConfigurationError):
                await call(client.subscriptions.create, **{**valid, **fields})
        with pytest.raises(InsideDMConfigurationError):
            await call(client.subscriptions.pause, TEST_ID, expected_revision="9999999999")
        assert seen == []
        with pytest.raises(InsideDMAPIError):
            await call(client.subscriptions.create, **{**valid, "events": ["contact.changed", "operation.changed"]})
        assert json.loads(seen[0].content)["events"] == ["operation.changed", "contact.changed"]
    finally:
        await close(client, http)


@pytest.mark.parametrize("asynchronous", [False, True])
@pytest.mark.asyncio
async def test_consent_identity_invariants_and_usage_period_are_checked(asynchronous):
    state = {"data": {"contactId": OTHER_ID, "identities": []}}
    matching_usage = False
    end = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start = end - timedelta(days=1)

    def instant(value):
        return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")

    def respond(request):
        if request.url.path.endswith("/billing/v2"):
            usage = _sample(SCHEMAS["SoftwareUsageSummary"])
            usage["period"] = ({name: request.url.params[name] for name in ["from", "to"]} if matching_usage else
                               {"from": instant(start - timedelta(days=1)), "to": instant(start)})
            return reply(usage)
        if "consent" in request.url.path:
            return reply(state["data"])
        return _default_response(request)

    client, http = client_pair(asynchronous, respond, max_retries=0)
    try:
        with pytest.raises(InsideDMProtocolError):
            await call(client.consents.get, contact_id=TEST_ID)
        consent = _sample(SCHEMAS["ContactConsentState"])
        state["data"] = consent
        with pytest.raises(InsideDMProtocolError):
            await call(client.consents.get, contact_id=TEST_ID)  # Repeated purposes and granted/null timestamp.
        decisions = consent["identities"][0]["purposes"]
        for decision, purpose in zip(decisions, ["marketing", "utility", "service", "loyalty", "ad_measurement"]):
            decision.update(purpose=purpose, status="granted", changedAt=None)
        with pytest.raises(InsideDMProtocolError):
            await call(client.consents.get, contact_id=TEST_ID)
        for decision in decisions:
            decision.update(status="unknown", changedAt=None)
        consent["identities"].append(dict(consent["identities"][0]))
        with pytest.raises(InsideDMProtocolError):
            await call(client.consents.get, contact_id=TEST_ID)
        consent["identities"].pop()
        assert (await call(client.consents.get, contact_id=TEST_ID)).data.contact_id == TEST_ID
        with pytest.raises(InsideDMProtocolError):
            await call(client.usage.get, from_=start, to=end)
        matching_usage = True
        usage = await call(client.usage.get, from_=start.astimezone(timezone(timedelta(hours=5, minutes=30))), to=end)
        assert usage.data.period.model_dump(by_alias=True) == {"from": instant(start), "to": instant(end)}
        # Commas are valid for read-only lookup under the existing Node contract.
        await call(client.operations.lookup, kind="messages.send", idempotency_key="original,key")
    finally:
        await close(client, http)


@pytest.mark.parametrize("asynchronous", [False, True])
@pytest.mark.asyncio
async def test_every_rejected_delegation_is_evicted(asynchronous):
    counts = {"exchanges": 0, "business": 0}

    def respond(request):
        if "delegations" in request.url.path:
            counts["exchanges"] += 1
            return reply(grant())
        counts["business"] += 1
        return invalid_token() if counts["exchanges"] < 3 else reply(_sample(SCHEMAS["PublicContact"]))

    platform, http = client_pair(asynchronous, respond, platform=True, max_retries=0)
    try:
        client = platform.for_business(TEST_ID)
        with pytest.raises(InsideDMAPIError):
            await call(client.contacts.get, TEST_ID)
        assert (await call(client.contacts.get, TEST_ID)).data.id == TEST_ID
        assert counts == {"exchanges": 3, "business": 3}
    finally:
        await close(platform, http)


@pytest.mark.asyncio
async def test_new_waiters_get_a_new_exchange_while_abandoned_exchange_cleans_up():
    started, cleaning, cleanup, replacement, finish = [asyncio.Event() for _ in range(5)]
    exchanges = 0

    async def respond(request):
        nonlocal exchanges
        if "delegations" not in request.url.path:
            return reply(_sample(SCHEMAS["PublicContact"]))
        exchanges += 1
        if exchanges == 1:
            started.set()
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                cleaning.set()
                await cleanup.wait()
                raise
        replacement.set()
        await finish.wait()
        return reply(grant())

    platform, http = client_pair(True, respond, platform=True, max_retries=0)
    try:
        client = platform.for_business(TEST_ID)
        first = asyncio.create_task(client.contacts.get(TEST_ID))
        await asyncio.wait_for(started.wait(), 2)
        first.cancel()
        with pytest.raises(asyncio.CancelledError):
            await first
        await asyncio.wait_for(cleaning.wait(), 2)
        second = asyncio.create_task(client.contacts.get(TEST_ID))
        await asyncio.wait_for(replacement.wait(), 2)
        cleanup.set()
        await asyncio.sleep(0)
        third = asyncio.create_task(client.contacts.get(TEST_ID))
        await asyncio.sleep(0)
        finish.set()
        results = await asyncio.wait_for(asyncio.gather(second, third), 2)
        assert all(result.data.id == TEST_ID for result in results) and exchanges == 2
    finally:
        cleanup.set()
        finish.set()
        await close(platform, http)
