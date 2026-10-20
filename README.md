# InsideDM SDK for Node.js

Send WhatsApp notifications, start published flows and connect approved client
businesses from your backend. One key configures the client; InsideDM resolves
the organization's WhatsApp account automatically.

**Unpublished alpha:** npm installation becomes available after the first release.
For local evaluation, install the checked tarball and use your development
`baseUrl`. Production API, hosted/provider acceptance, publishing identity and
licensing remain pending. Requires Node.js 22+; supports TypeScript, ESM and
CommonJS, with zero runtime dependencies. Keep keys on your server.

| Your task | Start here | More detail |
| --- | --- | --- |
| Notify a customer | [Send a notification](#send-a-notification) | [Templates, eligibility and recovery](docs/business-reference.md#send-a-notification) |
| Start an existing automation | [Start a published flow](#start-a-published-flow-from-your-business-system) | [Inputs and run progress](docs/business-reference.md#start-a-published-flow-from-your-business-system) |
| Serve client businesses | [Partners and white labels](#partners-and-white-labels) | [Merchant approval and first send](docs/partner-quickstart.md) |
| Connect n8n | [Integration guide](docs/n8n.md) | [Importable workflows](examples/n8n/README.md) |

## Install and configure

```sh
npm install @insidedm/sdk
```

```ts
import { InsideDM } from '@insidedm/sdk';
const insideDM = new InsideDM({ apiKey: process.env.INSIDEDM_API_KEY! });
```

Create a scoped business key in InsideDM. Construction makes no request; the
first operation discovers the business when needed. You do not pass a WhatsApp
sender or provider token. For local development only, add your API `baseUrl`.
CommonJS uses `const { InsideDM } = require('@insidedm/sdk')`.

## Send a notification

Use an approved WhatsApp template and a customer you are permitted to contact.
This task needs `messages.send`; tracking needs `operations.read`. With
`templates.read`, discover IDs and exact variable keys using
`insideDM.templates.list({limit:25})`. An existing approved template ID needs no
alias setup. Replace the sample phone and template ID with your own inputs.

```ts
import type { NotificationInput } from '@insidedm/sdk';

const notification: NotificationInput = {
  to: { phone: '+919800000099' },
  content: {
    type: 'template',
    template: { id: process.env.INSIDEDM_TEMPLATE_ID! },
    variables: { name: 'Asha' }, // Exact keys come from the chosen template.
  },
};

const { data: preview } = await insideDM.messages.preview(notification);
if (!preview.eligible) {
  console.log(preview.reasonCode); // Resolve eligibility before sending.
} else {
  // Save this key in your own order/job record before sending.
  const key = 'orders/order-123/ready';
  const { data: operation, meta } = await insideDM.messages.send(
    notification,
    { idempotencyKey: key },
  );
  console.log(operation.id, operation.state, meta.requestId);
}
```

In JavaScript, omit the type import and `: NotificationInput`; the object and calls
are identical. Preview sends nothing and grants no consent. Send rechecks current policy.
An accepted operation means retained work, not customer delivery.
Keep the operation ID and the same logical key across retries and restarts:

```ts
const { data: progress } = await insideDM.operations.get(savedOperationId);
// If the send answer was lost, recover with the original key:
const { data: recovered } = await insideDM.operations.lookup(savedNotificationKey);
```

Use a fresh key only for a different action. An uncertain provider outcome needs
reconciliation; blindly sending with a new key can duplicate it. See
[message outcomes and signed events](docs/business-reference.md#receive-webhooks).

## Start a published flow from your business system

First publish and activate a from-system flow in the existing builder and enable
its start endpoint. With `events.write`, discover its ID, mapped input fields and
`endpointConfigured` status using `insideDM.events.bindings.list({limit:25})`.
Choose the intended flow and save its ID in your integration configuration.
`binding` below is that flow ID; `subject.contactId` is an existing contact.

```ts
const { data: submission } = await insideDM.events.publish({
  id: 'order-123-ready', // Save once per business event; this is also its retry key.
  binding: savedFlowId,
  subject: { contactId: savedContactId },
  properties: { payload: { orderId: 'order-123' } }, // Match the flow's mapped fields.
});

const { data: eventProgress } = await insideDM.operations.get(submission.id);
if (eventProgress.phase === 'flow_started' && eventProgress.resource?.type === 'flow_run') {
  const { data: run } = await insideDM.flows.runs.get(eventProgress.resource.id);
  console.log(run.status);
}
```

Progress reads need `operations.read`; run reads need `flows.read`. The first read
may still show queued work. Intake, execution and delivery are separate stages.
See the [complete flow reference](docs/business-reference.md#start-a-published-flow-from-your-business-system).

## Partners and white labels

Keep one application key on your backend. Each business separately approves your
application and scopes. An **installation** is that approved connection;
**delegation** is the short-lived access the SDK obtains internally to use it.
Select the business from your authenticated saved client mapping:

```ts
import { InsideDMPlatform } from '@insidedm/sdk';

const platform = new InsideDMPlatform({
  apiKey: process.env.INSIDEDM_APPLICATION_KEY!,
});
const business = platform.forBusiness(savedClient.insideDmBusinessId);
const { data: operation } = await business.messages.send(notification, {
  idempotencyKey: 'orders/order-123/ready',
});
```

The same business methods and input types work for direct and partner clients.
`forBusiness()` makes no request and creates no permission; access is checked
when used. Begin with the [partner quickstart](docs/partner-quickstart.md), then
use [provisioning](docs/client-provisioning.md), [hosted WhatsApp setup](docs/hosted-onboarding.md),
[partner events](docs/partner-webhooks.md) or [reusable flow blueprints](docs/blueprints.md)
when needed. Draft creation and review requests retain human publication authority.

## Understand results and errors

Detail calls return `{data, meta}`. Lists also return `page.nextCursor`.
`meta.requestId` identifies the server request; it is useful for support.

| Observation | What it establishes |
| --- | --- |
| `messages.preview().data.eligible` | Current eligibility for that input; sends nothing. |
| `messages.send()` returns an operation | Submission work was retained; inspect its state. |
| Message operation `state: 'succeeded'` | Provider submission succeeded; delivery/read status is separate. |
| `messages.get(messageId).data.deliveryState` | Latest retained message receipt; requires `messages.read`. |
| `events.publish()` returns an operation | Event intake was retained; inspect flow admission separately. |
| `flows.runs.get(runId)` | Actual run progress; completion alone does not prove delivery. |
| Managed draft/review request | Prepared for human review; no machine approval or publication. |

```ts
import { InsideDMConfigurationError, InsideDMApiError } from '@insidedm/sdk';

try {
  await insideDM.contacts.list({ limit: 25 });
} catch (error) {
  if (error instanceof InsideDMConfigurationError) {
    console.error(error.message); // e.g. to.phone: Use an E.164 phone number...
    // error.field identifies the documented field, without its supplied value.
  } else if (error instanceof InsideDMApiError) {
    console.error(error.code, error.requestId, error.retryAfterSeconds);
  }
  throw error;
}
```

Local mistakes fail before network discovery. Server details (`error.problem`)
and recovery context (`error.recovery`) are explicit accessors; keep them out of
routine logs. Requests have bounded retries/timeouts and accept `signal`.
See [request controls and error categories](docs/business-reference.md#results-errors-and-request-controls).

## Explore more

| Need | Interface or guide |
| --- | --- |
| Page through records | `list()` reads one page; `iterate()` yields records lazily; `pages()` yields pages. Set `maxPages`/`maxItems` or break to stop. |
| Sync CRM context | [Contacts, display names, tags and custom fields](docs/business-reference.md#available-operations) |
| Inspect permissions and setup | `workspace.get()`, `messaging.getReadiness()`, `consents.get(contactId)`; scopes remain separate. |
| Track outcomes | [Raw-body webhook verification](docs/business-reference.md#receive-webhooks) and [partner receivers](docs/partner-webhooks.md) |
| Manage reusable client flows | [Blueprints, controlled updates and human review](docs/blueprints.md) |
| Read every supported method | [Business reference](docs/business-reference.md), [partner reference](docs/partner-reference.md) and [OpenAPI](openapi/public-v1.yaml) |

Try a synthetic client without a key or network connection:

```ts
import { createTestClient } from '@insidedm/sdk/testing';
const demo = createTestClient();
const { data: workspace } = await demo.workspace.get();
```

Fixtures do not prove live authorization or delivery. See [offline development](docs/business-reference.md#offline-development).
For source builds and publishing gates, see [PUBLICATION.md](PUBLICATION.md).
