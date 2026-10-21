import asyncio
import json

import httpx2
import pytest

from insidedm import InsideDM, InsideDMConfigurationError, InsideDMTransportError
from insidedm.testing import TEST_API_KEY, TEST_ID, create_async_test_client, create_test_client


def notification():
    return {"to": {"phone": "+919800000099"}, "content": {"type": "template", "template": {"id": TEST_ID}, "variables": {"customerName": "Asha"}}}


def test_notification_discovery_and_lost_response_reuse_captured_intent():
    seen = []
    default = create_test_client()
    from insidedm.testing import _default_response

    def respond(request):
        seen.append(request)
        if request.method == "POST" and sum(r.method == "POST" for r in seen) == 1:
            raise httpx2.ReadError("Simulated lost response after server acceptance.")
        return _default_response(request)

    with httpx2.Client(transport=httpx2.MockTransport(respond)) as http:
        with InsideDM(api_key=TEST_API_KEY, http_client=http, max_retries=1) as client:
            result = client.messages.send(**notification(), idempotency_key="order/123/shipped")
            assert result.data.kind == "messages.send"
            assert result.meta.attempts == 2
            posts = [r for r in seen if r.method == "POST"]
            assert len(posts) == 2
            assert posts[0].content == posts[1].content
            assert posts[0].headers["idempotency-key"] == posts[1].headers["idempotency-key"] == "order/123/shipped"
            assert json.loads(posts[0].content)["content"]["variables"] == {"customerName": "Asha"}
            assert seen[0].url.path == "/v1/workspace"
            assert all(r.url.host == "api.insidedm.io" for r in seen)
        assert not http.is_closed
    default.close()


def test_validation_before_io_and_explicit_null_is_not_omitted():
    seen = []
    with create_test_client(respond=lambda r: seen.append(r)) as client:
        with pytest.raises(InsideDMConfigurationError):
            client.messages.send(to={"phone": "invalid"}, content={"type": "text", "text": "Hi"})
        with pytest.raises(InsideDMConfigurationError):
            client.contacts.update(TEST_ID)
        assert seen == []
        client.contacts.update(TEST_ID, display_name=None, idempotency_key="crm/name/clear")
        assert json.loads(seen[-1].content) == {"displayName": None}
        assert "crm/name/clear" not in repr(client)
    with pytest.raises(TypeError):
        InsideDM(api_key=TEST_API_KEY, base_url="https://other.example")


@pytest.mark.asyncio
async def test_async_deadline_and_caller_cancellation_are_distinct():
    async def slow(request):
        await asyncio.sleep(2)

    async with create_async_test_client(respond=slow) as client:
        with pytest.raises(InsideDMTransportError) as failure:
            await client.workspace.get(timeout_seconds=0.01)
        assert failure.value.code == "request_timeout"
        task = asyncio.create_task(client.workspace.get())
        await asyncio.sleep(0)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task


@pytest.mark.asyncio
async def test_bounded_sync_async_pagination_has_same_public_result_shape():
    with create_test_client() as client:
        contacts = list(client.contacts.iter_items(limit=25, max_items=1))
        assert len(contacts) == 1
        assert contacts[0].id == TEST_ID
        consent = client.consents.get(contact_id=TEST_ID)
        assert consent.data.contact_id == TEST_ID and consent.data.identities == []
    async with create_async_test_client() as client:
        contacts = [c async for c in client.contacts.iter_items(limit=25, max_items=1)]
        assert len(contacts) == 1
        assert contacts[0].id == TEST_ID
        consent = await client.consents.get(contact_id=TEST_ID)
        assert consent.data.contact_id == TEST_ID and consent.data.identities == []
