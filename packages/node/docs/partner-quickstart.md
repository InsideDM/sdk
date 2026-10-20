# Partner backend quickstart

Use one application credential on your server and one saved InsideDM business ID per authenticated client. Each merchant separately approves access to their business. The SDK handles short-lived delegated tokens; your clients do not need to create or share merchant API keys.

This is an unpublished alpha. Production origin, hosted pages and live-provider acceptance still need release verification. For local evaluation, install the checked tarball and pass your development `baseUrl`. The normal published configuration is one `apiKey`; there are no sender defaults to select.

Start with registration, merchant approval and one notification below. An
**installation** is the merchant-approved connection to your application;
**delegation** is the short-lived access the SDK manages internally. Once the
first integration works, add [reusable flows and controlled rollouts](blueprints.md)
or [portfolio operations](partner-reference.md) as needed.

## 1. Register the application once

InsideDM's controlled onboarding approves your partner organization, real human administrators, application, scope ceilings and exact HTTPS return URLs. Register separate exact return URLs for the journeys you use. Approval of a partner organization does not create merchant access or a software sponsorship agreement. Self-service partner registration and a public partner administration portal are not supplied by this kit.

An approved human administrator can configure registered return URLs and manage credentials through InsideDM's human control plane. Application credentials cannot approve people, raise their own scope ceilings or issue themselves new credentials. Save a newly issued secret directly to your backend's secret store: it is delivered once. Retrying issuance recovers metadata, never the secret. A lost secret needs an explicit confirmed rotation.

Start with the smallest scope set for your first journey:

| Purpose | Application scope | Merchant-approved business scopes |
| --- | --- | --- |
| Ask an existing business for access | `platform.businesses.link` | Only the scopes selected in that approval request |
| Operate for an approved client | `platform.delegations.create` | `messages.send`, `operations.read` for notification submission and tracking |
| Discover current setup | No additional application scope beyond delegation | `messaging.read`, `templates.read` |
| Offer hosted WhatsApp setup | `platform.onboarding.create` | Separate installation approval; business discovery reads still need their own scopes |
| Inspect your API traffic | `platform.usage.read` | None; only your own installation's request telemetry |
| Inspect observed client AI consumption and current native limits | Delegation | `usage.read`, separately approved by a person with billing permission |

Provisioning, portfolio discovery, installation management and application webhooks need their own application scopes. Request those when the product actually uses them. A commercial relationship does not replace merchant approval. Merchants own their WhatsApp accounts and pay Meta directly. Software sponsorship and full white-label branding remain separate launch decisions.

## 2. Verify the server configuration

```ts
import { InsideDMPlatform } from '@insidedm/sdk';

const platform = new InsideDMPlatform({
  apiKey: process.env.INSIDEDM_APPLICATION_KEY!,
});

const { data: identity } = await platform.self.get();
console.log(identity.application.id, identity.application.name);
```

Keep the platform instance in your server process. Construction makes no request; `self.get()` checks the live key and effective configuration. Store no application key, delegated token or link capability in a browser. Use your own authenticated client record to select a business; accepting an arbitrary business ID from a browser is not client authorization.

## 3. Attach an existing client

Create an approval request from your server with a stable connection-attempt key:

```ts
const { data: request } = await platform.installationRequests.create({
  scopes: ['messages.send', 'operations.read', 'messaging.read', 'templates.read'],
  returnUrl: 'https://your-app.example/insidedm/approved',
}, { idempotencyKey: connectionAttempt.id });
```

Save `request.id` against that authenticated client and connection attempt, then privately offer the non-null `request.authorizationUrl` to that client. The merchant signs in, selects a business, reviews the exact access and confirms it. Do not log the private link or send it to analytics.

On return, match `insidedm_request` to the request saved for the current client. Authenticate the outcome on your server:

```ts
const { data: outcome } = await platform.installationRequests.get(savedRequestId);
if (outcome.status === 'approved' && outcome.result) {
  // Persist against the same authenticated client and connection attempt.
  await saveClientBusiness(client.id, outcome.result.businessId);
}
```

The callback value alone proves no approval. If you provisioned a business first, also require the result's business ID to equal that client's saved creation. An old approved receipt cannot bypass current revocation. A declined or expired request gives no fresh access; an explicit new attempt uses a new retry key.

For a client without a workspace, follow [client provisioning](client-provisioning.md), let a real merchant claim ownership, then perform this separate application approval. After approval, [hosted WhatsApp setup](hosted-onboarding.md) can guide the merchant through their existing account or provider consent. Ownership, application access and provider setup are distinct.

## 4. Send through the approved business

```ts
const business = platform.forBusiness(savedClient.insideDmBusinessId);
const { data: readiness } = await business.messaging.getReadiness();
const { data: templates } = await business.templates.list({ limit: 10 });
```

InsideDM resolves the organization's one WhatsApp account. If setup is incomplete, use the hosted setup outcome and current readiness to guide that merchant. Readiness is an observation; the send owner still checks the account, template, current consent and messaging policy.

Use an approved, supported template and its required variables. Preview checks the same input without sending:

```ts
const notification = {
  to: { phone: order.customerPhone },
  content: {
    type: 'template' as const,
    template: { id: savedApprovedTemplateId },
    variables: { name: order.customerName },
  },
};
const { data: preview } = await business.messages.preview(notification);
if (preview.eligible) {
  const { data: operation } = await business.messages.send(notification, {
    idempotencyKey: `order/${order.id}/ready`,
  });
  await saveOrderNotification(order.id, operation.id);
}
```

Retain one key per logical notification across restarts and uncertain responses. Use a new key for a different action; changing an old intent's input conflicts. An accepted operation means durable submission work. Operation success and customer delivery/read receipts are separate facts. Use `operations.get/lookup`, and [signed partner webhooks](partner-webhooks.md) for event-driven updates. Cancellation can stop pending work; it cannot retract a provider request already in flight.

## 5. Add only the touchpoints you need

- Start an already published from-system flow with `business.events.publish`; the event ID is its retry key. Read only your producer's run with `business.flows.runs.get`.
- Connect customer-owned n8n using the [recipes](n8n.md). The verified resource bridge needs your backend's durable authorized inbox and dispatcher. Long-running callback/resume and managed n8n/OEM hosting are separate unfinished capabilities.
- Request business `usage.read` only when client consumption reporting is needed. `business.usage.get({ from, to })` reports provisional observed AI calls/tokens across all execution origins. `platform.usage.get({ businessId })` reports your installation's API requests. Neither is a software invoice or Meta bill.
- With the same business grant, `business.usage.getLimits()` reads current native agent/seat limits and monthly conversation/AI allowances. These limits do not report remaining capacity, enabled agents or send eligibility.
- Inspect one client's installation with `platform.installations.get`. An explicit `revoke` removes this app's access; it does not erase the merchant's data, disconnect WhatsApp or revoke another integration. Pending work and sensitive events remain fenced by their original grant.

For configuration changes, webhook recovery and key rotation, retain revisions and explicit retry intent. Follow each method's guide instead of automatically replacing a failed request with a new action. Routine application-key rotation can preserve its lineage; replace the configured server instance with the new key. Explicit lineage revocation fences its delegations and queued effects. A new key lineage or fresh installation cannot adopt old work.

Use `@insidedm/sdk/testing` for deterministic synthetic tests without network or provider effects. Keep production acceptance separate: verify hosted merchant journeys, current permission denial, same-intent recovery and a controlled approved send through the deployed owners before releasing to clients.
