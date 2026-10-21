# Verify insideDM webhooks

Pass the original HTTP body bytes and `x-insidedm-signature` header to the verifier.
Do this before parsing JSON. Use the endpoint's signing secret, held on your server.

```python
from insidedm.webhooks import construct_webhook_event

verified = construct_webhook_event(
    raw_body=raw_body,
    signature=request_headers.get("x-insidedm-signature"),
    secret=signing_secret,
)

if verified.kind == "verification":
    # Return this dictionary as the HTTP JSON response to the endpoint challenge.
    response_body = verified.response.model_dump(by_alias=True, exclude_unset=True)
elif verified.kind == "event":
    event = verified.event
    # Validate the expected business/application, then durably deduplicate event.id
    # and enqueue accepted work before acknowledging the request.
else:
    # A correctly signed future event version: acknowledge and ignore safely.
    pass
```

Map `InsideDMWebhookVerificationError` to a rejected HTTP request. Do not return
private diagnostics to the sender. The timestamp window defaults to 300 seconds;
shorter windows use `tolerance_seconds`. Keep your server clock synchronized.

During secret rotation, `secret=[current_secret, previous_secret]` accepts two
secrets for an intentional overlap. Remove the old secret after that overlap.
Signature verification authenticates the sender and exact bytes. Your application
still owns tenant attribution, durable event deduplication, queueing and handler
retries. The SDK does not keep an in-memory deduplication cache pretending to be
durable storage.

Use `insidedm.testing.create_webhook_fixture()` for signed synthetic fixtures.
