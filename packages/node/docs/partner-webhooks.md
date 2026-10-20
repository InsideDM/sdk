# Configure an application webhook receiver

This unpublished alpha supports application-owned receivers, new events from approved client installations, merchant receiver health, bounded delivery history and explicit replay. Configure one receiver; the first new subscribed event creates its merchant binding automatically.

Use the same server application key as your other partner methods. It needs `platform.subscriptions.manage`. Its registered business scope ceiling must include the read permissions for the selected events.

```ts
import { InsideDMPlatform } from '@insidedm/sdk';

const platform = new InsideDMPlatform({ apiKey: process.env.INSIDEDM_APPLICATION_KEY! });
const { data: created } = await platform.subscriptions.create({
  name: 'Client events',
  url: 'https://your-app.example/insidedm/events',
  events: ['contact.changed', 'message.delivery_changed'],
}, { idempotencyKey: 'receiver/client-events/create' });
```

Save `created.subscription.id` and its non-null `signingSecret` in your server's secret store. Keep the secret out of logs, browsers and analytics. It is separate from the application key and merchant credentials. Creation always produces a pending receiver. At most five non-disabled receivers are allowed per application.

Your HTTPS endpoint handles the existing verification protocol with the SDK's webhook helper:

```ts
import { constructWebhookEvent } from '@insidedm/sdk/webhooks';

export async function POST(request: Request) {
  try {
    const verified = constructWebhookEvent({
      rawBody: new Uint8Array(await request.arrayBuffer()),
      signature: request.headers.get('x-insidedm-signature'),
      secret: process.env.INSIDEDM_WEBHOOK_SECRET!,
    });
    if (verified.kind === 'verification') return Response.json(verified.response);
    // Add durable event deduplication and queueing before accepting deliveries.
    return new Response(null, { status: 503 });
  } catch {
    return new Response(null, { status: 401 });
  }
}
```

After installing the saved secret on your receiver, verify and explicitly activate:

```ts
const { data: current } = await platform.subscriptions.get(savedSubscriptionId);
const { data: checked } = await platform.subscriptions.verify(current.id, {
  expectedRevision: current.revision,
});
const { data: active } = await platform.subscriptions.activate(current.id, {
  expectedRevision: checked.revision,
});
```

Verification records readiness for the exact URL and secret generations; it does not activate them. The challenge lasts ten minutes. Readiness lasts 24 hours for activation. That deadline is not an active receiver's lifetime. Five verification attempts per receiver per 15 minutes and twenty per application per hour use distributed budgets. A verification-budget error has `error.problem.policyId === 'partner-webhook-verification'` and `error.retryAfterSeconds`.

| Method | Purpose |
| --- | --- |
| `list()` | Read up to five current, non-disabled receiver configurations. |
| `get(id)` | Read one own-app configuration, including disabled history, without its secret. |
| `update(id, { expectedRevision, name?, url?, events? })` | Change reviewed fields. A URL change returns to pending and invalidates proof. |
| `verify(id, { expectedRevision })` | Send and judge one receiver challenge. |
| `activate(id, { expectedRevision })` | Deliberately activate a verified configuration. |
| `pause(id, { expectedRevision })` | Pause the configuration. |
| `disable(id, { expectedRevision })` | Permanently close it and release its configuration slot. |
| `rotateSecret(id, { expectedRevision, mode }, options)` | Rotate immediately or with `overlap_24h`; verify the new generation before activation. |
| `getHealth(id, { businessId })` | Observe this client's receiver health separately from configuration status. |
| `recover(id, { businessId, expectedRevision }, options)` | Explicitly restore this client's health-paused receiver under reviewed state and current proof. |
| `deliveries.list/pages/iterate(id, { businessId, ...filters })` | Read bounded thin delivery history under the current merchant grant. |
| `deliveries.get(id, delivery.id, { businessId })` | Read one record with safe attempt metadata. |
| `deliveries.replay(id, delivery.id, { businessId, reason }, options)` | Explicitly recover one retained event through the existing one-shot sender. |

Creation and secret rotation accept `WriteRequestOptions`, including an optional generated idempotency key. Preserve an explicit stable key across process restarts. An uncertain failure exposes `error.recovery`; default error inspection excludes that context and response bodies. Repeating a rotation's exact input/key recovers its still-current secret only under its original requesting credential lineage. A later generation, disabled receiver or different lineage returns `signingSecret: null` for the old intent. An old retry never rotates again or reveals another generation.

Update, verify, activate, pause and disable require the reviewed revision and are attempted once. They do not accept idempotency keys. After an uncertain response, read current state before choosing another action. The SDK never automatically sends another provider challenge. Name/event edits keep proof for the same receiver; URL changes and secret rotation invalidate it.

Each event still needs its own merchant-approved installation permission:

| Event | Required business scope |
| --- | --- |
| `contact.changed` | `contacts.read` |
| `conversation.changed` | `conversations.read` |
| `message.created`, `message.delivery_changed` | `messages.read` |
| `order.changed` | `orders.read` |
| `shipment.changed` | `shipments.read` |
| `operation.changed` | `operations.read` |

Receiver configuration grants no merchant access and creates no installation. Each client must separately approve your application and the event's read scope. Coverage begins with new events under that grant; there is no historical backfill. Events use version 2 with `businessId` and `application: { id, installationId, authorityVersion }`. Deduplicate by event ID in that business, map the business to your authenticated client, then fetch current data with `platform.forBusiness(businessId)`. The helper never follows an event's `href`.

`operation.changed` includes only operations created by that exact installation epoch. Its `producer` identifies the installation and `authorityVersion`. Another application's, a merchant key's or a person's operation is not sent to your application receiver. Ordinary merchant resource webhooks keep version 1; existing operation progress keeps version 2.

Original application authority remains binding; revoking it cannot be repaired by substituting a fresh lineage. Current permission is checked when retaining the event and again before receiver I/O, after destination resolution. Reinstalling an application cannot authorize its old queued events. A URL change, secret rotation, pause or event-set change also fences old work; reactivation starts future coverage. Pausing or disabling this receiver does not disconnect a merchant's WhatsApp account.

Delivery reuses the native bounded retries, erasure cancellation, 24-hour horizon and receiver health pause policy. Each merchant's physical receiver can pause on a permanent failure or repeated failures independently. The logical configuration's active status is not a portfolio health report. `getHealth()` distinguishes an active configuration, no binding yet (`awaiting_event`) and a paused physical receiver with its closed reason and opaque revision.

Read history using the same root key and the real approved client business ID:

```ts
const target = { businessId: savedClientBusinessId };
const { data: health } = await platform.subscriptions.getHealth(savedSubscriptionId, target);

for await (const delivery of platform.subscriptions.deliveries.iterate(
  savedSubscriptionId,
  { ...target, status: 'failed', limit: 25 },
  { maxPages: 10, maxItems: 250 },
)) {
  // delivery.id is the history/replay handle.
  // delivery.deliveryId matches the receiver's X-InsideDM-Delivery-Id header.
  console.log(delivery.id, delivery.lastError);
}
```

History defaults to the last day, supports at most thirty days and returns at most one hundred records per page. Optional `from`/`to` values accept `Date` or timestamp strings. Cursors last fifteen minutes and retain a stable cutoff; new events appear on a fresh read. Changing business, grant epoch, receiver configuration or filters invalidates the cursor. Restart the read on `invalid_cursor`. Payloads, receiver URLs, secrets and raw receiver responses are excluded. A prior receiver generation can remain inspectable under the same grant while being non-replayable.

After repairing a receiver and deliberately selecting a replayable event:

```ts
const { data: replayed } = await platform.subscriptions.deliveries.replay(
  savedSubscriptionId,
  selectedDelivery.id,
  { ...target, reason: 'receiver_recovered' },
  { idempotencyKey: savedReplayIntentKey },
);
```

Other reasons are `receiver_configuration_fixed`, `transient_failure_resolved` and `support_directed`. Keep the exact input/key to recover an uncertain response; the SDK freezes both before dispatch. `error.recovery` contains the receiver, business, original delivery and intent key and is excluded from default error inspection. Replay creates one new delivery of the unchanged event, uses the original grant/receiver generation, allows one waiting replay per original and at most twenty-four within thirty days, and makes one send attempt. A paused receiver, new merchant approval, changed receiver generation, erased source or foreign application cannot revive old work. Continue deduplicating the event ID across every replay.

After fixing a receiver that paused for one client, restore that client explicitly:

```ts
const { data: receiver } = await platform.subscriptions.get(savedSubscriptionId);
if (receiver.status === 'active' && !receiver.ready) {
  // Refresh expired proof while other merchants continue receiving events.
  await platform.subscriptions.verify(receiver.id, { expectedRevision: receiver.revision });
}
const { data: reviewed } = await platform.subscriptions.getHealth(savedSubscriptionId, target);
if (reviewed.receiverStatus === 'paused' && reviewed.revision !== null) {
  const { data: current } = await platform.subscriptions.recover(
    savedSubscriptionId,
    { ...target, expectedRevision: reviewed.revision },
    { idempotencyKey: savedReceiverRecoveryIntentKey },
  );
}
```

Recovery requires an active configuration and unexpired proof for its exact receiver and secret. Refreshing active verification keeps other clients running and never activates a paused client itself. The reviewed health revision binds the original grant, receiver generation, proof and current health. On `revision_conflict`, read and review health again before creating a new intent. A lost-answer retry returns current health; if a newer failure paused the receiver, that old intent returns the paused state without resuming it. Recovery resets only this client's health pause. Cancelled events stay cancelled, merchant-requested pauses cannot be overridden, and new approvals or receiver generations cannot adopt old recovery intent.
