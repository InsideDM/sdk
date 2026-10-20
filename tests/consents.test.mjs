import assert from 'node:assert/strict';
import test from 'node:test';
import { inspect } from 'node:util';
import { InsideDMConfigurationError } from '../dist/esm/index.js';
import { createTestClient, TEST_ID } from '../dist/esm/testing.js';

test('marketing opt-in takes one retained message ID and freezes its body and key across discovery and retry', async () => {
  const input = { messageId: TEST_ID }, writes = []; let lost = false;
  const sdk = createTestClient({ respond: async (request, response) => {
    if (request.url.endsWith('/v1/workspace')) input.messageId = '11111111-1111-4111-8111-111111111111';
    if (request.method === 'POST') {
      writes.push({ url: request.url, body: await request.clone().text(), key: request.headers.get('idempotency-key') });
      if (!lost) { lost = true; throw new Error('Fixture lost response.'); }
    }
    return response;
  } });
  const result = await sdk.consents.recordMarketingOptIn(input, { idempotencyKey: 'crm/native-message/one', maxRetries: 1 });
  assert.equal(writes.length, 2); assert.deepEqual(writes[0], writes[1]);
  assert.equal(writes[0].url, `https://sdk-fixture.invalid/api/v1/dashboard/${TEST_ID}/consents/marketing-opt-in`);
  assert.deepEqual(JSON.parse(writes[0].body), { messageId: TEST_ID });
  assert.equal(result.data.purpose, 'marketing'); assert.equal(result.data.status, 'granted');
  assert.equal(result.meta.idempotencyKey, 'crm/native-message/one');
});
test('marketing opt-in refuses consent claims, quotes and malformed references before any network request', async () => {
  let calls = 0; const sdk = createTestClient({ respond(_, response) { calls++; return response; } });
  for (const input of [{}, { messageId: '../private' }, { messageId: undefined }, { messageId: TEST_ID, origin: 'verified' },
    { messageId: TEST_ID, customerText: 'Send me offers' }, { messageId: TEST_ID, purpose: 'utility' }]) {
    await assert.rejects(sdk.consents.recordMarketingOptIn(input), InsideDMConfigurationError);
  }
  assert.equal(calls, 0);
});
test('an uncertain opt-in exposes only its operation/key for recovery, and default logs omit the key', async () => {
  const sdk = createTestClient({ respond(request, response) { if (request.method === 'POST') throw new Error('Fixture lost response.'); return response; } });
  await assert.rejects(sdk.consents.recordMarketingOptIn({ messageId: TEST_ID }, { idempotencyKey: 'private-opt-in-key' }), error => {
    assert.deepEqual(error.recovery, { operation: 'recordMarketingOptIn', idempotencyKey: 'private-opt-in-key' });
    assert.equal(inspect(error).includes('private-opt-in-key'), false); assert.equal(JSON.stringify(error).includes('private-opt-in-key'), false);
    return error.kind === 'transport';
  });
});
test('consent withdrawal uses the canonical suppression endpoint with one retained intent key', async () => {
  const writes = [], input = { to: { phone: '+919800000099' }, purpose: 'marketing' }; let lost = false;
  const sdk = createTestClient({ respond: async (request, response) => {
    if (request.method === 'POST') {
      writes.push({ body: await request.clone().text(), key: request.headers.get('idempotency-key'), url: request.url });
      if (!lost) { lost = true; input.purpose = 'utility'; throw new Error('Fixture response lost.'); }
    }
    return response;
  } });
  await sdk.consents.withdraw(input, { idempotencyKey: 'crm/opt-out/one', maxRetries: 1 });
  assert.equal(writes.length, 2); assert.deepEqual(writes[0], writes[1]);
  assert.equal(writes[0].url, `https://sdk-fixture.invalid/api/v1/dashboard/${TEST_ID}/consents/withdraw`);
});
test('consent grants and invalid destinations fail locally without discovering the workspace', async () => {
  let calls = 0; const sdk = createTestClient({ respond(_, response) { calls++; return response; } });
  for (const input of [{ to: { phone: '9800000099' }, purpose: 'marketing' }, { to: { phone: '+919800000099' }, purpose: 'marketing', status: 'granted' }]) {
    await assert.rejects(sdk.consents.withdraw(input), InsideDMConfigurationError);
  }
  assert.equal(calls, 0);
});
test('an uncertain withdrawal exposes its original recovery key without recipient data in logs', async () => {
  const phone = '+919800000099';
  const sdk = createTestClient({ respond(request, response) { if (request.method === 'POST') throw new Error('Fixture response lost.'); return response; } });
  await assert.rejects(sdk.consents.withdraw({ to: { phone }, purpose: 'marketing' }), error => {
    assert.equal(error.recovery.operation, 'withdrawConsent'); assert.match(error.recovery.idempotencyKey, /^[a-f0-9-]{36}$/);
    assert.equal(inspect(error).includes(phone), false); assert.equal(JSON.stringify(error).includes(error.recovery.idempotencyKey), false);
    return error.kind === 'transport';
  });
});
test('consent discovery uses the shared contact history view and validates contact IDs before any network call', async () => {
  const urls = [], sdk = createTestClient({ respond(request, response) { urls.push(request.url); return response; } });
  for (const id of [undefined, null, '', 'not-a-contact', '+919800000099']) await assert.rejects(sdk.consents.get(id), InsideDMConfigurationError);
  assert.equal(urls.length, 0);
  const result = await sdk.consents.get(TEST_ID);
  assert.deepEqual(result.data, { contactId: TEST_ID, identities: [] });
  assert.equal(urls[1], `https://sdk-fixture.invalid/api/v1/dashboard/${TEST_ID}/contacts/consent-history?view=messaging&contactId=${TEST_ID}`);
});
test('consent discovery rejects another contact and malformed duplicate-purpose observations', async () => {
  for (const data of [
    { contactId: '11111111-1111-4111-8111-111111111111', identities: [] },
    { contactId: TEST_ID, identities: [{ identityId: TEST_ID, channel: 'whatsapp', handle: '919800000099',
      purposes: Array.from({ length: 5 }, () => ({ purpose: 'marketing', status: 'unknown', changedAt: null })) }] },
  ]) {
    const sdk = createTestClient({ respond(request, response) {
      if (request.url.includes('consent-history')) return new Response(JSON.stringify({ data }), { headers: response.headers });
      return response;
    } });
    await assert.rejects(sdk.consents.get(TEST_ID), error => error.kind === 'protocol');
  }
});
