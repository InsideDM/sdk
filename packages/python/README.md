# insideDM Python SDK

Typed WhatsApp messaging, customer data and workflow automation for Python,
from [insideDM](https://insidedm.io).

The official Python SDK implements the same reviewed business and application
API contract as the Node SDK, with native synchronous and asyncio clients.
Version `0.1.0a0` is an alpha for pre-production integration. Hosted API and
provider availability are separate from package installation.

Install the official alpha from PyPI:

```sh
python -m pip install insidedm==0.1.0a0
```

For unreleased changes or a development checkout, use the
[source installation guide](CONTRIBUTING.md). Registry availability is tracked in
the [repository overview](https://github.com/InsideDM/sdk#choose-your-sdk).

## Configuration and first notification

Use Python 3.11+ and a scoped server key from your insideDM workspace. The SDK
always connects to `https://api.insidedm.io`; your organization has one WhatsApp
account, resolved by the backend. No endpoint or account selector is required.

```python
import os
from insidedm import InsideDM

with InsideDM(api_key=os.environ["INSIDEDM_API_KEY"]) as client:
    result = client.messages.send(
        to={"phone": "+919800000099"},
        content={
            "type": "template",
            "template": {"id": os.environ["INSIDEDM_TEMPLATE_ID"]},
            "variables": {"name": "Asha"},
        },
        idempotency_key="orders/order-123/shipped",
    )
    print(result.data.id, result.data.state, result.meta.request_id)
```

Use an approved template, your actual variable names and an authorized customer.
Submission requires `messages.send`; tracking requires `operations.read`.
Acceptance is separate from provider submission and customer delivery.

Native asyncio uses `AsyncInsideDM` with the same resources and methods:

```python
from insidedm import AsyncInsideDM

async def inspect_notification(api_key: str, operation_id: str) -> None:
    async with AsyncInsideDM(api_key=api_key) as client:
        result = await client.operations.get(operation_id)
        print(result.data.state, result.meta.request_id)
```

Keep a client for your process/async application lifespan, or use its context
manager. Close it with `close()` or `aclose()`. Injected HTTPX2 clients remain
owned by their caller. An async client belongs to one event loop.

If your application already manages OAuth, use the optional
[user access-token provider](docs/user-access.md) for supported business reads.

## What you can build

| Task | Python interface |
| --- | --- |
| Check WhatsApp setup and approved templates | `messaging.get_readiness()`, `messaging.get_configuration()`, `templates.list()` |
| Inspect a notification before sending | `messages.preview(to=..., content=...)` |
| Send and track a notification | `messages.send(...)`, `operations.get(operation_id)`, `messages.get(message_id)` |
| Recover an uncertain submission | `operations.lookup(kind="messages.send", idempotency_key=...)` |
| Synchronize customer context | `contacts.create(...)`, `contacts.update(...)`, `contacts.tags.replace(...)`, `contacts.attributes.update(...)` |
| Read conversations and commerce context | `conversations.list()`, `conversations.messages.list(conversation_id)`, `orders.list()`, `orders.shipments.list(order_id)` |
| Respect consent | `consents.get(contact_id=...)`, `consents.withdraw(...)`, `consents.record_marketing_opt_in(message_id=...)` |
| Start an existing published flow | `events.bindings.list()`, `events.publish(...)`, `flows.runs.get(run_id)` |
| Find recent flow executions | `flows.runs.list(status="failed")`, `flows.runs.iter_items(max_pages=4)` |
| Discover and edit managed drafts | `flows.deployments.list()`, `flows.drafts.get(recipe_id)`, `flows.drafts.save(draft, definition, ...)` |
| Inspect software usage and limits | `usage.get(from_=..., to=...)`, `usage.get_limits()` |
| Read a customer's loyalty membership | `loyalty.members.get(contact_id)` |
| Verify signed updates | `insidedm.webhooks.construct_webhook_event(...)` |

The [complete API reference](docs/api-reference.md) includes flow templates,
saved-source draft updates and application resources. The SDK uses the same
backend capabilities as the dashboard. It does not add flow publication authority
or bypass business permissions. Marketing opt-in records require existing inbound
customer evidence; they cannot manufacture consent.

With connected-user access, `flows.runs.get(run_id)` reads native workspace flow
execution status under `flows.read` and the user's current `flows.view`
permission. Server keys and installation delegations read only their own retained
event-started runs. The result contains IDs, status and start/completion times;
it excludes traces, inputs, customer identity and raw failures. Reading does not
resume a flow or prove customer delivery.

Find recent executions with the same collection syntax as contacts and orders:

```python
page = client.flows.runs.list(status="failed", limit=25)
for run in page.data:
    print(run.id, run.flow_id, run.status)

for run in client.flows.runs.iter_items(limit=25, max_pages=4, max_items=100):
    print(run.id, run.status)
```

Async clients expose `await client.flows.runs.list(...)` and
`async for run in client.flows.runs.iter_items(...)`. Optional `flow_id` and
`status` filter the results. Connected users see permitted workspace flow runs;
server integrations see only their own retained event-started runs. Every page
rechecks current authority and visibility. Continue with `page.page.next_cursor`
and the same filters and limit, or use `iter_pages()` / `iter_items()`.
Cursors expire after fifteen minutes. Integration pages scan at most ten
candidates, within the requested limit. Empty continuation pages are valid when
original source proof disappears. The initial time cutoff excludes later starts;
statuses and visibility remain live, so pagination is not an audit snapshot or
change feed. Reads return no traces or customer inputs and perform no resume.

## Loyalty membership

With a separate `loyalty.read` grant, inspect current membership and native wallet
balances for a contact in your workspace. Sync and async clients share the same
method; async callers use `await`.

```python
with InsideDM(api_key=os.environ["INSIDEDM_API_KEY"]) as client:
    membership = client.loyalty.members.get(contact_id).data
    for wallet in membership.wallets:
        print(wallet.wallet, wallet.spendable, wallet.pending, wallet.held)
    print(membership.enrolled, membership.open_hold_count)
```

Held points are already excluded from `spendable`; do not subtract them again.
An empty wallet list means none was reported. A known nonmember is distinct from
a missing, erased or merged customer, which returns `resource_not_found`.
`observed_at` is a current observation, not a reservation; `joined_at` is the
native first-lot time when available. This read provides tier labels and next
reported expiry, without customer identity, reward codes or ledger history.
It cannot enroll, redeem or establish consent. Connected users also need their
current `loyalty.view` permission.

## Customers and automation

```python
with InsideDM(api_key=os.environ["INSIDEDM_API_KEY"]) as client:
    customer = client.contacts.create(name="Asha", phone="+919800000099")
    client.contacts.tags.replace(customer.data.contact_id, tags=["vip", "repeat-buyer"])

    for contact in client.contacts.iter_items(limit=50, max_items=100):
        print(contact.id)
```

An event runs an event binding configured against a published flow in insideDM:

```python
with InsideDM(api_key=os.environ["INSIDEDM_API_KEY"]) as client:
    result = client.events.publish(
        id="orders/order-123/paid",
        binding=os.environ["INSIDEDM_EVENT_BINDING_ID"],
        subject={"contact_id": os.environ["INSIDEDM_CONTACT_ID"]},
        properties={"orderId": "order-123", "total": 1499},
    )
    print(result.data.id, result.meta.request_id)
```

Event `id` is the durable intent key; do not supply a second `idempotency_key`.
Inspect the binding's declared inputs and scopes before publishing. Acceptance
of an event and completion of the resulting flow are separate stages. Use n8n
through your server or an authenticated HTTP bridge; keep SDK keys in server
credentials. The flow builder remains the owner of native conversation behavior.

## Conversation control

Read the current native owner, pause, snooze and handoff with
`conversations.read` and the native inbox-view permission:

```python
control = client.conversations.controls.get(conversation_id).data
print(control.owner, control.automation, control.snoozed_until, control.handoff)
# On AsyncInsideDM: await client.conversations.controls.get(conversation_id)
```

This observation uses the existing inbox owner. It changes no control, resumes
no work and does not establish sending eligibility. Transcripts, handoff briefs,
agent memory and provider identifiers are excluded.

With API-resource user access, take over as the actual connected user:

```python
control = client.conversations.controls.get(conversation_id).data
receipt = client.conversations.controls.take_over(
    conversation_id,
    expected_revision=control.revision,
    idempotency_key=takeover_action_id,
).data
print(receipt.changed, receipt.audit_id)
# On AsyncInsideDM: await client.conversations.controls.take_over(...)
```

Requires `conversations.read`, `conversations.takeover` and native inbox
view/reply/assign/manage permissions. API keys cannot represent a user. This
pauses automation, takes ownership from the agent or another teammate, assigns
the open handoff and cancels waiting flows. It sends no reply and never resumes
the agent. After uncertainty, retry the identical revision and original key.
The receipt retains the original acceptance after later changes; read control
state separately. A new action needs a new revision and key. A no-op reports
`changed=False` without changing the conversation revision.

Discover active assignment candidates using API-resource user access,
`conversations.read` and native inbox-view/assignment permissions:

```python
for teammate in client.conversations.assignees.iter_items(limit=25, max_items=100):
    print(teammate.user_id, teammate.display_name, teammate.is_current_user, teammate.can_reply)
# AsyncInsideDM supports async for with the same iter_items() method.
```

`list()` returns one page; `iter_pages()` traverses pages lazily. Signed cursors
bind the original user/grant, workspace, scopes and page limit. Inactive and
deleted identities, login addresses, roles and invitation details are excluded.
These are current candidates, not authorization to assign or send.

To assign an unowned conversation or one you handle:

```python
current = client.conversations.controls.get(conversation_id).data
assigned = client.conversations.controls.assign(
    conversation_id,
    assignee_user_id=support_user_id,
    expected_revision=current.revision,
    idempotency_key=assignment_action_id,
).data
print(assigned.assignee_user_id, assigned.audit_id)
```

Requires user access with `conversations.read`, `conversations.assign` and native
inbox-view/assignment permissions. `assignee_user_id=None` returns to the paused
human queue. Another teammate's ownership returns `invalid_state`; takeover is
an explicit separate act. Stale revisions return `revision_conflict`. This
aligns the handoff and cancels waiting flows without sending or resuming.
After uncertainty, reuse the original target, revision and key. Recovery retains
original acceptance even after that teammate leaves. New assignments must use
active members. AsyncInsideDM exposes the same `assign()` method with `await`.

Snooze a conversation for the dashboard's native 24-hour duration:

```python
current = client.conversations.controls.get(conversation_id).data
snoozed = client.conversations.controls.snooze(
    conversation_id,
    expected_revision=current.revision,
    idempotency_key=snooze_action_id,
).data
print(snoozed.snoozed_until)
```

Requires user access with `conversations.read`, `conversations.snooze` and native
inbox view/reply/manage permissions. Snoozing pauses automation while keeping the
current owner and handoff. Another teammate's conversation requires explicit
takeover. Retry the original revision and key after uncertainty: recovery returns
the original expiry without extending it. A new snooze needs a fresh revision
and key.

`client.conversations.controls.clear_snooze(conversation_id,
expected_revision=current.revision, idempotency_key=clear_action_id)` clears only
the snooze time; read control first. It preserves pause, ownership and handoff.
Clearing an already cleared snooze is a no-op. Clearing or expiry never hands
back to AI or sends a message. Both methods also support `await` on AsyncInsideDM.

Read one page of retained native control history:

```python
history = client.conversations.controls.history(conversation_id, limit=25).data
for event in history.events:
    print(event.occurred_at, event.action, event.actor_kind, event.via, event.reason_code)
```

Continue with `cursor=history.page.next_cursor` and the same conversation/limit
while the cursor is not None. Events are newest first, with native event ID as
the timestamp tie-breaker. A cursor fixes the first page's cutoff; fresh events
appear on a new walk. Requires `conversations.read`. This is retained native
handoff/takeover/assignment/hand-back/held-reply-dismissal/snooze evidence, separate from current
ownership, message delivery, orders or agent reasoning. It excludes customer
content, raw audit payloads and actor identities. Handoff-request events carry
the native reason_code recorded at that time; other events have None. Current
control.handoff also carries reason_code. Codes such as LOW_CONFIDENCE,
MANUAL_APPROVAL and USER_REQUESTED explain the native classification. UNKNOWN
withholds absent/unsupported reasons. Suspected scam/spam/sentiment flags are
classifications, not verified facts about the customer. AsyncInsideDM exposes the same
`history()` method with `await`.
`held_reply_dismissed` with `via="dismiss_hold"` records dismissing an unsent draft
while preserving human ownership and the automation pause. `handed_back` records
release to AI.

## Create custom contact fields

```python
created = client.contacts.fields.create(
    label="Support tier",
    key="support_tier",
    type="text",
    idempotency_key=create_field_action_id,
).data
client.contacts.attributes.update(
    contact_id,
    attributes={created.definition.key: "gold"},
    idempotency_key=save_value_action_id,
)
```

Creation requires `contacts.write` and native contact-edit permission. Discover
current definitions using `client.contacts.fields.list()` with `contacts.read`
and contact-view permission. Types are text, number, boolean and date; omitted
type defaults to text. Explicit lowercase keys are recommended for integrations;
otherwise the native owner derives a stable key, including for non-Latin labels.
Keys/types are permanent and archived keys cannot be reused. Up to 500 live
fields are allowed. Creation leaves agent memory off and stores no customer
value or outbound message.

Reuse the original input/action key after uncertainty. Recovery retains original
definition/audit/request after archival, memory edits or same-lineage API-key
rotation, preserving later changes. Omitted/default text type, null/omitted key
and trimmed labels normalize before intent matching. Read the catalog separately
for current availability and policy. AsyncInsideDM exposes the same create()
method with await. Creation cannot enable agent memory.

Archive a field at its observed configuration version:

```python
fields = client.contacts.fields.list().data
archived = client.contacts.fields.archive(
    created.definition.id,
    expected_version=fields.version,
    idempotency_key=archive_field_action_id,
).data
print(archived.archived, archived.applied_version)
```

Requires `contacts.write` and native contact-edit permission. Archival removes the
field from active configuration and future memory lookups, keeping stored contact
values and permanently reserving its key. Any field-configuration edit makes the
observed version stale (`revision_conflict`). Creation receipts also retain their
original applied_version; it is usable only until another configuration edit.
Zero catalog version means no configuration exists yet. After uncertainty, reuse
the original field ID, expected_version and action key; recovery retains original
acceptance after later edits without another mutation. A new action needs a fresh
observation and key. Both clients support archive(); use await on AsyncInsideDM.
Configure agent memory with an explicit flag and the current catalog version:

```python
catalog = client.contacts.fields.list().data
memory = client.contacts.fields.configure_memory(
    field_id,
    expected_version=catalog.version,
    agent_may_remember=True,
    agent_hint="Preferred fit",
    idempotency_key=memory_action_id,
).data
print(memory.changed, memory.definition.agent_may_remember)
```

Both sync and async clients support this method; use `await` with `AsyncInsideDM`.
Requires `contacts.write` and native contact-edit permission. Omit `agent_hint` to
preserve it; `None` clears it. Whitespace is normalized. The native personal-data
policy checks the permanent key, label and hint. Policy refusal is
`invalid_request` with `error.problem["errors"]` containing field
`request.agentMayRemember` and reason `agent_memory_forbidden`. A configured flag
does not override runtime memory policy. No-op saves retain the version. Existing
customer values remain; this does not backfill values or send messages.
After uncertainty, retry the identical field ID, original version, flag/hint and
action key. Recovery returns original acceptance after later edits or archival
without reapplying it. Read the catalog separately for current configuration.

## Discover built-in flow steps

```python
catalog = client.flows.steps.list().data
for step in catalog.steps:
    print(step.type, step.version, step.channels.whatsapp, step.effect, step.ready)
```

Use `await client.flows.steps.list()` with `AsyncInsideDM`. Requires `flows.read`
and native flow-view permission. The complete built-in step/bundle catalog comes
from the native builder and block specs; it excludes app/custom blocks, connector
settings and credentials. Effects include a bundle's strongest effect, so payment
collection reports `money_in`. `billable_messages` describes potential billing,
not a quote. `ready` means engine availability, not business eligibility or
publication permission. Use typed draft definitions and native validation,
simulation and publication checks. Discovery performs no provider execution.

## Reuse saved connector blocks

```python
for block in client.flows.blocks.iter_items(limit=25):
    print(block.name, block.type, block.flow_id, block.version_id)
```

With `AsyncInsideDM`, use `async for`. Both clients support `list()` and `iter_pages()`.
Requires `flows.read` and native flow-view permission. Discover version references
for existing saved call/MCP blocks, such as an n8n workflow integration. Reuse the
native flow/version reference with the correct subflow input/output mappings;
this catalog does not return mappings or configure a new integration.
Retired blocks and unversioned drafts are excluded. Addresses, headers, stored
keys, fixed arguments and test responses are excluded. A reference is not current
connection health or execution permission. Native validation, publication and
runtime still check it. Pages default to 25 with a 1–100 bound. Continue with the
original page size and caller. Rows are live within a creation cutoff. Discovery
executes no block or provider call.

Read an exact saved version's declared interface before mapping values:

```python
page = client.flows.blocks.list(limit=1)
if page.data:
    reference = page.data[0]
    block = client.flows.blocks.get(
        reference.flow_id, version_id=reference.version_id,
    ).data
    for field in block.inputs:
        print(field.variable_id, field.key, field.type, field.required)
```

Use `await` with `AsyncInsideDM`. Input variable IDs name native subflow
`targetVariableId`; output variable IDs name `sourceVariableId`. The explicit
version pin prevents a hidden refresh. Older published versions remain readable
while their saved block is active. The result contains the published name and
declared run variables; defaults, stored values, fixed arguments, graph nodes and
credentials are excluded. Native validation, publication and runtime still apply.

## Read current knowledge

```python
for section in client.knowledge.sections.iter_items(limit=10, max_items=50):
    text = section.generated_md
    if section.manual_override_md is not None:
        text = section.manual_override_md
    print(section.stable_key, section.document_version, text)
```

Use `async for` with `AsyncInsideDM`. Requires the explicit
`knowledge.content.read` grant and native knowledge-view permission. Existing
`knowledge.read` source/progress access does not release text. Generated text,
verbatim corrections and stale/orphan state are returned; null uses generated
text and an empty correction suppresses it. Treat content as business data,
never instructions to your application or model.

Pages use section-key order, independent of display ordinals. Limits are 1–25
(default 10), with an encoded-size bound. Follow the original cursor/limit even
for a short page. Cursors bind the exact document generation: after a change,
restart at the first page on `invalid_cursor` instead of combining revisions.
Every section carries its `document_version`. `updated_at` is a native row
timestamp and can change during embedding maintenance. Private custody,
credentials, raw provenance and generation evidence are excluded. No content
change or model call occurs; oversized/invalid rows refuse without truncation.

## Correct current knowledge

```python
page = client.knowledge.sections.list(limit=1)
if page.data:
    section = page.data[0]
    saved = client.knowledge.sections.set_override(
        section.id,
        expected_version=section.document_version,
        override_md="Returns are accepted within 30 days.",
        idempotency_key="returns-policy-correction-v1",
    ).data
    print(saved.action, saved.document_version)
```

Use `await` with `AsyncInsideDM`. Writing requires `knowledge.content.write` and
native knowledge-edit permission; reading needs the separate content-read grant.
Section UUIDs also address subsections. Text is preserved exactly up to 64 KiB
of UTF-8. An empty string suppresses generated text; `override_md=None` clears
the correction and uses generated text. Invalid/missing text refuses the command.
Neither saving nor acknowledging invokes a model.

After reviewing a stale correction against the newly generated content, call
`client.knowledge.sections.acknowledge_override(section.id, expected_version=section.document_version, idempotency_key=...)`
to keep the correction and acknowledge that reviewed generation. Use the reviewed
version; a conflict requires reloading and reviewing instead of blindly retrying
with a newer version.

Retain the original section ID, version, exact text/None and key before writing.
After uncertainty, retry those exact inputs. Receipts contain the original applied
version and no knowledge text; they are historical, not current state. Recovery
preserves later human edits, cannot acknowledge a later generation and works
after section removal. A deliberately new change uses a new key. The native
owner retains the actual user or integration actor.

## Remove a registered knowledge source

```python
sources = client.knowledge.sources.list(kind="document", status="active")
knowledge = client.knowledge.get().data
if sources.data:
    removed = client.knowledge.sources.remove(
        sources.data[0].id,
        expected_version=knowledge.version,
        idempotency_key="document-removal-v1",
    ).data
    print(removed.document_version, removed.sections_requiring_refresh)
```

Use `await` with `AsyncInsideDM`. The registered source UUID can name a note,
document or website. Removal requires `knowledge.write` and native knowledge-edit
permission; source discovery and content reading retain their separate grants.
The native version fence prevents overwriting newer knowledge. Generated claims
are dropped or hidden atomically while corrections, catalog products and history
survive. Hidden sections with other sources need an explicit refresh. Website
imports are cancelled; no model/provider call occurs. Removing an unused source
can leave the document version unchanged.

Retry the exact original source ID, version and key after uncertainty. Historical
recovery preserves a later reactivation; changed intent/key reuse conflicts.
Fresh removal of an inactive source refuses. Receipts contain counts and identity
without source text. `client.knowledge.get()` reads bounded document metadata under
`knowledge.read`, including the version when there are no sections. A missing
document has `id=None`, `version=0` and `section_count=0`; an existing empty document
can have a nonzero version. Counts include children and hidden/corrected rows and
do not establish answer coverage or import completion.

## Remove website knowledge

```python
removed = client.knowledge.sources.remove_website(
    url="https://your-store.example/",
    idempotency_key="website-removal-v1",
).data
print(removed.outcome, removed.cancelled_imports)
print(removed.sections_requiring_refresh)
```

Use `await` with `AsyncInsideDM`. Requires `knowledge.write` and native
knowledge-edit permission. The native owner atomically drops or hides generated
claims and cancels pending/running imports, including an unregistered first
import. Merchant corrections (including subsections), catalog products and import
history survive. Section counts refer to top-level sections. Hidden sections
supported by other sources need a later explicit import to regenerate them;
removal makes no website or model call. `already_removed` means no active website
or import needed changing.

Retain the original URL and key after uncertainty. A retry returns the historical
receipt and cannot remove a later re-add; read current source/run state separately.
A deliberately new removal uses a new key. An unfinished two-phase removal
returns `invalid_state` instead of reporting completion.

## Import or refresh website knowledge

```python
accepted = client.knowledge.sources.import_website(
    url="https://your-store.example/",
    max_pages=25,
    idempotency_key="website-import-launch-v1",
).data
progress = client.knowledge.runs.get(accepted.ingestion_run_id).data
print(progress.status)
```

Use `await` with `AsyncInsideDM`. Import requires `knowledge.write` and native
knowledge-edit permission; progress reads require `knowledge.read`. Omit
`max_pages` for the bounded default of 100. Native crawling, catalog updates,
generation and embeddings use available AI credits and retain original caller
authority. Generated website content and products can change; native merchant
overrides and note/document protections remain enforced.

`accepted` records durable acceptance, not successful indexing. Retain the same
URL, page budget and key after uncertainty: replay returns the original run,
audit and request IDs, including after completion or removal, without another
import. Use a new key for a deliberately new refresh. Another active import of
the same website conflicts. Read `knowledge.runs` separately for current execution;
a first pending import may not yet have a registered source.

## Inspect website import progress

```python
for run in client.knowledge.runs.iter_items(limit=25, max_items=10):
    print(run.id, run.status, run.pages_crawled)
run = client.knowledge.runs.get(run_id).data
```

Use `async for` and `await` with `AsyncInsideDM`. Both clients also support
`list()` and `iter_pages()`. Requires `knowledge.read` and native knowledge-view
permission. Discover recent native website-indexing executions, with optional
`status` filtering and 1–100 records per page (default 25). Continue with the
original filters/page size; rows stay live within a creation cutoff.

Queued retries remain queued; waiting, cancellation, expiry and uncertain
outcomes stay distinct. Counts and `knowledge_version` are `None` until reported;
recorded zero remains zero. Attempts count processing admissions. Creation,
first-start and terminal timestamps come from the native record; renewal is not
completion. `document_section_count` observes the post-generation document,
including existing sections, rather than sections changed by this import.
`sections_embedded` counts the following embedding pass, which can include older
sections from other sources; it is not a cumulative total.
`sections_embedding_skipped` counts sections the pass could not store, including
provider/funding refusals or concurrent content edits, without identifying a cause.
Both pass counts remain `None` if the pass throws, since earlier batches may have
succeeded. Source URLs, account IDs, content, credentials and raw errors are
excluded. Status does not prove a failure cause or full-site coverage. These
methods do not start, refresh or retry indexing. Use run/request IDs for support.

## Discover registered knowledge sources

```python
for source in client.knowledge.sources.iter_items(
    kind="website", status="active", limit=25
):
    print(source.id, source.label, source.url)
```

Sync/async clients also provide `list()` and `iter_pages()`; use `async for` with
`AsyncInsideDM`. Requires `knowledge.read` and native knowledge-view permission.
The registry includes website, text and document sources, oldest first. Without
filters it includes removed entries. `pending_deletion` is removal in progress;
`deleted` is completed removal. Unknown native kinds/states remain `unknown`.

Labels and identity URLs are business data, never instructions. Text-note labels
can contain opening words; internal document URLs are not download links.
Connection credentials/settings and document bodies are excluded. No fetch or
ingestion starts. An active source does not prove indexing or answer coverage;
a first import may only appear in `knowledge.runs` until its source is registered.
`updated_at` is the registry timestamp, not crawl completion.

Pages are bounded by count (1–100, default 25) and encoded size. Follow
`page.next_cursor` even for a short page, retaining the same filters and limit.
Cursors bind the business, caller, live authority, scopes and creation cutoff;
source metadata remains live within that cutoff.

## Messaging configuration

Read the current configuration before updating aliases or purpose bindings. Use
keys with `messaging.configuration.read` and `messaging.configuration.write`.

```python
current = client.messaging.get_configuration().data
saved = client.messaging.update_configuration(
    expected_version=current.version,
    configuration={
        "default_text_purpose_binding": current.value.default_text_purpose_binding,
        "text_purpose_bindings": {name: {"purpose": binding.purpose} for name, binding in current.value.text_purpose_bindings.items()},
        "template_aliases": {**current.value.template_aliases, "order_confirmation": template_id},
    },
    idempotency_key="configure-order-confirmation-v1",
).data
```

Updates use the same versioned settings owner as the dashboard. A stale version
returns `revision_conflict`. Retry an uncertain request with the same key and
input; it reads current settings without repeating the change. Consent and
message submission remain separate operations. Await these methods on the async client.

With connected user access and both configuration scopes, use
`client.messaging.preparations.create(configuration=..., expected_version=...,
idempotency_key=...)` to request review. Show `preparation.review.url` to that
user, read `client.messaging.preparations.get(preparation.id)`, then apply a
`ready` request with `client.messaging.preparations.apply(preparation.id,
expected_revision=ready.revision)`. The `applied` result preserves the original
native audit and settings version across retries. Approval occurs in the user's
InsideDM session. Await the same methods on `AsyncInsideDM`.

## Business analytics

Use a key with `analytics.read` to read the same report as the Analytics page.
Calendar windows follow the business timezone; custom dates are inclusive.

```python
report = client.analytics.get(channel="whatsapp", range="month").data
print(report.window, report.kpis, report.reply_times)

# On AsyncInsideDM:
report = (await async_client.analytics.get(range="custom", start="2026-10-01", end="2026-10-15")).data
```

Unavailable comparisons include their reason. Missing measures remain `None`.

## Errors and recovery

```python
from insidedm import InsideDMAPIError, InsideDMTransportError

try:
    with InsideDM(api_key=os.environ["INSIDEDM_API_KEY"]) as client:
        result = client.operations.lookup(
            kind="messages.send", idempotency_key="orders/order-123/shipped"
        )
except InsideDMAPIError as error:
    print(error.code, error.status, error.request_id)
except InsideDMTransportError as error:
    print(error.code, error.retryable)
```

`InsideDMConfigurationError` identifies invalid local input before I/O;
`InsideDMProtocolError` rejects malformed or mismatched responses. Standard error
text and result representations exclude bodies, keys and private setup links.
Explicit `error.problem`, `error.recovery` and model serialization may contain
sensitive data; keep them out of ordinary logs.

On a lost write response, look up the saved intent key before deciding whether to
retry. `error.recovery` exposes the operation and captured key for supported
writes. Reuse the same logical key and identical input; do not generate a new key
for each attempt. A new business action needs a new key. `operations.cancel()`
requests cancellation only where the backend permits it; it cannot recall a
message already submitted to a provider.

## Explore without API access

```python
from insidedm.testing import create_test_client

with create_test_client() as demo:
    workspace = demo.workspace.get()
    print(workspace.data.id)
```

Offline clients use synthetic contract fixtures and cannot reach the network.
They exercise real SDK methods, not WhatsApp delivery or a hosted sandbox. Supply
an explicit `respond` fixture for complex application and flow scenarios. Native
async fixtures use `create_async_test_client()`.

## Request behavior

Optional request controls use seconds: `timeout_seconds=20`,
`attempt_timeout_seconds=10`, `max_retries=2` (at most five retries). Retries reuse
the captured body and intent key. Persist your own logical key before a write
when recovery must survive a process restart. Reads do not accept write keys.

Retries apply to recognized transient network/API failures. Errors from local
HTTP hooks or adapters are non-retryable `http_client_error` failures, with safe
diagnostics. Inspect `error.retryable` when deciding your application's next step.

The async total deadline covers discovery, HTTP I/O and retry waits. The sync
client shares the same logical budget and caps blocking I/O timeouts and body
reads to the remaining budget. An operating-system DNS call or custom sync
transport cannot be forcibly interrupted; the sync timeout is not an absolute
wall-clock guarantee. There are no hidden request threads.

For paginated collections, `list()` reads one page. `iter_pages()` and `iter_items()` fetch lazily; use
`max_pages`/`max_items` or stop iteration to bound work. Empty continuation pages
are valid. Expired or repeated cursors are errors rather than silent restarts.

Python field names use `snake_case`, including `result.meta.request_id` and
`result.page.next_cursor`. Dictionary keys belonging to your own template
variables, custom fields and event payloads are preserved exactly. Omitted
optional fields stay absent; explicit `None` is sent as JSON null only where
the operation permits it.

Typed request dictionaries and response models are available through
`from insidedm.types import inputs, responses`. SDK calls infer their result types.
Responses expose snake_case attributes, and `.model_dump(by_alias=True,
exclude_unset=True)` produces wire field names when storing a source or preview.
Ordinary customers do not need to construct response models.

See [webhook verification](docs/webhooks.md), the [API reference](docs/api-reference.md),
[release notes](CHANGELOG.md), [contributing](CONTRIBUTING.md) and
[publishing](PUBLICATION.md).

Copyable [sync/async notifications](examples/notifications.py) and
[customer synchronization and flow events](examples/customer_context.py) show the
same typed interface in ordinary server functions.

## About insideDM

[insideDM](https://insidedm.io) connects
[WhatsApp messaging](https://insidedm.io/whatsapp),
[Instagram conversations](https://insidedm.io/instagram) and business automation.
The SDK uses existing flows and business configuration from the dashboard.
Package installation is separate from hosted API and provider availability.

[Source and issues](https://github.com/InsideDM/sdk) · [MIT license](https://github.com/InsideDM/sdk/blob/main/LICENSE)
