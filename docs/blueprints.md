# Reusable partner flows

[Complete partner setup first](partner-quickstart.md). These methods prepare client drafts; merchants retain publication authority.

## Save a reusable partner blueprint

Applications approved for `platform.blueprints.manage` can save reusable source
versions without selecting a client or receiving merchant credentials:

```ts
const { data: sources } = await platform.blueprints.listTemplates();
const leadCapture = sources.find(source => source.template.id === 'lead-capture');
if (!leadCapture) throw new Error('Source unavailable');

const { data: blueprint } = await platform.blueprints.createVersion({
  key: 'agency-leads', version: 1,
  name: 'Our lead journey', description: 'Collect an email for the client team',
  template: leadCapture.template,
  parameters: { emailPrompt: 'How can our team reach you?' },
  clientOverrides: ['emailPrompt'],
});

const { data: exact } = await platform.blueprints.getVersion('agency-leads', 1);
const { data: history } = await platform.blueprints.listVersions('agency-leads');
```

The source catalog declares typed parameters, defaults, limits and dependency
slots. Current adapters support lead-capture prompts, webhook follow-up timing
and [bounded external-job polling](n8n.md#run-a-longer-external-job).
Versions and their digests are immutable. The default retry key is stable
for the blueprint key/version, so restarting your backend can recover creation.
Change the version to save different content; creating the same version under a
different explicit retry key conflicts. History contains at most 100 versions.

Deploy that saved version after the client approves `flows.deploy`:

```ts
const client = platform.forBusiness(businessId);
const { data: draft } = await client.flows.blueprints.deploy(blueprint, {
  overrides: { emailPrompt: 'How should the client team reach you?' },
}, { idempotencyKey: 'client-123/agency-leads/v1' });
const { data: deployment } = await client.flows.deployments.get(draft.recipeId);
```

For a source with endpoint slots, supply reviewed `bindings` from the client's
`flows.templates.catalog()`. Every declared slot must bind that client's active
resource/revision. Overrides must be permitted by the saved source. Deployment
reuses the builder import endpoint and creates a client-owned draft; review and
publication stay separate. Blueprint definitions grant no execution or merchant
access, and no copied graph, destination URL or credential is sent. Existing
matching retries recover creation without overwriting client customization.
Preview an update to an existing client draft before applying it:

```ts
const { data: nextVersion } = await platform.blueprints.getVersion('agency-leads', 2);
const { data: preview } = await client.flows.deployments.previewUpdate(
  draft.recipeId, nextVersion,
);
if (preview.state === 'ready') {
  await client.flows.deployments.applyUpdate(preview, {
    idempotencyKey: 'client-123/agency-leads/update-v2',
  });
}
```

Inspect `preview.changes` and `preview.reasons`. Existing client overrides survive
source-default changes. Manual graph edits, incompatible overrides and missing or
stale bindings require action. Supply newly reviewed bindings in the preview's
third argument when needed. Apply rechecks the source, resources and both draft
and managed revisions; the preview grants no authority by itself. A matching
retry recovers its original receipt. Updates append immutable history and change
a draft only. Existing publications and pinned runs continue until the normal
human review/publication path accepts a change. Selecting an earlier source can
prepare a draft rollback under those same checks.

### Submit a managed draft for publication

```ts
const { data: current } = await client.flows.deployments.get(draft.recipeId);
const { data: request } = await client.flows.deployments.requestPublication(
  current, { note: 'Please review the updated client journey.' },
  { idempotencyKey: 'client-123/agency-leads/review-v2' },
);
const { data: review } = await client.flows.deployments.getPublicationRequest(
  draft.recipeId, request.id,
);
```

This submits your integration's unchanged managed draft through the existing
builder release owner, compiler and simulation. Current channel/dependency
readiness and governance still apply. The saved managed revision, draft revision
and current publication are checked together; manual edits require resolution.
Use the business client that owns the deployment. Keep the same deployment,
note and retry key after an uncertain answer; matching retained intent returns
the same request with its current status, including after human publication.

`pending` needs native human review; `pending_evidence` also needs the configured
regression evidence. `approved` means the release is approved under its native
policy, which may require no reviewer; it does not mean published. A real human
publisher still uses InsideDM's existing release controls. The SDK cannot approve,
publish, change governance or bypass required evidence. It records the integration
as requester, without borrowing a person's identity. Rejected, superseded and
dismissed requests remain observable; a deliberate new attempt needs fresh state
and a new key. `publishedVersionId` is present only for a published request.
Publication and customer delivery remain separate facts.

### Update a selected group of clients

Preview up to 25 explicit business/flow selections with one saved target version:

```ts
const plan = await platform.blueprints.rollouts.preview(nextVersion, [
  { businessId: clientA.businessId, recipeId: clientA.flowId },
  { businessId: clientB.businessId, recipeId: clientB.flowId },
]);
await saveRolloutPlan(plan); // Persist in your backend before any writes.

for await (const outcome of platform.blueprints.rollouts.apply(plan)) {
  await saveClientOutcome(plan.id, outcome);
}
```

Inspect each `plan.clients[].preview` for changes, preserved overrides and
action-required reasons; `error` records a failed preview. Supply optional
client-specific `bindings` with the selection. The helper does not select clients
from your portfolio automatically. Use your authenticated client records.

Application is lazy and serial. Each outcome is `draft_updated`, `unchanged`,
`action_required`, `preview_failed`, `not_attempted` or `failed`. One failed client
does not prevent another from being attempted. Breaking the loop stops later
clients; a canary stage can apply a subset of `plan.clients` while keeping the
original plan ID and previews. Every write still rechecks current approval,
source, resources and revision pins through the existing graph owner.

Retain the plan and outcomes in your backend. Retry an uncertain write with the
same saved plan: per-client keys are deterministic and matching retained intents
recover the original receipt. A failed request can have committed; do not obtain
a fresh plan to retry an unknown outcome. Repeating a known completed request
after server receipt retention is not a recovery guarantee. Failed previews and
customized drafts need resolution and a fresh explicit preview before inclusion.
Plans and outcomes include client identifiers and configuration metadata; store
them privately. Failure diagnostics exclude exception messages and raw responses.

Both methods accept request options per client. Abort stops new work; it cannot
undo a committed update. Your application owns scheduling and persistence.

Copy [managedRolloutWorker.mjs](../examples/managedRolloutWorker.mjs) for durable recovery:

```js
import { createManagedRolloutWorker } from './managedRolloutWorker.mjs';
const worker = createManagedRolloutWorker({ platform, directory: '/persistent/private/rollouts' });
const id = await worker.save(plan);
console.log(await worker.tick(id)); // Schedule again later; retain this ID.
```

Use private persistent POSIX storage with hard links and fsync. Restart with the
same ID. Write/recovery attempts stop after 24 hours; reconcile uncertain writes
before a new plan. Known review IDs remain readable. `awaiting_review` needs human
action. Your scheduler owns backoff, retry limits, retention and monitoring.
