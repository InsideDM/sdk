# Business SDK reference

[Start with a short task](../README.md), then use this reference for full input, permission, lifecycle and recovery details.

## Available operations

For n8n, use the [integration guide](n8n.md). With business usage.read,
usage.getLimits() returns the current native plan/version, agent places
(including 'all'), seats, soft monthly conversation allowance and included AI
allowance in INR paise strings. Grace expiry follows the native Free fallback.
These are current limits, not remaining quota, feature configuration or send
eligibility. For observed consumption, see the [usage reference](partner-reference.md).

| Resource | Methods |
| --- | --- |
| Workspace | `workspace.get()` |
| Software usage and limits | `usage.get({ from, to })`, `usage.getLimits()` |
| Templates | `templates.list(params)`, `templates.pages(params)`, `templates.iterate(params)` |
| Messaging setup | `messaging.getReadiness()`, `messaging.getConfiguration()` |
| Consent | `consents.get(contactId)`, `consents.recordMarketingOptIn(input)`, `consents.withdraw(input)` |
| Contacts | `contacts.create(input)`, `contacts.get(id)`, `contacts.list(params)`, `contacts.update(id, input)`, `contacts.attributes.update(id, input)`, `contacts.tags.replace(id, input)` |
| Conversations | `conversations.get(id)`, `conversations.list(params)` |
| Messages | `messages.get(id)`, `messages.send(input)`, `messages.preview(input)`, `conversations.messages.list(conversationId, params)` |
| Operations | `operations.get(id)`, `operations.lookup(originalKey)`, `operations.cancel(id, input)` |
| Published flows | `events.bindings.list/pages/iterate(params)`, `events.publish(input)`; recover with `operations.lookup({ kind: 'events.publish', idempotencyKey: eventId })` |
| Flow execution | `flows.runs.get(runId)` |
| Orders | `orders.get(id)`, `orders.list(params)` |
| Shipments | `shipments.get(id)`, `orders.shipments.list(orderId, params)` |

Every list also provides `pages()` and `iterate()` with the same arguments. Nested lists retain their parent ID as the first argument. List filters are typed and validated before any request. All methods call the canonical HTTP operations in [the included OpenAPI contract](../openapi/public-v1.yaml).

```ts
for await (const contact of insideDM.contacts.iterate(
  { channel: 'whatsapp', limit: 50 },
  { maxPages: 10, maxItems: 200 },
)) {
  await syncToYourCRM(contact);
}
```

Iterators fetch only as consumed, preserve the initial filters and limit, and stop at the requested bounds. `maxItems` may trim the final yielded page; its cursor remains the server's page cursor and does not resume inside that page. Without bounds, traversal continues until the server returns a null cursor. A cursor is opaque, tied to its workspace, filters and limit, and expires after 15 minutes. An expired cursor raises `invalid_cursor`; the SDK never silently restarts a traversal.

## Update a contact's display name

Use a key with `contacts.write` to correct a name. Names are trimmed and limited to 256 characters; `null` clears the name. Phone, email and provider identities require verification and cannot be reassigned through this method.

```ts
await insideDM.contacts.update(contactId, { displayName: 'Asha Sharma' },
  { idempotencyKey: 'crm/customer-123/name-v2' });
```

The result contains the contact ID, current display name and revision. Replaying the original input and key reads current values without overwriting a later edit. A changed intent with the same key conflicts. Revision is observational, without compare-and-set semantics. Keep your original key and intent for recovery across restarts; receipts last 30 days.

## Contact custom fields

Use a key granted `contacts.write`. The fields must already be declared in the dashboard. The SDK resolves the workspace automatically on its first write and uses the dashboard's existing endpoint and handler. The server must have shared writes configured before this method is available.

```ts
const result = await insideDM.contacts.attributes.update(contactId, {
  attributes: { loyalty_score: 0.75, preferred_size: null },
}, { idempotencyKey: 'crm/customer-123/fields-v4' });
```

Null clears a field; omitted fields stay unchanged. The result contains the contact ID, current custom fields and revision. Each logical call generates a new idempotency key unless you supply one. Retries preserve the same key and input. Success metadata includes `idempotencyKey`; errors expose it through the explicit `error.recovery` getter, excluded from default error logs. Persist your own key before a consequential workflow if recovery must survive a process restart.

Reuse the key with the original input after an uncertain response. Changed input returns `idempotency_conflict`. A replay rechecks current authority and reads current fields without applying the patch again. Receipts have the platform's 30-day retention; never recycle a key for another action. Automatic workspace discovery shares the write's total timeout budget.

## Send a notification

Use a key with `messages.send` and `operations.read`. Sending uses the same canonical message endpoint as UI replies, with a separate integration principal. Each organization has one WhatsApp account; the backend selects it automatically. An explicit approved template ID needs no SDK settings screen or default-account configuration.

To discover approved templates, grant `templates.read`. Their variables use exactly the keys returned by the catalog. `notificationSupported` identifies templates whose category and content shape are supported by this SDK's send method; approval and recipient eligibility are rechecked on send.

```ts
for await (const template of insideDM.templates.iterate({}, { maxPages: 10 })) {
  console.log(template.id, template.name, template.language,
    template.variables.map(variable => variable.key), template.notificationSupported);
}
```

Template lists use the same `list`, `pages` and `iterate` conventions as other resources, with a default page size of 25 and maximum of 100. An optional `conversationId` restricts discovery to that WhatsApp conversation's current connected account. The catalog includes approved templates that require unsupported media or variables, with `supported: false` and an explanation; authentication templates have `notificationSupported: false`. It reads the locally synchronized catalog, so sends still check the current authoritative template. No provider account identifiers or credentials are returned.

For account setup diagnostics, grant `messaging.read`:

```ts
const { data: readiness } = await insideDM.messaging.getReadiness();
console.log(readiness.accountReady, readiness.reasonCode);
```

`account_not_connected` needs WhatsApp connection setup; `account_paused` needs the account resumed; `credentials_unavailable` or `credentials_expired` needs reconnection. `account_unavailable` or `account_ambiguous` needs the account state reviewed by the platform. `textPurposeConfigured` only reports whether a merchant-managed text-purpose binding exists. A template notification needs no text-purpose binding. Readiness creates no settings, contacts, conversations or sends and does not probe the provider. Use `messages.preview(input)` to check a particular recipient and content.

To discover optional configured aliases and text-purpose binding names, grant `messaging.configuration.read`:

```ts
const { data: configuration } = await insideDM.messaging.getConfiguration();
console.log(configuration.value.templateAliases,
  configuration.value.textPurposeBindings,
  configuration.value.defaultTextPurposeBinding);
```

This uses the existing settings endpoint's restricted configuration view and returns no account choices, credentials or human role-management data. `version` is null for an unconfigured workspace; reading creates no settings. Reading an alias does not guarantee its template is still approved. An explicit approved template ID continues to need no configuration step.

```ts
const key = 'orders/order-123/ready'; // Persist before sending; use once per logical action.
const { data: operation } = await insideDM.messages.send({
  to: { phone: '+919800000099' },
  content: {
    type: 'template',
    template: { id: approvedTemplateId },
    variables: { name: 'Asha' },
  },
}, { idempotencyKey: key });

const { data: progress } = await insideDM.operations.get(operation.id);
// After a lost submission response, recover without submitting another message:
const recovered = await insideDM.operations.lookup(key);
```

Recipients accept exactly one phone in E.164 format, contact ID or conversation ID. Supported templates have text body variables and static headers/buttons; templates requiring media or dynamic header/button variables are refused. A configured template alias can replace the ID. Static templates may omit `variables`.

The SDK supplies the notification intent automatically; callers only provide the recipient and content. Explicit `intent: 'notification'` remains supported. The same input works with `messages.preview()` and `messages.send()`.

Text content is `{ type: 'text', text: 'Your support update' }`, at most 1,000 characters. It needs a merchant-managed purpose binding (service or marketing) and an open recipient window. WhatsApp resolves automatically; an existing Instagram conversation selects its connected account. The integration cannot manufacture an opt-in, reclassify marketing or act as a human inbox operator. Configuration refusals expose a fixed field and reason code through `error.problem.errors`, such as `purpose_binding_required` or `template_alias_unconfigured`.

`messages.preview(input)` observes current eligibility without creating a recipient, opening a conversation, reserving budget or sending. Sending rechecks consent, account readiness, the exact content, current key authority, window and promotional policy. Acceptance queues work; `succeeded` means provider submission, not customer delivery or reading. Delivery receipts belong to the resulting message resource and its separate read permission.

```ts
const current = await insideDM.operations.get(operation.id);
await insideDM.operations.cancel(operation.id, {
  expectedRevision: current.data.revision,
}, { idempotencyKey: 'orders/order-123/cancel-ready' });
```

Cancellation requires both scopes and the observed revision, and is allowed before provider sending begins. `requires_reconciliation`, `unknown` or `effects: 'unknown'` must never trigger an automatic replacement send. Timeouts retain the original request. Explicit provider refusals become failed operations; accepted receipts can repair the transcript without sending again. Operations belong to the creating integration's key lineage; routine rotation preserves that lineage. Terminal receipts retain their keys for 30 days; unresolved outcomes stay pinned. Never reuse an old key for a different logical action.

## Start a published flow from your business system

Configure, publish and activate a **from your own system** flow in the existing builder, with its start endpoint enabled. Discover its flow ID and published input requirements:

```ts
for await (const binding of insideDM.events.bindings.iterate({ limit: 25 })) {
  console.log(binding.id, binding.name, binding.fields, binding.endpointConfigured);
}
```

The catalog requires `events.write` and returns active published from-system flows.
`fields` describes mapped pointers within `properties`, with type and required flag;
customer identity fields are omitted because the SDK uses a known contact.
`endpointConfigured: false` needs the existing builder's start setup. No endpoint
URL, HMAC secret, graph or provider credential is returned. The publication ID is
a snapshot: intake rechecks current mappings and authority. Each page scans at
most ten publications and may be empty with a continuation cursor; the iterator
handles this. Keep the same limit while following a cursor.

Use the chosen flow ID as `binding` and supply an existing contact ID, for example
from `contacts.create()`. Arbitrary phone properties cannot identify a customer.

```ts
const { data: submission } = await insideDM.events.publish({
  id: 'orders/order-123/paid',
  binding: process.env.INSIDEDM_FLOW_ID!,
  subject: { contactId },
  properties: { order: { id: 'order-123', total: 499 } },
});

// Recover after a lost response, using the same original event ID.
const { data: current } = await insideDM.operations.lookup({
  kind: 'events.publish', idempotencyKey: 'orders/order-123/paid',
});

if (current.resource?.type === 'flow_run') {
  const { data: run } = await insideDM.flows.runs.get(current.resource.id);
  console.log(run.status); // running, waiting, completed, failed or cancelled
}
```

This needs `events.write`; operation reads need `operations.read`, and run reads need `flows.read`. The event ID is also its retry key: persist it in your own system and reuse it only with identical intent. Retries freeze the original request. `type` defaults to `flow.triggered`; this pilot does not accept arbitrary event types. Optional `occurredAt` must be a canonical UTC timestamp within the previous 24 hours or next five minutes at first acceptance; omission uses intake time. Properties are bounded to 32 KiB with six levels of nesting and 100 entries per container. Only published mappings are retained as flow inputs. Unmapped values are discarded.

HTTP 202 means the original start was retained. The event operation becomes `succeeded` with `phase: 'flow_started'` and a `flow_run` resource when the actual worker admits that start. Later flow effects, completion and customer delivery are separate. `operation.changed` reports publication progress through the existing webhook subscription. An uncertain outcome requires recovery, not a new event ID. Revision-checked cancellation uses `operations.cancel()` and succeeds only before the retained start is claimed; it cannot stop an already started flow.

`flows.runs.get()` needs `flows.read`, independently of write and operation-read scopes. It uses the existing dashboard run endpoint's progress view and returns only `id`, `flowId`, `status`, `startedAt` and `completedAt`. Business keys can read SDK-started runs from their own integration lineage, including after rotation removes write permission. Traces, inputs and raw failure messages are private. Reads depend on retained original event proof, normally available for 30 days after the event operation becomes terminal; erased or unavailable sources return `resource_not_found`. Flow completion alone does not establish customer delivery. This pilot has no flow-run change subscription; poll within your own bounded job or use business outcome events.

Revoking or expiring the original key, removing its scope, disabling the workspace or erasing the contact blocks fresh execution. A rotated key in the same lineage can continue only while its current grants permit it. The existing native endpoint HMAC secret remains independent. Existing governed HTTP nodes can call an n8n webhook during the flow; asynchronous external-job completion callbacks remain unavailable.

## Create a flow draft from a template

For slow external tasks, the [start-and-poll guide](n8n.md#run-a-longer-external-job)
includes a copyable durable backend receiver and worker with restart recovery.

Use `flows.deploy` for template discovery and draft imports. `flows.read` remains
the separate scope for this integration's flow-run progress. The same methods
work on `platform.forBusiness(businessId)` after merchant approval.

```ts
const { data: catalog } = await insideDM.flows.templates.catalog({ limit: 25 });
const template = catalog.templates.find(item => item.id === 'lead-capture');
if (!template) throw new Error('Template unavailable');
const { data: draft } = await insideDM.flows.templates.import(template.id, {
  version: template.version,
}, { idempotencyKey: 'client-123/lead-capture/v1' });
console.log(draft.recipeId, draft.status); // client-owned draft
```

Templates declare required `dependencySlots`. Bind each slot with a reviewed
client-owned endpoint reference from `catalog.dependencies`:
`bindings: { 'followup-endpoint': { endpointId, expectedRevision } }`.
The catalog returns IDs, display names and revisions; it never returns endpoint
URLs or credentials. Only eligible POST endpoints appear. Dependencies paginate;
pass `catalog.page.nextCursor` and the same limit while `hasMore` is true, including
after an empty filtered page. Availability can change between pages and imports.

The catalog offers the current version of each family; saved exact older source
versions remain resolvable. `governed-webhook-followup` version 2 preserves the
reviewed endpoint's full URL and follows the wait only after HTTP success.
Existing version 1 sources retain their `/automation` path and original digest;
upgrading requires a new source version, draft preview/update and native review.

Imports create drafts through the existing builder owner. Review and publish in
InsideDM before execution. Reuse the same key and exact version/bindings after a
lost response; matching retries return the original creation receipt without
overwriting merchant edits. `status: 'draft'` records the creation outcome, rather
than the flow's current publication state. Changed intent conflicts. Unsupported
versions, missing slots, foreign endpoints and stale revisions are refused.
Read the original source and current client edits after import:

```ts
const { data: deployment } = await insideDM.flows.deployments.get(draft.recipeId);
console.log(deployment.source.version, deployment.draft.state);
// unchanged, modified, missing or unavailable
console.log(deployment.flowStatus, deployment.publication.state);
// not_published, matches_managed_source, different or unavailable
```

Source metadata remains immutable when editable flow settings change. The read
compares actual graph content and does not return the graph or private endpoint
settings. Machines can read only their integration's imports; human business
editors retain ownership. A drift observation does not authorize an overwrite.
`flowStatus` reports the native lifecycle status. `publication.versionId` identifies
the current immutable publication, or is null when none exists. A publication
match means its normalized graph content matches the latest managed source; it
does not prove which source version caused publication, runtime eligibility or
customer delivery. `different` means the published graph differs, including when
a managed draft update awaits human publication. `unavailable` means the current
snapshot cannot be compared; do not treat it as a match. The read uses the same
flow owner as the builder and grants no publication authority. See [selected-client rollouts](blueprints.md#update-a-selected-group-of-clients);
embedded editing remains a separate capability.

## Create or find a phone contact

```ts
const { data: contact } = await insideDM.contacts.create({
  name: 'Asha',
  phone: '+6591234567',
}, { idempotencyKey: 'crm/customer-123/create' });
console.log(contact.contactId, contact.revision);
```

Use `contacts.write`. Supply one E.164 phone number, including the country code. The SDK supplies the channel and discovers the workspace automatically. A connected WhatsApp account is not required to create the phone record. No consent, conversation or message is created.

If the phone already belongs to a live contact in this workspace, that contact is reused. Only a missing name is filled; a supplied name never overwrites an existing one. The result contains an opaque contact ID and current revision, without the dashboard's private projection. Use the existing tag and custom-field operations separately. This method does not accept Instagram handles, sender controls, consent flags, tags or arbitrary profile fields.

Keep the same input and key to recover an uncertain result. Replay reads the original contact without reapplying old values; a later erasure, erasure request or merge returns not found instead of creating a replacement. Routine credential rotation preserves the receipt lineage. Receipts last 30 days; never recycle a key for a different action. The explicit `error.recovery` getter identifies `createContact` and its original key, without exposing the name or phone in default SDK error logs.

## Synchronize contact tags

Use `contacts.write` to replace a contact's complete tag list through the same owner as the contact editor:

```ts
const { data: contact } = await insideDM.contacts.tags.replace(contactId, {
  tags: ['vip', 'diwali-2026'],
}, { idempotencyKey: 'crm/customer-123/tag-change-456' });
console.log(contact.tags, contact.revision);
```

Tags are trimmed, lowercased, deduplicated and returned sorted. There are at most 50 input tags, each 1–256 characters. Invalid or oversized lists are refused. Pass `{ tags: [] }` to clear all tags. This method replaces the entire set, so include every tag you want to keep. Kept tags retain their original application history. Existing tag-based audiences may react through the normal automation policy.

Retries preserve the original body and key. A replay returns the current list without reapplying an older replacement over a later human or integration edit. A new logical replacement needs a new key. Receipts retain the platform's 30-day lifetime. After an uncertain response, repeat this method with the original input and key; the explicit `error.recovery` getter identifies `replaceContactTags`. Default error logs exclude tag values and recovery keys. The returned revision is an observation, not a compare-and-set condition.

## Read current messaging consent

Use a key granted `consents.read` to inspect a known contact:

```ts
const { data: consent } = await insideDM.consents.get(contactId);
for (const identity of consent.identities) {
  console.log(identity.channel, identity.handle, identity.purposes);
}
```

Each linked phone or Instagram identity has its own five purpose decisions. Missing decisions are `unknown` with `changedAt: null`; absence never grants permission. The response contains current register state, without history or consent quotations. It is an observation: `messages.preview()` and `messages.send()` still check current consent, account, session window and content policy. Erased, erasure-pending, merged and foreign contacts are not found. A contact with over 100 messaging identities is refused rather than silently truncated. Only the opaque contact ID enters the request URL.

## Record a customer's explicit request for offers

Use a key with `consents.write` and the ID of a retained inbound WhatsApp or Instagram message:

```ts
const { data: consent } = await insideDM.consents.recordMarketingOptIn({
  messageId: inboundMessageId,
}, { idempotencyKey: `offers-opt-in:${inboundMessageId}` });
```

The backend verifies a complete, unambiguous request to receive offers, the current customer's exact identity/account/conversation, the latest inbound message and its original provider timestamp within 24 hours. It accepts a narrow set of direct requests such as “Please send me your offers” or “I'd like offers from your shop.” Reported speech, quotations, ambiguous interest and a bare yes are refused; ask for a fresh clear request when evidence is insufficient. It preserves a live Instagram opt-in link's attribution. Stale or deleted evidence, inactive sources and older requests following a withdrawal cannot create a grant. Ineligible evidence returns `verification_failed`; missing, foreign or erased sources are not found.

This records marketing consent on that message's channel only. It accepts no quotation, purpose override, source or verification flag, and sends no welcome message. It can record the verified request in a human-managed active conversation without resuming automation. External form claims and grants for other purposes require their own proof owners and are not accepted here.

Repeat the same message ID and key after an uncertain response. Replay reads the current decision without reapplying an older grant, even after the original message's freshness window ends. A later withdrawal remains withdrawn. Keys expire after the standard 30-day receipt lifetime; never recycle them for another action. Retain your own key and intent for recovery across restarts.

## Synchronize a WhatsApp opt-out

Use a key granted `consents.write` to withdraw one messaging purpose from a CRM or another business system:

```ts
const { data: consent } = await insideDM.consents.withdraw({
  to: { phone: '+919800000099' },
  purpose: 'marketing',
}, { idempotencyKey: 'crm/customer-123/marketing-opt-out-456' });
console.log(consent.status, consent.changedAt);
```

The purpose can be `marketing`, `utility`, `service`, `loyalty` or `ad_measurement`. The method currently addresses WhatsApp by E.164 phone only. It uses the existing suppression register without creating a contact, conversation or send. It does not withdraw other purposes. It accepts no grant, verified-origin flag or consent quotation; opt-ins must arrive through an owner that verifies actual customer evidence.

Retries preserve the original body and key. Replays return the current register state without applying the old withdrawal again: if a later verified customer opt-in exists, the result can be `granted`. A new withdrawal is a new logical action and needs a new key. Receipts retain the platform's 30-day lifetime; never recycle keys for another action. After an uncertain response, retry this method with the original input and key. `operations.lookup()` is for message operations.

Withdrawal is synchronous and fences future provider admissions; a message whose provider submission already began may still complete. Mutation results include no recipient details. Audit attribution comes from the verified human or machine principal, and default SDK error logs exclude the recipient and recovery key.

## Results, errors and request controls

Detail results are `{ data, meta }`; lists add `page: { nextCursor }`. Metadata contains the server request ID, HTTP status, attempt count and parsed Retry-After. Money in minor units, revisions and message sequences remain strings to preserve precision. Absent values remain null. New enum values normalize to `unknown` where the contract allows it; additive response fields are discarded.

```ts
import { InsideDMApiError } from '@insidedm/sdk';

try {
  await insideDM.orders.list({}, { signal: AbortSignal.timeout(5_000) });
} catch (error) {
  if (error instanceof InsideDMApiError) {
    console.error(error.code, error.requestId);
    // error.problem explicitly exposes server details when needed.
  }
  throw error;
}
```

Default request budget: 20 seconds total, 10 seconds per attempt, two transient retries. Set `timeoutMs` (1–120000), `attemptTimeoutMs` (1–60000) and `maxRetries` (0–5) in the constructor or per request. Total time includes token acquisition, retries, Retry-After and response-body reads. Reads, previews and idempotent mutations retry transient network failures, timeouts and HTTP 408/429/500/502/503/504 when the server marks the problem retryable. Mutation retries preserve their original body and key. Platform business clients additionally permit one delegated-token refresh after `invalid_token`; validation, conflict and other authentication errors stop. Redirects are refused. Responses are bounded to 1 MiB.

Errors distinguish API, protocol, transport, timeout, cancellation and local configuration failures. Default error inspection and JSON serialization omit credentials, URLs, response bodies and raw causes. `error.problem` is an explicit opt-in to server-supplied details. A failed request carries no SDK-generated replacement for a missing server request ID.

Use `fetch` in the constructor to inject a compatible transport for tracing or tests. It receives the authorization header; treat that transport as trusted and keep its logs free of credentials.

## Receive webhooks

Pass the exact raw request bytes and `X-InsideDM-Signature` header. Capture raw bytes before a JSON body parser changes them.

```ts
import { constructWebhookEvent } from '@insidedm/sdk/webhooks';

const received = constructWebhookEvent({
  rawBody: new Uint8Array(await request.arrayBuffer()),
  signature: request.headers.get('x-insidedm-signature'),
  secret: process.env.INSIDEDM_WEBHOOK_SECRET!,
});

if (received.kind === 'verification') {
  return Response.json(received.response);
}
if (received.kind === 'event') {
  await durablyEnqueueOnce(received.event.id, received.event);
}
return new Response(null, { status: 204 });
```

The helper verifies HMAC before parsing, enforces a five-minute signature window and 64 KiB body limit, and handles endpoint verification proofs. During rotation, `secret` accepts the active and retiring secrets. `nowSeconds` is injectable for deterministic tests; `toleranceSeconds` may narrow the window to 1–300 seconds. Keep your receiver clock synchronized.

Select **Operation progress** in your existing webhook endpoint to opt into `operation.changed` version 2. It carries business/producer and operation identifiers, with an opaque revision. Existing resource and test events retain version 1 and the signature format stays the same. Correlate with your stored operation IDs, deduplicate the event ID durably, and fetch current progress using `insideDM.operations.get(event.resource.id)`. Your key can read only its own producer's operations; a business-wide endpoint may also receive other producers' signals. The helper never follows an event's `href`. Progress events can arrive out of order and do not imply customer delivery or read status. An unknown provider outcome remains unresolved and must not trigger a blind resend.

Events are notifications containing resource identifiers, not full records. Fetch current data with the SDK when needed; deletion events may refer to a resource that is no longer readable. Store the event ID durably to deduplicate processing. Automatic retries retain delivery identity; manual replay creates a new delivery linked to the original, while retaining the event ID. A valid unknown event type or version returns `kind: 'unknown'` with a minimal envelope for safe acknowledgement. The helper performs no HTTP fetches based on webhook content.

Select **Message delivery** to receive `message.delivery_changed` version 1 after a provider receipt changes the retained message facts. In your durable event worker:

```ts
if (event.type === 'message.delivery_changed') {
  const { data: message } = await insideDM.messages.get(event.resource.id);
  console.log(message.deliveryState); // sent, delivered, read, failed, pending or unknown
}
```

This read needs `messages.read`; configuring the subscription requires the existing message-export permission. Submission success remains separate from delivery. Duplicate provider callbacks do not create new events. Pending observations can coalesce to the latest retained state after an interruption, so fetch the current message and allow out-of-order notifications. Early receipts wait for actual accepted content before publishing. Events contain no recipient address, message text or provider ID and confer no read permission. A failure or missing receipt does not authorize an automatic resend.

Return a success status after durable acceptance. Signature or payload failures throw `InsideDMWebhookVerificationError`; map those to a suitable non-success response in your framework.

## Offline development

```ts
import { createTestClient } from '@insidedm/sdk/testing';

const insideDM = createTestClient();
const { data } = await insideDM.workspace.get();
```

This client returns deterministic synthetic data and has no network fallback. Use its `respond(request, defaultResponse)` option to simulate pages and failures. `createProblemResponse`, `createWebhookFixture`, `TEST_ID`, `TEST_REQUEST_ID` and `TEST_WEBHOOK_SECRET` support receiver and error-path tests. Resource IDs and request IDs have different formats; treat the returned request ID as a correlation value. Fixture credentials cannot authenticate a real workspace. The fixture client does not emulate business writes or server authorization.

For source builds and publication gates, see [PUBLICATION.md](../PUBLICATION.md).
