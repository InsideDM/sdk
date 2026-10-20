# Partner SDK reference

[Complete the partner quickstart](partner-quickstart.md) for application setup,
merchant approval, saved client mappings and the first notification. The examples
below use that configured server-side platform client. See [client provisioning](client-provisioning.md),
[hosted WhatsApp setup](hosted-onboarding.md), [application webhooks](partner-webhooks.md)
and [reusable flows](blueprints.md) for those separate journeys.

To inspect or disconnect one client's installation:

```ts
const { data: installation } = await platform.installations.get(savedInstallationId);
const { data: current } = await platform.installations.revoke(installation.id, {
  expectedRevision: installation.revision,
  reason: 'requested', // or 'security' / 'service_ended'
}, { idempotencyKey: disconnectAttempt.id });
```

Inspection requires `platform.businesses.read`; revocation requires `platform.installations.manage`. Both operate only on your application's own installation; the server resolves its business. Revocation stops new effects under that grant without changing another client, business ownership or software billing. Messages already submitted to the provider may still deliver.

Reuse the same input and key after a lost revoke answer. Check `current.status`: a replay of an old intent after fresh merchant approval returns the current active grant and cannot revoke that new approval. Use its current revision and a new intent key for a new disconnect decision. This SDK has no method for approving an installation on a merchant's behalf.

Discover currently connected businesses with `platform.businesses.list()` or lazy pagination:

```ts
for await (const business of platform.businesses.iterate({ limit: 25 }, { maxItems: 100 })) {
  // business.id, name, status, timeZone and this application's installation.
}
const { data: profile } = await platform.businesses.get(savedBusinessId);
```

These methods require `platform.businesses.read` and a current active installation for each profile. They return business metadata without contacts, transcripts or merchant identities. A revoked installation's fresh profile is unavailable; its administrative state remains available through `installations.get`. Portfolio methods operate across your approved clients on your server. Filter any client-facing view through your own authenticated client mapping.

Portfolio pages allow 1–50 candidates (default 25). Cursors bind the application, effective scopes, limit and first-page approval cutoff for fifteen minutes. A revoked candidate can produce an empty page with a next cursor; the SDK's iterators continue correctly. Keep the same parameters and follow `page.nextCursor` when paging manually. `invalid_cursor`, including expiry, stops the walk explicitly; the SDK does not silently restart it or add later approvals to that walk.

Read your application's recorded API counters for a client:

```ts
const { data: usage } = await platform.usage.get({ businessId: client.insideDmBusinessId });
// Seven complete UTC days by default; counts, points and freshness are explicit.
const { data: daily } = await platform.usage.get({
  businessId: client.insideDmBusinessId,
  from: '2026-10-01',
  to: new Date('2026-10-02T00:00:00Z'),
});
```

This requires `platform.usage.read`, independently of business-profile or transcript permissions. It includes only this application's installation producer. Own historical telemetry remains readable after client disconnection; it restores no business access.

`basis: 'telemetry'` and `freshness.source` identify batched API request counts. They can lag and are not billing, provider cost, authoritative software consumption or hard quotas. Day windows cover at most 31 days; minute windows at most 24 hours. Only complete UTC buckets inside the rolling retention window are supported. Unavailable history and unfinished buckets return an error rather than false zeros. Keep these reads on your server and enforce your authenticated client mapping before returning client-facing reports.

Read observed AI software consumption for a business with the separately approved `usage.read` scope:

```ts
const business = platform.forBusiness(client.insideDmBusinessId);
// The same usage.get() method is available on a direct InsideDM client.
const { data: consumption } = await business.usage.get({
  from: new Date('2026-10-01T00:00:00Z'),
  to: '2026-10-02T00:00:00Z',
});
console.log(consumption.ai.inputTokens, consumption.ai.outputTokens);
```

This reports the business's observed AI calls and whole input/output tokens across all execution origins. It uses the existing billing read's fixed `software_usage` view; human readers require `billing.view`. API telemetry permission alone grants no access, and disconnecting the installation stops fresh consumption reads.

Supply UTC timestamps or `Date` values for an explicit inclusive-start, exclusive-end interval: at most 31 days within the last 365 days, ending no later than the server's current time. Unsupported windows return an error. Calls count retained dispatch/observation receipt pairs, independently of run traces. Missing observations are absent; later observations can revise earlier totals. `source`, `meterVersion`, `timeBasis` and `finality: 'provisional'` explain the result. `asOf` is the read time, not a completeness watermark. Zero means no matching retained observations, with no promise of retroactive coverage. This response contains no prices, invoices, quotas, wallet amounts or Meta charges.
