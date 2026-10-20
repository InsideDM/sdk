# Create a client workspace

Use a server application credential with `platform.businesses.create`. InsideDM must approve the application's creation allowance first; it defaults to zero. The allowance includes unclaimed workspaces. It does not establish a price, sponsorship, messaging quota or data grant.

```ts
import { InsideDMPlatform } from '@insidedm/sdk';

const platform = new InsideDMPlatform({ apiKey: process.env.INSIDEDM_APPLICATION_KEY! });
const created = await platform.businesses.create({
  externalId: 'client_123',
  name: 'The merchant',
  timeZone: 'Asia/Kolkata', // optional; this is also the default
  returnUrl: 'https://your-app.example/insidedm/claim-complete',
}, { idempotencyKey: 'create/client_123' });
```

Register the exact HTTPS return URL with InsideDM. `externalId` is your opaque client reference: 1–128 ASCII letters, digits, periods, underscores, colons or hyphens, starting with a letter or digit. Each application can create one retained workspace for that reference. Use a stable key per intent. Changing input under the same key conflicts; a second key with an existing reference also conflicts.

Save the creation ID, business ID and retry key in your own client record. For `needs_owner_claim`, privately send `created.data.claimUrl` to the intended merchant. The link expires after ten minutes; its capability is in a fragment. Do not log it, put it in analytics or expose your application key to a browser.

The merchant signs in, reviews the new workspace and provider, and explicitly claims ownership. This creates that real person's administrator membership. It does not approve your application, connect WhatsApp, select a sender, or start a commercial agreement.

After the merchant returns, match `insidedm_creation` to the creation you saved for that signed-in customer, then authenticate the outcome:

```ts
const current = await platform.businessCreations.get(savedCreationId);
if (current.data.status === 'owner_claimed') {
  // Next: create a separate installationRequests approval link for this merchant.
}
```

The callback alone is not proof. `owner_claimed` records an ownership claim, rather than current membership or channel readiness. Verify the installation approval result's business ID against your saved creation before recording application access. Then use `platform.forBusiness(businessId)` as usual.

To replace an expired or compromised pending link, read its current revision and explicitly renew:

```ts
const current = await platform.businessCreations.get(savedCreationId);
const replacement = await platform.businessCreations.renewClaimLink(savedCreationId, {
  expectedRevision: current.data.revision,
}, { idempotencyKey: 'replace-claim/client_123/attempt_2' });
```

This keeps the same workspace and invalidates the old link. A retry returns current state; always inspect status and the nullable link. Renewal requires the original creation lineage to remain live. A new credential lineage cannot revive its revoked claim. Ordinary credential rotation can preserve that lineage.

`expired` needs explicit renewal. `unavailable` requires resolving the original application's authority or registered return configuration; repeating creation cannot repair it. For uncertain network outcomes, use the explicit `error.recovery` key and repeat the same intent. Error inspection omits inputs and link secrets.
