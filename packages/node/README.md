# insideDM SDK for Node.js

**WhatsApp messaging and workflow automation in JavaScript and TypeScript.**

The official SDK for [insideDM](https://insidedm.io). Connect your application to
insideDM to send notifications, synchronize contact data and trigger
automations from your existing systems.

**Node.js 22+ · TypeScript types · ESM and CommonJS · Zero runtime dependencies · MIT**

[Website](https://insidedm.io) · [API reference](https://github.com/insideDM/sdk/blob/main/packages/node/docs/business-reference.md) · [GitHub](https://github.com/insideDM/sdk)

## Install

```sh
npm install @insidedm/sdk@next
```

Use this server-side SDK in Node.js applications, background workers and your
integration backend. Keep API keys in your server's environment or secret manager.

## Quickstart: send a WhatsApp notification

Create a scoped business key in your insideDM workspace. Use an approved WhatsApp
template and a customer you are permitted to contact. The SDK resolves your
organization's WhatsApp account automatically.

```ts
import { InsideDM } from '@insidedm/sdk';

const insideDM = new InsideDM({
  apiKey: process.env.INSIDEDM_API_KEY!,
});

const { data: operation, meta } = await insideDM.messages.send(
  {
    to: { phone: '+919800000099' },
    content: {
      type: 'template',
      template: { id: process.env.INSIDEDM_TEMPLATE_ID! },
      variables: { name: 'Asha' },
    },
  },
  { idempotencyKey: 'orders/order-123/shipped' },
);

console.log(operation.id, operation.state, meta.requestId);
```

Replace the sample recipient, template ID and variable keys with your own values.
Sending requires `messages.send`; tracking requires `operations.read`. Discover
approved templates with `insideDM.templates.list({ limit: 25 })` when your key has
`templates.read`. Use `messages.preview()` to inspect eligibility before sending.

The default API is `https://api.insidedm.io`. **This release uses the alpha
channel; hosted production acceptance is pending.** For evaluation against an
existing insideDM test deployment, add `baseUrl` to the client configuration.
Your application calls insideDM's service; the SDK does not deploy a backend.
CommonJS uses `const { InsideDM } = require('@insidedm/sdk')`.

## What you can build

| Business need | SDK capabilities |
| --- | --- |
| Customer notifications | Discover approved templates, preview eligibility and send WhatsApp notifications. |
| CRM synchronization | Create contacts and update names, tags and custom fields. |
| Event-driven automation | Start published flows from your order, CRM or business events and inspect run progress. |
| Reliable processing | Recover submissions with the original intent key, inspect operations and verify signed webhooks. |
| n8n integrations | Connect customer workflows using importable examples, published flows and verified events. |

Configure templates and flows in the insideDM dashboard, then use them from
your application through the SDK.
See the [complete API reference](https://github.com/insideDM/sdk/blob/main/packages/node/docs/business-reference.md)
for methods, permissions and result meanings.

## Track a notification

```ts
const { data: progress } = await insideDM.operations.get(operation.id);
console.log(progress.state);

// If the original send response was lost, recover with the SAME saved key.
const { data: recovered } = await insideDM.operations.lookup(
  'orders/order-123/shipped',
);
```

Save the intent key before sending and reuse it across retries and restarts.
An accepted operation confirms retained work; provider submission and customer
delivery are separate outcomes. Never create a new key merely because a response
was lost. See [operation recovery and signed events](https://github.com/insideDM/sdk/blob/main/packages/node/docs/business-reference.md#receive-webhooks).

## Start a published flow

Publish and activate a from-system flow in the insideDM flow builder, enable its
start endpoint and map the input fields. Discover eligible flows with
`insideDM.events.bindings.list({ limit: 25 })` using `events.write`.

```ts
const { data: submission } = await insideDM.events.publish({
  id: 'order-123-paid',
  binding: process.env.INSIDEDM_FLOW_ID!,
  subject: { contactId: process.env.INSIDEDM_CONTACT_ID! },
  properties: { payload: { orderId: 'order-123' } },
});

const { data: status } = await insideDM.operations.get(submission.id);
```

Keep the event ID stable and match `properties` to the flow's configured mappings.
Tracking needs `operations.read`; run reads need `flows.read`. See
[flow inputs and run progress](https://github.com/insideDM/sdk/blob/main/packages/node/docs/business-reference.md#start-a-published-flow-from-your-business-system).

## Errors and request tracing

Detail responses return `{ data, meta }`; list responses also include
`page.nextCursor`. Use `meta.requestId` for support and tracing.

```ts
import { InsideDMApiError, InsideDMConfigurationError } from '@insidedm/sdk';

try {
  await insideDM.contacts.list({ limit: 25 });
} catch (error) {
  if (error instanceof InsideDMConfigurationError) {
    console.error(error.field, error.message);
  } else if (error instanceof InsideDMApiError) {
    console.error(error.code, error.requestId, error.retryAfterSeconds);
  }
  throw error;
}
```

Keep `error.problem` and `error.recovery` out of routine logs. Requests support
bounded retries, timeouts and cancellation. See
[request controls and error categories](https://github.com/insideDM/sdk/blob/main/packages/node/docs/business-reference.md#results-errors-and-request-controls).

## Try the interface offline

```ts
import { createTestClient } from '@insidedm/sdk/testing';

const demo = createTestClient();
const { data: workspace } = await demo.workspace.get();
```

The test client uses synthetic responses and needs no key or network connection.
It helps explore the interface; it does not establish live permissions or delivery.

## Guides and reference

| Topic | Documentation |
| --- | --- |
| Business API | [Methods, scopes, pagination and webhooks](https://github.com/insideDM/sdk/blob/main/packages/node/docs/business-reference.md) |
| n8n | [Integration guide and importable workflows](https://github.com/insideDM/sdk/blob/main/packages/node/docs/n8n.md) |
| API contract | [OpenAPI specification](https://github.com/insideDM/sdk/blob/main/packages/node/openapi/public-v1.yaml) |
| Source and releases | [Repository](https://github.com/insideDM/sdk), [changelog](https://github.com/insideDM/sdk/blob/main/packages/node/CHANGELOG.md), [contributing](https://github.com/insideDM/sdk/blob/main/CONTRIBUTING.md) |
| Help and security | [Report an issue](https://github.com/insideDM/sdk/issues), [private security reporting](https://github.com/insideDM/sdk/blob/main/SECURITY.md) |

## About insideDM

[insideDM](https://insidedm.io) helps businesses manage and automate customer
conversations. Explore [WhatsApp automation for businesses](https://insidedm.io/whatsapp)
and [Instagram DM automation](https://insidedm.io/instagram), alongside the SDK's
programmatic notification and workflow integrations.

## License

[MIT](https://github.com/insideDM/sdk/blob/main/LICENSE). Commercial use and
redistribution are permitted with the license notice retained. The private
backend and hosted-service access are governed separately.
