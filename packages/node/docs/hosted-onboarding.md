# Connect a client's WhatsApp account

Use `InsideDMPlatform` on your server after the merchant has claimed their workspace and separately approved your application's installation. Your application credential needs `platform.onboarding.create`. Register the exact HTTPS return URL with InsideDM first. This unpublished alpha still needs deployment, browser and live-provider verification before production use.

```ts
import { InsideDMPlatform } from '@insidedm/sdk';

const platform = new InsideDMPlatform({ apiKey: process.env.INSIDEDM_APPLICATION_KEY! });
const { data: setup } = await platform.onboarding.create({
  businessId: client.insideDmBusinessId,
  provider: 'whatsapp',
  returnUrl: 'https://your-app.example/insidedm/whatsapp-complete',
}, { idempotencyKey: 'whatsapp/client_123/attempt_1' });
```

Take the business ID from your authenticated client mapping. Save the setup ID, business ID and retry key against that client. Privately offer `setup.url` to that merchant when it is non-null. The short-lived capability stays in the link fragment; never log it, send it to analytics, or expose your application key to a browser. Repeating the same input and key recovers the retained request. Changing input under that key conflicts. A new key starts a distinct request.

The merchant signs in to InsideDM, reviews the actual business and requesting application, and explicitly continues setup. A link for another active workspace requires an explicit switch to a workspace the person belongs to. It cannot change the target business. Provider setup stays bound to the original real sign-in; another person or a new sign-in needs a new setup request.

InsideDM uses the business's one WhatsApp account automatically. An existing active account can complete setup without reopening Meta or changing its credentials. A valid pending account offers repair, including its two-step PIN when needed. Otherwise the merchant chooses **Connect with WhatsApp** and completes Meta's existing signup flow. Coexistence uses the same native flow and does not register the existing number again. There is no sender selector, SDK settings page or application method to approve the merchant's provider access.

The link allows ten minutes to start. Once a provider attempt starts, its ten-minute finish deadline is fixed; repair cannot extend it. If the outcome of a provider attempt is uncertain, the page offers a status check rather than exchanging its code again. A completed setup becomes part of the merchant's ordinary connection lifecycle. Revoking the application does not disconnect the merchant's independent WhatsApp account.

On an explicit return to your registered URL, `insidedm_onboarding` contains only the setup reference. Match it to the setup saved for the currently authenticated customer, then authenticate the result:

```ts
const { data: current } = await platform.onboarding.get(savedSetupId);
if (current.businessId !== client.insideDmBusinessId) {
  throw new Error('Setup does not belong to this client');
}
if (current.status === 'completed') {
  // Historical setup receipt. Read current readiness before sending.
  const business = platform.forBusiness(current.businessId);
  const { data: readiness } = await business.messaging.getReadiness();
}
```

The readiness read needs its own merchant-approved `messaging.read` scope. The callback proves neither completion nor current sending eligibility. `completed` records a setup outcome; credential changes, disconnection, Meta billing requirements, consent and messaging policy can still prevent sending. The returned minimal `connection` can be null when its retained credential or channel incarnation is no longer current. Status reads expose no provider token, private link or authorizing person's identity.

| Status | Your application's next step |
| --- | --- |
| `created`, `authorized` | Offer a non-null returned link privately to the same merchant. |
| `processing` | Check status after a bounded delay. Do not replay the provider code or create another attempt automatically. |
| `action_required` | The original merchant can repair within the retained finish window. Keep the original link private. |
| `completed` | Read current messaging readiness before sending. |
| `failed`, `cancelled`, `expired` | Obtain a fresh explicit setup intent and create it with a new key. |
| `unavailable` | Resolve the original app/installation authority or return configuration first. Fresh credentials or reinstallation do not revive old work. |

For an uncertain creation response, preserve `error.recovery` and repeat the same input with its key. Status reads never renew a link, extend a deadline or grant access. Ownership claim, installation approval, WhatsApp setup and any commercial agreement remain separate decisions.
