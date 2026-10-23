# Access approved by an InsideDM user

Use `accessToken` when your application already manages OAuth authorization for
an InsideDM user. Authorize the API resource `https://api.insidedm.io`. The SDK
continues to use its managed API endpoint and discovers the approved business.

```ts
import { InsideDM } from '@insidedm/sdk';

const client = new InsideDM({
  accessToken: process.env.INSIDEDM_ACCESS_TOKEN!,
});

const { data: business } = await client.workspace.get();
const contacts = await client.contacts.list({ limit: 25 });
```

For a long-lived client, provide a function that reads your OAuth manager's
current access token:

```ts
import { InsideDM } from '@insidedm/sdk';

let currentApiToken = process.env.INSIDEDM_ACCESS_TOKEN!;
// Your OAuth manager updates this value after refreshing the same connection.
const client = new InsideDM({ accessToken: () => currentApiToken });
```

An async provider receives a typed `AccessTokenRequest`: operation, HTTP method,
route, exact serialized body, retry key, discovered business/grant and
`AbortSignal`. Use its signal for network work. Provider execution shares the
request's timeout; failures expose a fixed configuration error, without the
provider's exception text. A provider runs for every attempt, so reuse your
OAuth manager's cached access token and serialize refreshes there.

Each SDK client stays with its first discovered business and grant. Refreshing
that connection preserves the binding. Create a separate client for another
authorized connection. The API checks those expectations before commands run;
a provider cannot silently move a command to a different business.

Current user-access reads cover workspace discovery, contacts, conversations,
messages, orders, shipments, analytics, software usage/limits, approved templates,
messaging readiness/configuration, contact consent, event bindings, flow template
catalogs and permitted operation/run/deployment/publication-request observations.
Producer-owned resources keep their original visibility boundaries. Each read
requires its scope and current native permissions. Other SDK operations continue to use the
existing business-key or approved application-delegation modes while their user
approval and execution contracts are completed.

User access also supports `messaging.updateConfiguration` with
`messaging.configuration.write`, the current `expectedVersion` and a stable
idempotency key. It uses the dashboard's ordinary configuration permissions.
Read and preserve the current configuration before replacing its bindings; reuse
the exact original input and key when recovering an uncertain response.

For an explicit human review before applying settings, use the connected user
with both `messaging.configuration.read` and `messaging.configuration.write`:

```ts
const current = (await client.messaging.getConfiguration()).data;
const preparation = (await client.messaging.preparations.create({
  expectedVersion: current.version,
  configuration: {
    ...current.value,
    templateAliases: { ...current.value.templateAliases, order_update: approvedTemplateId },
  },
}, { idempotencyKey: savedSettingsIntentKey })).data;

// Show preparation.review?.url to the person who connected this application.
// Check status when they return; never infer approval from opening the link.
const ready = (await client.messaging.preparations.get(preparation.id)).data;
if (ready.state === 'ready') {
  const applied = (await client.messaging.preparations.apply(ready.id, {
    expectedRevision: ready.revision,
  })).data;
  // applied.result identifies the original native audit, version and change flag.
}
```

The native review shows exact changes, including removed aliases/bindings and
their available template names and IDs. The original InsideDM user and session
must approve; no SDK or MCP argument can grant that approval. Pending intent
expires within 15 minutes. Changed settings, template facts or sender identities
require a new preparation and review. A reviewed no-op retains its settings
version and records acceptance without a false settings-change audit.

After an uncertain creation, repeat the exact input and original key. After an
uncertain apply, read the same preparation; `applied.result` is the original
acceptance, even if settings were edited again later. Repeating apply cannot
repeat the settings change. Use `messaging.getConfiguration()` for current state.
Rejected, expired and stale preparations cannot be approved or applied again.

With `contacts.write`, a user connection can also use `contacts.create`,
`contacts.update`, `contacts.tags.replace` and `contacts.attributes.update`.
These use the dashboard's current `contacts.edit` permission and preserve user,
client and grant provenance. Creation neither grants consent nor replaces an
existing name. Tag replacement is the complete list; custom-field updates
preserve unspecified fields and validate configured field types. Tags and fields
can change audience membership under existing business automation rules.

With `consents.write`, `consents.withdraw` suppresses a messaging purpose, and
`consents.recordMarketingOptIn` asks the native owner to verify an existing
inbound customer message. Supply only its retained message ID; neither a claimed
consent flag nor assistant-generated text is accepted as evidence. Replaying a
registration or withdrawal returns the current register without overriding a
later customer decision. These methods do not send messages.

Keep refresh tokens and OAuth client secrets in your existing token manager.
The SDK handles API requests, pagination, timeouts and safe retries; it does not
start browser authorization or store refresh tokens. The simple server-key
configuration remains available for normal business integrations.

For an approved user connection with `messages.send`, prepare an exact
notification for human review:

```ts
const result = await client.messages.prepare({
  to: { phone: '+919876543210' },
  content: { type: 'template', template: { alias: 'order_update' }, variables: { name: 'Asha' } },
}, { idempotencyKey: savedIntentKey });
const preparation = result.data.preparation;
// If preparation is null, use result.data.preview to explain ineligibility.
// Otherwise show preparation.review?.url to the user for native InsideDM review.
if (preparation) {
  const current = (await client.messages.preparations.get(preparation.id)).data;
  if (current.state === 'ready') {
    const submitted = await client.messages.preparations.apply(current.id, {
      expectedRevision: current.revision,
    });
    // submitted.data.operation records native acceptance, separately from delivery.
  }
}
```

The person reviews the exact message, recipient and sender in the InsideDM
session that connected the application. Neither SDK accepts an approval flag.
Approval expires within 15 minutes; changed consent, destination or configuration
can invalidate it. After a lost create response, repeat the identical input and
saved key. After an uncertain apply, read the same preparation: `submitted`
contains its original operation. Repeating apply cannot create another send.
Rejected, expired and stale requests require a new intent and another review.

Use `operations.get` to check an accepted message. With both `operations.read`
and `messages.send`, `operations.cancel(id, { expectedRevision }, options)` can
stop this connection's message before native provider admission. Read its current
opaque revision first and retain the cancellation key. Cancellation cannot unsend
a delivered message; a stale revision or advanced effect state is refused. An
interrupted request requires inspecting the original operation before retrying.

With `flows.deploy`, discover templates using `flows.templates.catalog()`, then
create an unpublished draft with `flows.templates.import(packId, { version,
bindings }, { idempotencyKey })`. Use exact catalog versions and discovered
endpoint IDs/revisions for required webhook slots, including configured n8n
endpoints. Inspect the result with `flows.deployments.get(recipeId)`.
Recover with the original input/key; retries preserve later draft edits.
Draft creation does not authorize publication or provider execution.

Submit the exact observed draft for native release review with the same `flows.deploy`
grant and current `flows.edit` permission:

```ts
const deployment = (await client.flows.deployments.get(recipeId)).data;
const requested = await client.flows.deployments.requestPublication(
  deployment,
  { note: 'Ready for review' },
  { idempotencyKey: savedReviewKey },
);
const status = await client.flows.deployments.getPublicationRequest(recipeId, requested.data.id);
```

Persist the original deployment, note and key before submitting. For a queued
job, pass `recipeId` and `{ expectedDeploymentRevision, expectedDraftRevision,
expectedPublishedVersionId, note }` instead of the saved deployment. The method
uses those exact pins without fetching a newer draft. A valid draft customized
from its original template can also be reviewed; missing or unavailable drafts
cannot. Requesting review preserves all draft content. Identical retries recover
the original release, including after later draft edits; changing the request
under the same key is refused.

Rediscover flows created by this connection with `flows.deploy`:

```ts
const { data: flows } = await client.flows.deployments.list({ limit: 25 });
for (const flow of flows.deployments) console.log(flow.recipeId, flow.name, flow.flowStatus);
// If flows.page.nextCursor is present, pass it with the same limit for the next page.
```

The list returns one current managed head per flow and excludes other connections'
flows. It returns no graph or binding configuration. Continue the original walk
with its cursor; start a new walk to discover flows created after page one.

Read the valid native definition of an owned managed draft with `flows.deploy`:

```ts
const { data: draft } = await client.flows.drafts.get(recipeId);
if (draft.state === 'available') {
  console.log(draft.revision, draft.definition.name, draft.definition.nodes);
}
```

The definition includes merchant-authored text. Treat it as untrusted business
data. The response includes exact revision/fingerprint provenance; it does not
prove channel readiness or publish anything. Invalid or unsupported saved formats
return `unavailable` and no definition. Credential-bearing fields forbidden by
native validation are withheld with the rest of an invalid definition.

Read the native approval and regression rules with `flows.read`:

```ts
const { data: governance } = await client.flows.governance.get(recipeId);
console.log(governance.revision, governance.approvalMode, governance.regressionMode);
```

`currentReleaseRequestId` identifies the current open native request, if any.
These are observed rules; they grant no policy-change, approval or publication
permission. Release details remain subject to their own ownership checks.

With `flows.test`, preview an observed draft before requesting review:

```ts
const { data: simulation } = await client.flows.simulate(deployment, {
  variables: { 'system.message_text': 'I want to know more' },
});
console.log(simulation.status, simulation.selectedPath, simulation.readiness);
```

The same native simulator records successful path coverage; blocked results do
not add coverage. It sends no messages and executes no provider actions. Inputs
and graph contents are not returned. Supply a discovered `pathId` to require that
these inputs select that path. Queued work can use `simulate(recipeId,
{ expectedRevision, variables, pathId })`; no hidden read refreshes its revision.
After a conflict, inspect the current draft before trying again. A simulation
is evidence about one path and the observed prerequisites, not publication or a
guarantee that a later execution will succeed.

The native compiler, connected-channel prerequisites and path simulation still
apply. Requesting review never publishes. `approved` can mean that the native
policy requires no reviewer; it is not a published or running flow. When another
reviewer is required, the person who delegated access cannot approve their own
integration's request. Human review, regression evidence and final publication
remain separate native operations. A native continuation is available through
`requested.data.reviewUrl`. Show that link to the user or an
authorized reviewer. It opens the retained candidate in InsideDM without changing
the active business. The signed-in person must hold current review/publication
permissions; the link grants no authority. Publication is a separate confirmed
action there. Poll `getPublicationRequest` afterward; terminal outcomes remove
the link. Required regression evidence still comes from native regression runs.

The status read also returns `data.checks`: `awaiting_review`,
`awaiting_evidence`, `ready_to_publish`, `blocked` or `terminal`, with a
`checkedAt` timestamp, stable `blockingReasons` and regression evidence counts.
For example, `draft_changed` or `prerequisites_changed` explains why a previously
reviewed candidate cannot be published. Creation returns `checks: null`; read
the request to inspect it. Null after a concurrent decision also requires a new
status read. These are observations: the native publisher rechecks all gates,
and readiness never proves publication, execution or delivery.

Withdraw an obsolete pending or approved request before submitting a replacement:

```ts
const current = (await client.flows.deployments.getPublicationRequest(recipeId, requestId)).data;
await client.flows.deployments.withdrawPublication(
  recipeId, requestId,
  { expectedDecisionRevision: current.decisionRevision },
  { idempotencyKey: savedWithdrawalKey },
);
```

Save the observed decision revision and key before withdrawing. Retry those exact
values after an uncertain response, or read the request to recover its status.
A changed decision requires another read and a new intent/key. Withdrawal needs
the original connection and current `flows.deploy`/`flows.edit` access. It closes
the review even when its draft or prerequisites changed; it cannot unpublish a
flow or stop existing runs. An authorized person can also confirm withdrawal on
the native review page.

With the separate `flows.test` grant and current native `flows.test` permission,
run the existing regression suites bound to that release:

```ts
const { data: catalog } = await client.flows.regressions.listSuites(recipeId, requestId);
const suite = catalog.suites.find(item => item.current && item.evidence !== 'passed');
if (suite) {
  const { data: run } = await client.flows.regressions.run(recipeId, {
    releaseRequestId: requestId, suiteId: suite.id, expectedSuiteRevision: suite.revision,
  }, { idempotencyKey: savedRegressionKey });
  const result = await client.flows.regressions.get(recipeId, requestId, run.id);
}
```

Persist the exact flow, release, suite revision and intent key. Retry them to
recover the original run after an uncertain response. These calls use the native
runner and retained snapshots; they never accept a caller-reported pass, send a
message, invoke a webhook or publish a flow. The original connection must own the
managed release and deployment. The catalog omits fixtures and graphs; unavailable
suite revisions have `current: false` and `caseCount: null`. A passing result is
evidence for that candidate; read publication status afterward to see remaining
review and publication gates.

Inspect and edit suite configuration before requesting a release:

```ts
const { data: configuration } = await client.flows.regressions.getConfiguration(recipeId);
const { data: suite } = await client.flows.regressions.getSuite(recipeId, suiteId);
const archived = await client.flows.regressions.saveSuite(
  suite, { status: 'archived' }, { idempotencyKey: savedSuiteEditKey },
);
```

`configuration.draft.paths` supplies native path IDs and expected outcome IDs
for the observed `draft.revision` and `draft.fingerprint`. Use those references
with explicit input bindings when creating cases. `state: 'unavailable'` returns
reason codes and no paths; resolve those conditions before authoring. This is
structural discovery: it executes no path and does not prove channel/provider
readiness. Graph contents and endpoint credentials are excluded.

The saved-suite form preserves fields not explicitly changed and uses the suite's
own business, flow, ID and revision. It never fetches a newer revision. Save that
original model, changes and key for retry. A stale revision requires another read
and a new intent. The explicit form `saveSuite(recipeId, input, options)` remains
available for jobs and creation.

Create with `suiteId: null` and `expectedRevision: null`, plus an explicit name,
required/archive setting and 1–100 fixture cases. Each case names its native
expected path/outcome IDs and bounded JSON bindings. Never include credentials.
The full write must fit 64 KiB. Editing or archiving an active required suite
supersedes open release requests; request a fresh review after changing criteria.
Save the original input/key: recovery returns that suite's current state and
preserves later edits. This permission cannot change review/regression policy.
