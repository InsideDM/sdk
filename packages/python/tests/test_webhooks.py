import json

import pytest

from insidedm import InsideDMWebhookVerificationError
from insidedm.testing import TEST_ID, create_webhook_fixture
from insidedm.webhooks import construct_webhook_event


def test_signature_checks_original_bytes_rotation_and_unknown_versions():
    fixture = create_webhook_fixture(timestamp=1000)
    verified = construct_webhook_event(raw_body=fixture.raw_body, signature=fixture.signature,
                                      secret=["whsec_" + "B" * 42 + "A", fixture.secret], now_seconds=1000)
    assert verified.kind == "event"
    with pytest.raises(InsideDMWebhookVerificationError):
        construct_webhook_event(raw_body=fixture.raw_body + b" ", signature=fixture.signature,
                                secret=fixture.secret, now_seconds=1000)
    with pytest.raises(InsideDMWebhookVerificationError):
        construct_webhook_event(raw_body=fixture.raw_body, signature=fixture.signature,
                                secret=fixture.secret, now_seconds=1301)
    future = create_webhook_fixture({"id": TEST_ID, "type": "future.event", "version": 99}, timestamp=1000)
    assert construct_webhook_event(raw_body=future.raw_body, signature=future.signature,
                                   secret=future.secret, now_seconds=1000).kind == "unknown"
