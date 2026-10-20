import assert from 'node:assert/strict';
import test from 'node:test';
import { InsideDMPlatform, InsideDMConfigurationError, InsideDMProtocolError } from '../dist/esm/index.js';
import { createTestClient, createProblemResponse, TEST_ID, TEST_REQUEST_ID } from '../dist/esm/testing.js';
const period = { from: '2026-10-01T00:00:00.000Z', to: '2026-10-02T00:00:00.000Z' };
const summary = () => ({ businessId: TEST_ID, attribution: 'business', period, timeBasis: 'dispatch_admitted_at',
  source: 'retained_ai_dispatch_observation_receipts', meterVersion: '1', asOf: '2026-10-20T00:00:00.000Z', finality: 'provisional',
  ai: { calls: 1, inputTokens: 200, outputTokens: 50 } });
const json = data => new Response(JSON.stringify({ data }), { headers: { 'content-type': 'application/json', 'x-request-id': TEST_REQUEST_ID } });
const limits = () => ({ businessId: TEST_ID, source: 'current_plan_in_force', asOf: '2026-10-20T00:00:00.000Z',
  plan: { code: 'scale', versionId: 'scale-2026-10b', entitlementProfileVersion: 'entitlements-2026-09-21' },
  limits: { agentSlots: 'all', seats: 20, conversations: { quantity: 10000, period: 'month', enforcement: 'soft' },
    includedAi: { amountMinor: '100000', currency: 'INR', unit: 'paise', period: 'month' } } });

test('direct usage uses one-key discovery and the fixed view of the existing billing route', async () => {
  const requests = [], client = createTestClient({ respond(request, response) { requests.push(request); return response; } });
  assert.equal(requests.length, 0);
  const report = await client.usage.get({ from: new Date(period.from), to: '2026-10-02T00:00:00Z' });
  assert.deepEqual(report.data.period, period); assert.equal(report.data.attribution, 'business');
  assert.equal(report.data.finality, 'provisional'); assert.deepEqual(report.data.ai, { calls: 0, inputTokens: 0, outputTokens: 0 });
  assert.deepEqual(requests.map(r => new URL(r.url).pathname), ['/v1/workspace', `/api/v1/dashboard/${TEST_ID}/billing/v2`]);
  const request = requests[1], query = new URL(request.url).searchParams;
  assert.equal(query.get('view'), 'software_usage'); assert.equal(query.get('from'), period.from); assert.equal(query.get('to'), period.to);
  assert.equal(request.method, 'GET'); assert.equal(request.headers.get('idempotency-key'), null); assert.equal(await request.clone().text(), '');
});
test('invalid usage intervals, extra authority/price fields and mutation options fail before discovery', async () => {
  let calls = 0; const client = createTestClient({ respond(_, response) { calls++; return response; } });
  for (const input of [null, {}, { ...period, businessId: TEST_ID }, { ...period, price: 1 }, { ...period, from: new Date(NaN) },
    { ...period, from: '2026-02-30T00:00:00Z' }, { ...period, to: period.from }, { ...period, to: '2026-12-01T00:00:00Z' },
    { ...period, from: '2026-10-01' }]) await assert.rejects(client.usage.get(input), InsideDMConfigurationError);
  await assert.rejects(client.usage.get(period, { idempotencyKey: 'usage' }), InsideDMConfigurationError);
  assert.equal(calls, 0);
});
test('usage response binding rejects a foreign business, changed interval, finality or overflowing totals', async () => {
  for (const patch of [{ businessId: '11111111-1111-4111-8111-111111111111' }, { period: { ...period, from: '2026-09-30T00:00:00.000Z' } },
    { finality: 'final' }, { ai: { calls: 1, inputTokens: Number.MAX_SAFE_INTEGER, outputTokens: 1 } }]) {
    const client = createTestClient({ respond(request, response) { return new URL(request.url).pathname.endsWith('/billing/v2') ? json({ ...summary(), ...patch }) : response; } });
    await assert.rejects(client.usage.get(period), InsideDMProtocolError);
  }
});
test('approved business clients keep usage separate from application request telemetry and freeze retry inputs', async () => {
  const urls = [], from = new Date(period.from), input = { from, to: period.to };
  const appKey = `idmp_${Buffer.alloc(12, 7).toString('base64url')}_${Buffer.alloc(32, 9).toString('base64url')}`;
  const delegationKey = `idmd_${Buffer.alloc(12, 8).toString('base64url')}_${Buffer.alloc(32, 10).toString('base64url')}`;
  const platform = new InsideDMPlatform({ apiKey: appKey, baseUrl: 'https://api.example', maxRetries: 1, fetch: async (url, init) => {
    const parsed = new URL(url);
    if (parsed.pathname === '/api/v1/platform/delegations') return json({ token: delegationKey, businessId: TEST_ID,
      applicationId: TEST_ID, installationId: TEST_ID, authorityVersion: '1', scopes: ['usage.read'], expiresAt: new Date(Date.now() + 60_000).toISOString() });
    assert.equal(parsed.pathname, `/api/v1/dashboard/${TEST_ID}/billing/v2`);
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${delegationKey}`);
    urls.push(String(url)); from.setUTCFullYear(2020); input.to = '2026-11-01T00:00:00.000Z';
    return urls.length === 1 ? createProblemResponse('rate_limited', { retryAfterSeconds: 0 }) : json(summary());
  } });
  const result = await platform.forBusiness(TEST_ID).usage.get(input);
  assert.equal(result.meta.attempts, 2); assert.equal(result.data.source, 'retained_ai_dispatch_observation_receipts');
  assert.equal(urls.length, 2); assert.equal(urls[0], urls[1]);
});
test('current limits use the same GET operation with only its fixed software_limits view', async () => {
  const requests = [], client = createTestClient({ respond(request, response) { requests.push(request); return response; } });
  const report = await client.usage.getLimits();
  assert.equal(report.data.source, 'current_plan_in_force'); assert.equal(report.data.limits.conversations.enforcement, 'soft');
  assert.equal(report.data.limits.includedAi.unit, 'paise'); assert.equal(typeof report.data.limits.includedAi.amountMinor, 'string');
  assert.equal(requests[1].url, `https://sdk-fixture.invalid/api/v1/dashboard/${TEST_ID}/billing/v2?view=software_limits`);
  assert.equal(requests[1].headers.get('idempotency-key'), null);
});
test('limits reject unsupported caller filters and mutation options before discovery', async () => {
  let calls = 0; const client = createTestClient({ respond(_, response) { calls++; return response; } });
  for (const options of [{ from: period.from }, { idempotencyKey: 'limits' }, { businessId: TEST_ID }, { price: 0 }]) {
    await assert.rejects(client.usage.getLimits(options), InsideDMConfigurationError);
  }
  assert.equal(calls, 0);
});
test('typed wrappers refuse swapped views, foreign limits and unsafe invented entitlement semantics', async () => {
  const withResult = data => createTestClient({ respond(request, response) { return new URL(request.url).pathname.endsWith('/billing/v2') ? json(data) : response; } });
  await assert.rejects(withResult(limits()).usage.get(period), InsideDMProtocolError);
  await assert.rejects(withResult(summary()).usage.getLimits(), InsideDMProtocolError);
  for (const patch of [{ businessId: '11111111-1111-4111-8111-111111111111' }, { source: 'sold_subscription' },
    { limits: { ...limits().limits, agentSlots: 0 } }, { limits: { ...limits().limits, includedAi: { ...limits().limits.includedAi, amountMinor: 100000 } } }]) {
    await assert.rejects(withResult({ ...limits(), ...patch }).usage.getLimits(), InsideDMProtocolError);
  }
  const result = await withResult(limits()).usage.getLimits(); assert.equal(result.data.limits.agentSlots, 'all');
});
