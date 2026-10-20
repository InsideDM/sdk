# Connect customer-owned n8n workflows

Use n8n's built-in HTTP Request, Webhook, Header Auth and Respond to Webhook nodes. No custom node or additional SDK configuration is required. These recipes use existing InsideDM endpoints. The bridge example is tested with signed fixtures; an actual n8n workflow import and live deployment remain unverified.

## Send a notification

Store `Authorization: Bearer <business-key>` in an n8n Header Auth credential, outside workflow JSON. Discover the organization with `GET /v1/workspace`, then POST to `/api/v1/inbox/{businessId}/messages`:

```json
{"intent":"notification","to":{"phone":"+919876543210"},"content":{"type":"template","template":{"id":"approved-template-id"},"variables":{"customer_name":"Asha"}}}
```

Set `Content-Type: application/json` and an `Idempotency-Key` derived from the originating business action. Keep the same key and body on retry, including manual workflow reruns. An execution ID that changes on rerun cannot identify the original intent. Use the operation lookup API after an uncertain answer. A successful response queues an operation; delivery remains separate. The organization supplies its existing WhatsApp account automatically. Template approval, notification purpose, consent and readiness still apply. See the README's notification and recovery examples.

## Start a published flow

POST `/api/v1/flows/{businessId}/events` using an `events.write` key:

```json
{"id":"orders/order-123/paid","binding":"published-flow-uuid","subject":{"contactId":"existing-contact-uuid"},"properties":{"order":{"id":"order-123","total":499}}}
```

Use the same stable event ID as the `Idempotency-Key`. Configure a published **from your own system** flow and its property mappings first. The subject must be a known contact. This starts that published flow; it cannot resume an arbitrary paused run. Inspect the returned operation and its authorized run reference for progress.

## Use n8n inside a flow

1. Publish an n8n POST Webhook with Header Auth. Copy its displayed **Production URL**; test URLs expire.
2. Register that HTTPS URL, matching auth header and secret through InsideDM's existing endpoint setup. Reference it from the flow HTTP action.
3. Configure **Using Respond to Webhook** and return a small JSON object on every successful path, for example `{"eligible":true,"reference":"quote-123"}`. Map only declared response fields into the flow.
4. Keep the work within the action's timeout: default 10 seconds, maximum 30 seconds. Requests are limited to 64 KiB and responses to 256 KiB. Redirects and private/reserved addresses are refused.

Enable POST/PATCH retries only after implementing durable receiver deduplication and result recovery. A normal n8n Webhook does not provide that contract. The production engine retains one idempotency key per flow-node visit across retries and changes it on a later visit. Header Auth authenticates access; it does not deduplicate effects. Work exceeding the synchronous deadline needs the still-unimplemented governed async callback/continuation capability. An immediate acknowledgement cannot later supply synchronous response mappings.

## Receive resource events

Use `InsideDM → backend durable inbox → private n8n production Webhook`. The backend verifies exact bytes with `constructWebhookEvent` and answers verification challenges. n8n Code cannot read stored Header Auth credentials, so direct HMAC verification requires an independently protected secret channel. Do not hardcode signing secrets in Code or store them in item data.

The public source kit includes [`examples/n8nResourceBridge.mjs`](../examples/n8nResourceBridge.mjs), a Fetch Request/Response adapter. Copy it into your backend and configure:

```js
const receive = createN8nResourceBridge({
  receiverId: savedEndpointOrSubscriptionId,
  identity: { businessId: savedBusinessId }, // partner: { applicationId: savedApplicationId }
  secret: signingSecretsFromYourSecretStore, // current, optionally retiring
  accept: job => durableInbox.accept(job),
});
```

Mount it on a dedicated POST route before any JSON body parser. Recreate the handler when signing-secret configuration changes. The adapter enforces raw-body bounds, verification, configured receiver/identity, safe responses and a deterministic event key/digest. It returns 202 only after `accept` reports durable insertion or a matching duplicate. It is not a database, dispatcher or complete deployed bridge.

Your `accept` implementation must atomically insert an inbox row and dispatch intent with a unique `job.key`; bind that key to `job.digest`. Return `inserted`, `duplicate`, `conflict` or `refused`. Database outages must throw. For partners, validate the saved authenticated client mapping and exact original `job.application.installationId/authorityVersion`; signed business IDs alone do not authorize client access. Keep the immutable original context in the queued job.

The worker must recheck current authority for that original installation epoch before each dispatch or resource hydration, then call the configured n8n Production URL using a separate Header Auth credential, a deadline and no redirects. Do not copy the InsideDM signature to a different body or put secrets in queued item data. Use durable downstream deduplication too: crashes between n8n execution and acknowledgement can cause a repeat. Reconcile uncertain effects when the destination cannot deduplicate. Retention, erasure, logging and failure alerts remain the deploying backend's responsibilities.

Keep a partner's application key on its backend. Prefer that backend performing API calls with `platform.forBusiness(savedBusinessId)` after separate merchant approval; never save the master application key in customer workflows. A fresh approval must not revive an old queued event.

Official setup references: [HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/), [Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/), [Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/), [Code credential restriction](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/common-issues/).
