# SDK API reference

[Start with a short task](../README.md), then use this reference for full input, permission, lifecycle and recovery details.

The SDK connects to `https://api.insidedm.io` automatically. Configure your server
API key when creating the client; no base URL or WhatsApp account selection is
required. Use `@insidedm/sdk/testing` for offline exploration without service access.

## Available operations

For n8n, use the [integration guide](n8n.md). With business usage.read,
usage.getLimits() returns the current native plan/version, agent places
(including 'all'), seats, soft monthly conversation allowance and included AI
allowance in INR paise strings. Grace expiry follows the native Free fallback.
These are current limits, not remaining quota, feature configuration or send
eligibility. `usage.get({ from, to })` returns observed AI usage over a bounded
time window under the same scope; observations are provisional, not invoices.

| Resource | Methods |
| --- | --- |
| Workspace | `workspace.get()` |
| Software usage and limits | `usage.get({ from, to })`, `usage.getLimits()` |
| Templates | `templates.list(params)`, `templates.pages(params)`, `templates.iterate(params)` |
| Messaging setup | `messaging.getReadiness()`, `messaging.getConfiguration()`, `messaging.updateConfiguration()` |
| Business analytics | `analytics.get()` |
| Consent | `consents.get(contactId)`, `consents.recordMarketingOptIn(input)`, `consents.withdraw(input)` |
| Loyalty membership | `loyalty.members.get(contactId)` |
| Contacts | `contacts.create(input)`, `contacts.get(id)`, `contacts.list(params)`, `contacts.update(id, input)`, `contacts.fields.list()`, `contacts.fields.create(input)`, `contacts.fields.configureMemory(id, input)`, `contacts.fields.archive(id, input)`, `contacts.attributes.update(id, input)`, `contacts.tags.replace(id, input)` |
| Conversations | `conversations.get(id)`, `conversations.list(params)` |
| Messages | `messages.get(id)`, `messages.send(input)`, `messages.preview(input)`, `conversations.messages.list(conversationId, params)` |
| Operations | `operations.get(id)`, `operations.lookup(originalKey)`, `operations.cancel(id, input)` |
| Published flows | `events.bindings.list/pages/iterate(params)`, `events.publish(input)`; recover with `operations.lookup({ kind: 'events.publish', idempotencyKey: eventId })` |
| Flow execution | `flows.runs.list(...)`, `flows.runs.get(runId)` |
| Website import progress | `knowledge.runs.list/pages/iterate(params)`, `knowledge.runs.get(runId)` |
| Document identity and current version | `knowledge.get(options)` |
| Knowledge text and corrections | `knowledge.sections.list/pages/iterate(params)` |
| Website knowledge import | `knowledge.sources.importWebsite(input, options)` |
| Website knowledge removal | `knowledge.sources.removeWebsite({ url }, options)` |
| Registered note, document or website removal | `knowledge.sources.remove(sourceId, { expectedVersion }, options)` |
| Flow builder steps | `flows.steps.list()` |
| Saved connector blocks | `flows.blocks.list/pages/iterate(params)` |
| Orders | `orders.get(id)`, `orders.list(params)` |
| Shipments | `shipments.get(id)`, `orders.shipments.list(orderId, params)` |

Paginated lists also provide `pages()` and `iterate()` with the same arguments. Nested lists retain their parent ID as the first argument. List filters are typed and validated before any request. All methods call the canonical HTTP operations in [the included OpenAPI contract](../openapi/public-v1.yaml).

```ts
for await (const contact of insideDM.contacts.iterate(
  { channel: 'whatsapp', limit: 50 },
  { maxPages: 10, maxItems: 200 },
)) {
  await syncToYourCRM(contact);
}
```

Iterators fetch only as consumed, preserve the initial filters and limit, and stop at the requested bounds. `maxItems` may trim the final yielded page; its cursor remains the server's page cursor and does not resume inside that page. Without bounds, traversal continues until the server returns a null cursor. A cursor is opaque, tied to its workspace, filters and limit, and expires after 15 minutes. An expired cursor raises `invalid_cursor`; the SDK never silently restarts a traversal.

## Read a customer's loyalty membership

Use a contact ID from your workspace and the separate `loyalty.read` grant:

```ts
const { data: membership } = await insideDM.loyalty.members.get(contactId);
for (const wallet of membership.wallets) {
  console.log(wallet.wallet, wallet.spendable, wallet.pending, wallet.held);
}
console.log(membership.enrolled, membership.tier?.label, membership.openHoldCount);
```

The read uses the dashboard's native membership owner and balance formulas.
`wallet` is `points` or `stamps`; amounts are whole units. Held points are already
excluded from `spendable`, so do not subtract them again. `nextExpiry` reports the
native lot expiry and amount, not a guarantee that the amount will expire after
future purchases or redemptions. `observedAt` is the server's observation time;
this is a current read, not a balance reservation or a transaction quote.

A known customer who has not joined returns `enrolled: false`. An empty `wallets`
array means no wallet was reported; do not invent a zero balance. `preMember`
identifies pending pre-membership state. `joinedAt` is the native first-lot time
when available, not a verified enrollment timestamp. `tier` and its next tier
contain native IDs and labels only. Missing, erased, merged or other-workspace
customers return `resource_not_found`.

This scope releases no contact identity, reward codes, individual holds or ledger
history. It cannot enroll customers, spend rewards, authorize messaging or
establish marketing consent. Connected-user access also requires the user's
current `loyalty.view` permission.

## Inspect conversation control

Use `conversations.read` and the native inbox-view permission to inspect current
ownership and automation control through the same inbox owner as the dashboard:

```ts
const { data: control } = await insideDM.conversations.controls.get(conversationId);
console.log(control.owner, control.automation, control.snoozedUntil, control.handoff);
```

`lifecycle` preserves native open, waiting-customer, resolved, archived and spam
states. `automation.paused` reflects an explicit pause or human ownership; it is
separate from lifecycle, snoozing and current send eligibility. `handoff` reports
live status, request time, assignee and a closed `reasonCode`. This is the native
classification, such as `LOW_CONFIDENCE`, `MANUAL_APPROVAL` or `USER_REQUESTED`,
rather than a verified assertion about the customer. `UNKNOWN` withholds unsupported
or absent reasons. No transcript, handoff brief, agent
memory, provider identifier or credentials enter this view. The opaque `revision`
identifies the observation; reading it changes no control and resumes no work.

Read native control history to explain changes in who handles the conversation:

```ts
const { data: history } = await insideDM.conversations.controls.history(
  conversationId, { limit: 25 },
);
for (const event of history.events) {
  console.log(event.occurredAt, event.action, event.actorKind, event.via, event.reasonCode);
}
```

Events are newest first, ordered by event time and ID. Continue with
`{ limit: 25, cursor: history.page.nextCursor }` when the cursor is non-null.
Keep the same conversation and limit. The cursor fixes the original page's
cutoff; new events appear on a fresh walk. History covers the retained native
handoff, takeover, assignment, hand-back, held-reply dismissal and snooze ledger.
`held_reply_dismissed` with `via: 'dismiss_hold'` records dismissing an unsent draft
while preserving human ownership and the automation pause. `handed_back` records
release to AI. Handoff-request events
carry the native classification recorded at that time; other events have a null
reason. Treat suspected spam/scam/sentiment flags as classifications, not facts.
It is separate from
message delivery, orders and agent reasoning. Raw audit payloads, actor identities
and customer content are excluded. History and current control reads require
`conversations.read`; a past event is not proof of current ownership.

To take over as the connected user, read that revision and use a stable action key:

```ts
const { data: control } = await insideDM.conversations.controls.get(conversationId);
const { data: receipt } = await insideDM.conversations.controls.takeOver(
  conversationId,
  { expectedRevision: control.revision },
  { idempotencyKey: takeoverActionId },
);
console.log(receipt.changed, receipt.auditId);
```

This requires API-resource user access with `conversations.read` and
`conversations.takeover`, and all native inbox view/reply/assign/manage permissions.
API keys and installation credentials cannot impersonate a person. Taking over
pauses automation, assigns the open handoff and cancels waiting flows, including
when another teammate owns the chat. It sends no message and resumes no agent work.
Retry the identical input and original key after an uncertain result. The receipt
recovers the original acceptance even after later ownership changes; read
`controls.get` separately for current state. A new action needs a fresh revision
and key. A no-op preserves the conversation revision and reports `changed: false`.

Discover current assignment candidates with API-resource user access,
`conversations.read` and the native inbox-view/assignment permissions:

```ts
for await (const teammate of insideDM.conversations.assignees.iterate(
  { limit: 25 }, { maxItems: 100 },
)) {
  console.log(teammate.userId, teammate.displayName, teammate.isCurrentUser, teammate.canReply);
}
```

Only active members with non-deleted identities are returned. Login addresses,
roles and invitation details are excluded. Missing names display as “Teammate”.
Use `list()` for a page or `pages()` for lazy pages. Cursors bind the original
user/grant, workspace, scopes and limit. Candidate and reply facts are current
observations; a control action must recheck authority and membership itself.
Assign an unowned conversation or one you handle using a discovered teammate ID:

```ts
const { data: current } = await insideDM.conversations.controls.get(conversationId);
const { data: assigned } = await insideDM.conversations.controls.assign(
  conversationId,
  { assigneeUserId: supportUserId, expectedRevision: current.revision },
  { idempotencyKey: assignmentActionId },
);
console.log(assigned.assigneeUserId, assigned.auditId);
```

This requires user access with `conversations.read` and `conversations.assign`,
plus native inbox-view/assignment permissions. Use `assigneeUserId: null` to
return to the paused human queue. Assignment does not take a chat from another
teammate (`invalid_state`); an explicit takeover requires its own permissions.
Stale revisions return `revision_conflict`. Both actions pause automation,
align the open handoff and cancel waiting flows without sending or resuming.
Reuse the original target, revision and key after uncertainty. Recovery retains
the original acceptance even if the assignee later leaves; a new assignment
must use a currently active member. Read current control separately.

Put a conversation aside using the same 24-hour snooze as the dashboard:

```ts
const { data: current } = await insideDM.conversations.controls.get(conversationId);
const { data: snoozed } = await insideDM.conversations.controls.snooze(
  conversationId,
  { expectedRevision: current.revision },
  { idempotencyKey: snoozeActionId },
);
console.log(snoozed.snoozedUntil);
```

This needs user access with `conversations.read`, `conversations.snooze` and native
inbox view/reply/manage permissions. It pauses automation while preserving the
current owner and open handoff. Another teammate's conversation requires explicit
takeover. Retry the original revision and key after uncertainty to recover the
original expiry without extending it. A fresh snooze action starts a new 24-hour
period and needs a fresh observation and key.

`controls.clearSnooze(conversationId, { expectedRevision }, { idempotencyKey })`
clears only the snooze time. Read current control first. Clearing an already
cleared snooze is a no-op. Neither expiry nor clearing resumes automation, changes
ownership, closes a handoff or sends a message.

## Update a contact's display name

Use a key with `contacts.write` to correct a name. Names are trimmed and limited to 256 characters; `null` clears the name. Phone, email and provider identities require verification and cannot be reassigned through this method.

```ts
await insideDM.contacts.update(contactId, { displayName: 'Asha Sharma' },
  { idempotencyKey: 'crm/customer-123/name-v2' });
```

The result contains the contact ID, current display name and revision. Replaying the original input and key reads current values without overwriting a later edit. A changed intent with the same key conflicts. Revision is observational, without compare-and-set semantics. Keep your original key and intent for recovery across restarts; receipts last 30 days.

## Contact custom fields

Create a field when the configuration you need does not exist:

```ts
const { data: created } = await insideDM.contacts.fields.create(
  { label: 'Support tier', key: 'support_tier', type: 'text' },
  { idempotencyKey: createFieldActionId },
);
console.log(created.definition.id, created.definition.key);

await insideDM.contacts.attributes.update(
  contactId,
  { attributes: { [created.definition.key]: 'gold' } },
  { idempotencyKey: saveValueActionId },
);
```

Creation requires `contacts.write` and the native contact-edit permission.
Catalog discovery separately requires `contacts.read` and contact-view permission.
Field types are `text`, `number`, `boolean` and `date`; omitted type defaults to
text. Supply a stable lowercase key for integrations, or omit it to let the
native owner derive one from the label. Non-Latin labels receive distinct stable
generated keys. Keys/types are permanent and archived keys cannot be reused.
The native limit is 500 live fields. Creation leaves agent memory off, stores no
customer values and sends no message.

Retain the original creation input and action key. A retry recovers the original
definition/audit/request even after memory changes, archival or same-lineage API
key rotation, without restoring an archived field or changing later policy.
Omitted/default text type, null/omitted key and trimmed labels normalize before
intent matching. A different input under the same action key conflicts. Read
`contacts.fields.list()` separately for current availability and memory policy.

Archive a field using the observed configuration version:

```ts
const { data: fields } = await insideDM.contacts.fields.list();
const { data: archived } = await insideDM.contacts.fields.archive(
  created.definition.id,
  { expectedVersion: fields.version },
  { idempotencyKey: archiveFieldActionId },
);
console.log(archived.archived, archived.appliedVersion);
```

Archival requires `contacts.write` and native contact-edit permission. It removes
the field from the active catalog and future agent-memory lookups, keeping
contact values and permanently reserving the key. Any field-configuration edit
invalidates the observed catalog version (`revision_conflict`). Creation receipts
also contain their original `appliedVersion`; it is usable only while no later
configuration edit has occurred. A catalog version of zero means the area has
not been configured yet.

After uncertainty, retry the identical field ID, original expectedVersion and
original key. Recovery retains the accepted audit/version after later edits,
without applying another archival or changing current configuration. A new
archive action needs a fresh observation and key. This method configures fields;
it does not erase customer values or send a message.

Configure agent memory with an explicit flag and the current catalog version:

```ts
const { data: catalog } = await insideDM.contacts.fields.list();
const { data: memory } = await insideDM.contacts.fields.configureMemory(fieldId, {
  expectedVersion: catalog.version,
  agentMayRemember: true,
  agentHint: 'Preferred fit',
}, { idempotencyKey: memoryActionId });
console.log(memory.changed, memory.definition.agentMayRemember);
```

Requires `contacts.write` and native contact-edit permission. Omit `agentHint` to
preserve it; `null` clears it. Whitespace is normalized. The native personal-data
policy checks the permanent key, label and hint before allowing memory. A policy
refusal is `invalid_request` with `problem.errors` containing the fixed field
`request.agentMayRemember` and reason `agent_memory_forbidden`. A configured flag
does not override runtime memory policy. No-op saves retain the version. Existing
customer values remain; this does not backfill values or send messages.

After uncertainty, reuse the identical field ID, original version, flag/hint and
action key. Recovery returns original acceptance after later edits or archival
without reapplying it. Read the catalog separately for current configuration.

Use a `contacts.write` credential and keys from the field catalog or creation
receipt to update values. The SDK resolves the workspace and uses the native
value owner:

```ts
const result = await insideDM.contacts.attributes.update(contactId, {
  attributes: { loyalty_score: 0.75, preferred_size: null },
}, { idempotencyKey: 'crm/customer-123/fields-v4' });
```

Discover configured field keys and types with `contacts.fields.list()` first.
Its `data.definitions` contains all live definitions (up to the business limit),
including labels and agent-memory settings; it contains no customer values.

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

When using `messaging.updateConfiguration`, supply the complete configuration and
its observed `expectedVersion`. Identical effective settings retain that version;
empty defaults do not create a settings row. A stale version still conflicts
even when the supplied values match today's settings. After an uncertain result,
reuse the exact input/key to observe current state without overwriting later
edits. A successful unchanged response does not establish template eligibility.

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

`flows.runs.get()` needs `flows.read`, independently of write and operation-read scopes. It uses the existing dashboard run endpoint's progress view and returns only `id`, `flowId`, `status`, `startedAt` and `completedAt`. Connected-user access with current `flows.view` permission can inspect native workspace flow executions, including runs started outside the SDK. Business keys and installation delegations remain limited to their own retained event-started runs; same-lineage key rotation does not require keeping write permission. These integration reads depend on retained original event proof, normally available for 30 days after the event operation becomes terminal. User reads follow native run retention. Traces, inputs, contact identity and raw failure messages are excluded. Erased, expired or unavailable resources return `resource_not_found`. A status read resumes nothing and does not establish future eligibility or customer delivery. This pilot has no flow-run change subscription; poll within your own bounded job or use business outcome events.

Revoking or expiring the original key, removing its scope, disabling the workspace or erasing the contact blocks fresh execution. A rotated key in the same lineage can continue only while its current grants permit it. The existing native endpoint HMAC secret remains independent. Existing governed HTTP nodes can call an n8n webhook during the flow; asynchronous external-job completion callbacks remain unavailable.

## Find recent flow executions

```ts
const page = await insideDM.flows.runs.list({ status: 'failed', limit: 25 });
for (const run of page.data) console.log(run.flowId, run.id, run.status);

// Traverse lazily, with an explicit bound on work.
for await (const run of insideDM.flows.runs.iterate(
  { flowId, limit: 25 }, { maxPages: 4, maxItems: 100 },
)) console.log(run.id, run.status);
```

Both listing and detail reads require `flows.read`. Connected users see native
workspace flow executions under their current `flows.view` permission. API keys
and installation credentials see only runs started by their own integration,
with retained original event/command proof. No caller-supplied scope flag can
change this visibility. Same-lineage key rotation preserves a cursor only when
its effective scopes remain the same.

Use `page.page.nextCursor` with the same `flowId`, `status` and `limit`, or use
the shared `pages()` / `iterate()` helpers. Cursors expire after fifteen minutes.
Integration pages scan at most ten candidates, within the requested limit.
Their cursor positions are sealed, including candidates excluded by final proof.
An empty page can have a continuation when a candidate's source proof is no
longer available. The helpers continue through such pages within your bounds.
Pages are ordered by native start time and run ID. The original cutoff excludes
later starts; statuses, permissions, source retention and contact visibility
remain live. A status-filtered walk is not a frozen snapshot or change feed.

Only IDs, status and start/completion times are returned. Draft tests, refusal
records, non-flow agents, expired runs and erased/merged contacts are omitted.
Listing does not resume a run, prove delivery or explain the cause of a failure.

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
flow owner as the builder and grants no publication authority.

## Discover built-in flow steps

```ts
const { data: catalog } = await insideDM.flows.steps.list();
for (const step of catalog.steps) {
  console.log(step.type, step.version, step.channels.whatsapp, step.effect, step.ready);
}
```

Requires `flows.read` and native flow-view permission. This is the complete
built-in step/bundle catalog from the dashboard palette and native block specs.
It excludes app/custom blocks, connector settings and credentials. `effect`
includes a bundle's strongest effect, so payment collection reports `money_in`.
`billableMessages` describes potential native message billing; it is not a quote.
`ready` means the engine implements the step, not that this business may execute
or publish it. Use the typed draft definition and native validation, simulation
and publication checks. Discovery does not run a flow or call a provider.

## Reuse saved connector blocks

```ts
for await (const block of insideDM.flows.blocks.iterate({ limit: 25 })) {
  console.log(block.name, block.type, block.flowId, block.versionId);
}
```

Requires `flows.read` and native flow-view permission. This discovers saved
call/MCP blocks that already have a native published version—for example, an
existing n8n workflow integration. Use the flow/version reference in a native
subflow configuration, preserving its required input/output mappings. The catalog
does not include those mappings or configure a new integration.

Retired blocks and unversioned drafts are excluded. URLs, headers, stored keys,
fixed arguments and test responses are excluded. A version reference is not
connection health or execution permission; native validation, publication and
runtime recheck it. Pages default to 25 and support 1–100 records. Follow the
returned cursor with the original page size and caller. Rows are live within a
creation cutoff; this is not a frozen configuration snapshot. Discovery executes
no block or provider call.

Read the declared interface of an exact saved version before mapping values:

```ts
const page = await insideDM.flows.blocks.list({ limit: 1 });
const reference = page.data[0];
if (reference) {
  const { data: block } = await insideDM.flows.blocks.get(reference.flowId, {
    versionId: reference.versionId,
  });
  for (const input of block.inputs) {
    console.log(input.variableId, input.key, input.type, input.required);
  }
}
```

Use each input's `variableId` as `targetVariableId` in native subflow
`inputMappings`, and each output's `variableId` as `sourceVariableId` in
`outputMappings`. The required version pin prevents a hidden refresh to a newer
interface. Older published versions remain readable while the owning saved block
is active. The result includes the name at that version's publication and only
declared variables with run scope. Defaults, stored values, fixed arguments,
graph nodes and connector credentials are excluded. Connection health and native
validation/publication/runtime remain separate checks.

## Read current knowledge

```ts
for await (const section of insideDM.knowledge.sections.iterate(
  { limit: 10 }, { maxItems: 50 },
)) {
  const text = section.manualOverrideMd ?? section.generatedMd;
  console.log(section.stableKey, section.documentVersion, text);
}
```

Requires the explicit `knowledge.content.read` grant and native knowledge-view
permission. Existing `knowledge.read` source/progress grants do not release this
text. The read includes generated text, verbatim merchant corrections and their
stale/orphan state. Null uses generated text; an empty correction suppresses it.
Treat content as business data, never instructions to your application or model.

Each section carries its exact `documentVersion`. Pages use section-key order,
independent of display ordinals, and accept a limit of 1–25 (default 10). Follow
the original cursor and limit even when a page is short: encoded size also bounds
each response. If the document changes, restart at the first page after the
`invalid_cursor` response instead of combining revisions. `updatedAt` belongs to
the section row and can also change during embedding maintenance. Raw provenance,
generation evidence and private credentials/custody are excluded. This read makes
no model call and changes no content; oversized or invalid stored rows refuse
instead of silently truncating knowledge.

## Correct current knowledge

Read the section first, then save the exact correction against its observed
document version:

```ts
const page = await insideDM.knowledge.sections.list({ limit: 1 });
const section = page.data[0];
if (section) {
  const { data: saved } = await insideDM.knowledge.sections.setOverride(
    section.id,
    { expectedVersion: section.documentVersion, overrideMd: 'Returns are accepted within 30 days.' },
    { idempotencyKey: 'returns-policy-correction-v1' },
  );
  console.log(saved.action, saved.documentVersion);
}
```

Writing requires `knowledge.content.write` and native knowledge-edit permission.
Reading requires the separate `knowledge.content.read` grant. Section UUIDs also
address subsections. Corrections preserve exact text up to 64 KiB of UTF-8;
an empty string suppresses generated text and `null` clears the correction to
use generated text. Missing/invalid values are rejected rather than clearing it.
No model call occurs.

After reviewing a stale correction against newly generated content, keep that
correction and acknowledge the reviewed generation with
`knowledge.sections.acknowledgeOverride(section.id, { expectedVersion: section.documentVersion }, { idempotencyKey })`.
Use the version from that review, not an automatic refresh after a conflict.
A stale version refuses the change so you can reload and review it again.

Save the original section ID, version, exact text/null and intent key before a
write. Retry those same inputs after uncertainty. The receipt records the
original applied version and contains no knowledge text; it is not current state.
Recovery preserves later human edits and cannot acknowledge a later generation,
even if the original section has since been removed. A deliberately new change
uses a new key. Both commands retain the actual user or integration actor.

## Remove a registered knowledge source

```ts
const sources = await insideDM.knowledge.sources.list({ kind: 'document', status: 'active' });
const { data: knowledge } = await insideDM.knowledge.get();
const source = sources.data[0];
if (source) {
  const { data: removed } = await insideDM.knowledge.sources.remove(
    source.id,
    { expectedVersion: knowledge.version },
    { idempotencyKey: 'document-removal-v1' },
  );
  console.log(removed.documentVersion, removed.sectionsRequiringRefresh);
}
```

Use the registered source UUID and the current knowledge document version. Source
and version discovery require `knowledge.read`; section text requires `knowledge.content.read`.
Removal itself requires `knowledge.write` and native knowledge-edit permission,
without granting either read scope. It works for notes, documents and websites.
Generated claims are dropped or hidden atomically; merchant corrections (including
subsections), catalog products and history survive. Remaining-source sections need
a later explicit refresh. Website imports are cancelled; no model or provider call
occurs. An unused source can be removed without changing the document version.

Keep the exact original source ID, version and action key after uncertainty.
Replay returns the original receipt before checking current source/version, so it
cannot remove a later reactivation. Changed intent under the same key conflicts;
fresh changes use a newly reviewed version and key. A fresh removal of an inactive
source refuses. Receipts contain counts/identity without source labels or text.
`knowledge.get()` returns the version even when there are no sections. A missing
document has a null ID and version zero; an existing empty document can have a
nonzero version. `sectionCount` counts retained rows, including children and hidden
or corrected rows; it does not prove answer coverage or import completion.

## Remove website knowledge

```ts
const { data: removed } = await insideDM.knowledge.sources.removeWebsite({
  url: 'https://your-store.example/',
}, { idempotencyKey: 'website-removal-v1' });

console.log(removed.outcome, removed.cancelledImports);
console.log(removed.sectionsRequiringRefresh);
```

Requires `knowledge.write` and native knowledge-edit permission. The native owner
atomically drops or hides generated claims from this website and cancels its
pending/running imports, including a first import without a registered source.
Merchant corrections (including subsections), catalog products and import history
are retained. Hidden sections supported by other sources need a later explicit
import to regenerate them; removal makes no website or model call. Section counts
refer to top-level sections. `already_removed` means this request found no active
website or import to change.

After uncertainty, retry the same URL and key. The original receipt is historical
and cannot remove a later re-add; current source/run state is read separately.
A deliberately new removal uses a new key. An unfinished two-phase removal returns
`invalid_state` instead of pretending it completed.

## Import or refresh website knowledge

```ts
const { data: accepted } = await insideDM.knowledge.sources.importWebsite({
  url: 'https://your-store.example/',
  maxPages: 25,
}, { idempotencyKey: 'website-import-launch-v1' });

const { data: progress } = await insideDM.knowledge.runs.get(accepted.ingestionRunId);
console.log(progress.status);
```

Import requires `knowledge.write` and native knowledge-edit permission. Progress
reads separately require `knowledge.read`. Omit `maxPages` for the bounded default
of 100. The native import acquires website/catalog data, generates knowledge and
embeds changed content under the existing AI-credit policy. It can replace
generated website content and update products; native merchant overrides and
note/document protections remain enforced. The original authority stays attached
through acquisition, funding and commits.

The returned `status: 'accepted'` is durable acceptance, not successful indexing
or answer coverage. A first import may not yet appear in the source registry.
Reuse the original URL, page budget and key after uncertainty; the same intent
returns its original run/audit/request IDs even after completion or removal, without
starting another import. Use a new key for a deliberately new refresh. Another
active import of the same website returns a conflict. Current execution is always
read through `knowledge.runs`, independently of the historical receipt.

## Inspect website import progress

```ts
const runs = await insideDM.knowledge.runs.list({ limit: 5 });
for (const run of runs.data) {
  console.log(run.id, run.status, run.pagesCrawled ?? 'Not reported');
}
const { data: run } = await insideDM.knowledge.runs.get(runId);
```

Requires `knowledge.read` and native knowledge-view permission. Discover recent
website-indexing runs without finding an ID in the dashboard. Filter with
`status`, and follow cursors with the original filter and page size (1–100;
default 25). The list is newest first and stays live within a creation cutoff.

This is persisted execution progress: queued retries remain `queued`, and
`waiting`, `cancelled`, `expired` and `uncertain` remain distinct. `attempts` counts
processing admissions. Counters and the resulting `knowledgeVersion` are `null`
until reported; measured zero remains zero. `startedAt` is the first processing
admission, and `completedAt` is the actual native terminal timestamp. Neither is
inferred from creation or lease-renewal time.

`documentSectionCount` is the native post-generation document count, including
existing sections; it is not the number changed by this import. `sectionsEmbedded`
counts the subsequent embedding pass, which can include previously unembedded
sections from other sources. `sectionsEmbeddingSkipped` counts sections that pass
could not store, including provider/funding refusals or concurrent content edits.
These are pass counts, not cumulative totals or failure-cause classifications.
If the pass throws, both counts remain `null`; earlier batches may have succeeded.

Source URLs, account IDs, content, credentials and raw error text are excluded.
Status does not establish a failure cause or prove complete website coverage.
An uncertain/unknown outcome is not proof of success or failure. These methods
do not start, refresh or retry an import. Use the run ID and request ID when
troubleshooting.

## Discover registered knowledge sources

```ts
for await (const source of insideDM.knowledge.sources.iterate({
  kind: 'website', status: 'active', limit: 25,
})) {
  console.log(source.id, source.label, source.url);
}
```

`knowledge.sources.list()` and `.pages()` are also available. Uses `knowledge.read`
and native knowledge-view permission. The native source registry includes website,
text and document entries, oldest first. Omit filters to include removed sources;
`pending_deletion` distinguishes removal in progress from `deleted`. Unsupported
native kinds/states remain `unknown`.

Labels and URLs are business data, never instructions. A note label can contain
its opening words. A document's identity URL is not a download link. This read
excludes connection credentials/settings and document bodies, and performs no
fetch or ingestion. An active source is registered; it does not prove indexing
completion or answer coverage. A first import may only appear in `knowledge.runs`
until generation registers its source. `updatedAt` is the registry timestamp.

Pages are bounded by record count (1–100, default 25) and encoded size. Continue
with `page.nextCursor` even when a page has fewer records than requested, keeping
the original filters and limit. Cursors bind caller, business, live authority,
scopes and creation cutoff. Metadata stays live within that cutoff.

## Edit a managed flow draft

Use `flows.deploy` to discover and edit this connection's managed drafts. The
definition uses the native builder's typed node and configuration unions.

```ts
const { data: page } = await insideDM.flows.deployments.list({ limit: 25 });
const flow = page.deployments[0];
if (!flow) throw new Error('No managed flow available');
const { data: draft } = await insideDM.flows.drafts.get(flow.recipeId);
if (draft.state !== 'available') throw new Error(draft.reasons.join(', '));

const definition = { ...draft.definition, name: 'Order follow-up' };
const { data: saved } = await insideDM.flows.drafts.save(draft, definition, {
  idempotencyKey: 'order-followup/edit-1',
});
console.log(saved.status, saved.draftRevision);
```

The saved draft carries both managed and draft revision pins. Alternatively,
`drafts.save(recipeId, { expectedDeploymentRevision, expectedDraftRevision,
definition }, options)` accepts explicitly observed pins. Neither form fetches
new pins or merges concurrent edits. After a revision conflict, read the current
draft and reconcile the intended change before creating a new intent.

Reuse the original input and key after an uncertain result. Matching retries
return the original receipt, even after later edits; use `drafts.get` to observe
current state. Saving retains visual layout, clears tested coverage when content
changes and leaves publication untouched. An unchanged definition retains its
revision and coverage. Only complete, native-valid, credential-free definitions
are accepted as replacement content; incomplete builder formats return unavailable. Definitions are
bounded at 512,000 UTF-8 bytes. Native review, regression and publication gates
still apply to making a saved draft live.

If a native draft is unavailable because its saved content is invalid or its
fingerprint is damaged, its positive revision pins can still support an explicit
replacement using a known valid definition. Use the recipe-and-pins form for
that intentional repair. The saved-draft helper requires an available draft;
neither form silently converts an unsupported builder format or reads withheld
content. A repair advances the revision and clears stale coverage, including
when the repaired definition restores an earlier fingerprint.

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
