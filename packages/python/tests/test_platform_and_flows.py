import asyncio
import json
from datetime import datetime, timedelta, timezone

import httpx2
import pytest
from pydantic import TypeAdapter

from insidedm import AsyncInsideDMPlatform, InsideDMConfigurationError, InsideDMPlatform, InsideDMProtocolError
from insidedm._codec import SCHEMAS
from insidedm.testing import TEST_ID, TEST_REQUEST_ID, _sample
from insidedm.types import responses

APP_KEY = "idmp_" + "A" * 16 + "_" + "A" * 43
OTHER_ID = "00000000-0000-4000-8000-000000000002"


def reply(data, status=200):
    return httpx2.Response(status, json={"data": data}, headers={"x-request-id": TEST_REQUEST_ID})


def grant(business_id=TEST_ID):
    data = _sample(SCHEMAS["BusinessDelegation"])
    data.update(businessId=business_id, scopes=["contacts.read", "flows.deploy"],
                expiresAt=(datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(timespec="milliseconds").replace("+00:00", "Z"))
    return data


def source_and_preview():
    source = _sample(SCHEMAS["PublicBlueprintVersion"])
    source["definition"].update(dependencies=[], variables=[], clientOverrides=[], parameters={})
    source["definition"]["capabilities"] = {"channels": ["whatsapp"], "actions": []}
    preview = _sample(SCHEMAS["BlueprintUpdatePreview"])
    target = {"applicationId": source["applicationId"], "key": source["definition"]["key"],
              "version": source["definition"]["version"], "digest": source["digest"]}
    preview.update(target=target, state="ready", reasons=[], draftRevision=1, deploymentRevision=1,
                   changes={"nameChanged": False, "templateChanged": False, "parameters": [],
                            "addedDependencySlots": [], "removedDependencySlots": [], "preservedOverrideKeys": []})
    preview["from"] = dict(target)
    return TypeAdapter(responses.PublicBlueprintVersion).validate_python(source), preview


@pytest.mark.asyncio
async def test_delegation_is_single_flight_and_one_cancelled_waiter_does_not_cancel_another():
    started, release = asyncio.Event(), asyncio.Event()
    exchanges = []

    async def respond(request):
        if request.method == "POST":
            exchanges.append(request)
            started.set()
            await release.wait()
            return reply(grant())
        assert request.headers["authorization"].startswith("Bearer idmd_")
        return reply(_sample(SCHEMAS["PublicContact"]))

    async with httpx2.AsyncClient(transport=httpx2.MockTransport(respond)) as http:
        async with AsyncInsideDMPlatform(api_key=APP_KEY, http_client=http, max_retries=0) as platform:
            business = platform.for_business(TEST_ID, scopes=["flows.deploy", "contacts.read"])
            first = asyncio.create_task(business.contacts.get(TEST_ID))
            await started.wait()
            second = asyncio.create_task(business.contacts.get(TEST_ID))
            await asyncio.sleep(0)
            first.cancel()
            with pytest.raises(asyncio.CancelledError):
                await first
            release.set()
            assert (await second).data.id == TEST_ID
            await business.contacts.get(TEST_ID)
            assert len(exchanges) == 1
            await business.aclose()
            assert not http.is_closed


def test_rollout_plan_pins_identity_and_reuses_durable_keys_after_reload():
    source, preview = source_and_preview()
    writes = []

    def respond(request):
        body = json.loads(request.content) if request.content else {}
        if "delegation" in request.url.path:
            return reply(grant())
        if "preview" in request.url.path:
            return reply(preview)
        if request.url.path.endswith("/graph"):
            writes.append(request)
            return reply({"businessId": TEST_ID, "recipeId": TEST_ID, "deploymentRevision": 2,
                          "draftRevision": 2, "target": body["target"], "status": "draft_updated"})
        raise AssertionError(request.url.path)

    with httpx2.Client(transport=httpx2.MockTransport(respond)) as http:
        with InsideDMPlatform(api_key=APP_KEY, http_client=http, max_retries=0) as platform:
            plan = platform.blueprints.rollouts.preview(source, [{"business_id": TEST_ID, "recipe_id": TEST_ID}])
            assert writes == []
            saved = json.loads(plan.model_dump_json(by_alias=True, exclude_unset=True))
            first = list(platform.blueprints.rollouts.apply(plan))
            second = list(platform.blueprints.rollouts.apply(saved))
            assert first[0].state == second[0].state == "draft_updated"
            assert len(writes) == 2 and writes[0].content == writes[1].content
            assert writes[0].headers["idempotency-key"] == writes[1].headers["idempotency-key"]
            saved["clients"][0]["preview"]["businessId"] = OTHER_ID
            with pytest.raises(InsideDMConfigurationError):
                platform.blueprints.rollouts.apply(saved)
            bad = {**preview, "reasons": ["draft_modified"]}
            with pytest.raises(InsideDMConfigurationError):
                platform.for_business(TEST_ID).flows.deployments.apply_update(bad)
            assert len(writes) == 2


def test_application_identity_is_checked_inside_portfolio_rows():
    def respond(request):
        row = _sample(SCHEMAS["PublicPartnerBusiness"])
        row["installation"]["applicationId"] = OTHER_ID
        return httpx2.Response(200, json={"data": [row], "page": {"nextCursor": None}}, headers={"x-request-id": TEST_REQUEST_ID})

    with httpx2.Client(transport=httpx2.MockTransport(respond)) as http:
        with InsideDMPlatform(api_key=APP_KEY, http_client=http, max_retries=0) as platform:
            platform._transport.application_id = TEST_ID
            with pytest.raises(InsideDMProtocolError):
                platform.businesses.list()
