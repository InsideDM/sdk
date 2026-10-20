import assert from 'node:assert/strict';
import test from 'node:test';
import { createN8nResourceBridge } from '../examples/n8nResourceBridge.mjs';
import { createWebhookFixture, TEST_ID, TEST_WEBHOOK_SECRET } from '../dist/esm/testing.js';

const OTHER = '01900000-0000-7000-8000-000000000002';
const event = { id: 'evt_bridge', type: 'contact.changed', version: 1, occurredAt: new Date().toISOString(), change: 'updated',
  resource: { type: 'contact', id: TEST_ID, revision: '1', deleted: false, parent: null, href: `/v1/contacts/${TEST_ID}` } };
const request = (body = event, change = {}) => {
  const fixture = createWebhookFixture(body);
  return new Request('https://backend.example/insidedm', { method: 'POST',
    headers: { 'x-insidedm-signature': fixture.signature }, body: fixture.rawBody, ...change });
};
const bridge = (accept, extra = {}) => createN8nResourceBridge({ receiverId: TEST_ID, identity: { businessId: TEST_ID },
  secret: TEST_WEBHOOK_SECRET, accept, ...extra });

test('bridge waits for durable acceptance, preserves bytes and uses event identity across attempts', async () => {
  let release, observed;
  const received = new Promise(resolve => { release = resolve; });
  const inbox = new Map();
  const handler = bridge(async job => {
    observed = job; await received;
    const previous = inbox.get(job.key);
    if (previous) return previous.digest === job.digest ? 'duplicate' : 'conflict';
    inbox.set(job.key, job); return 'inserted';
  });
  let answered = false;
  const pending = handler(request()).then(result => { answered = true; return result; });
  await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(answered, false);
  release(); assert.equal((await pending).status, 202);
  assert.equal(observed.businessId, TEST_ID); assert.equal(observed.application, null);
  assert.deepEqual(observed.event, event);
  assert.equal((await handler(request())).status, 202); assert.equal(inbox.size, 1);
  assert.equal((await handler(request({ ...event, change: 'created' }))).status, 409);
  assert.equal(inbox.size, 1);
});

test('bridge failures and refused original authority never acknowledge a queued event', async () => {
  for (const accept of [async () => { throw new Error('private queue details'); }, async () => 'unknown']) {
    const response = await bridge(accept)(request()); assert.equal(response.status, 503);
    assert.equal(await response.text(), '{"code":"inbox_unavailable"}');
  }
  assert.equal((await bridge(async () => 'refused')(request())).status, 403);
});

test('bridge verifies raw signatures, body bounds and methods before durable work', async () => {
  let calls = 0; const handler = bridge(async () => { calls++; return 'inserted'; });
  assert.equal((await handler(request(event, { body: JSON.stringify(event) + ' ' }))).status, 400);
  assert.equal((await handler(request(event, { body: 'x'.repeat(65537) }))).status, 413);
  const get = await handler(new Request('https://backend.example/insidedm'));
  assert.equal(get.status, 405); assert.equal(get.headers.get('allow'), 'POST');
  assert.equal((await handler(request({ type: 'future.event', version: 99 }))).status, 204);
  assert.equal(calls, 0);
});

test('verification answers only this configured receiver and never queues challenges or tests', async () => {
  let calls = 0; const handler = bridge(async () => { calls++; return 'inserted'; });
  const challenge = { type: 'endpoint.verify', version: 1, verificationId: 'ver_bridge', endpointId: TEST_ID,
    targetGeneration: 1, secretGeneration: 1, challenge: Buffer.alloc(16).toString('base64url'), expiresAt: new Date(Date.now() + 60_000).toISOString() };
  const response = await handler(request(challenge)); assert.equal(response.status, 200);
  assert.equal((await response.json()).challenge, challenge.challenge);
  assert.equal((await handler(request({ ...challenge, endpointId: OTHER }))).status, 403);
  const probe = { id: 'evt_probe', type: 'endpoint.test', version: 1, occurredAt: event.occurredAt, change: 'test', test: { endpointId: TEST_ID, challenge: 'probe' } };
  assert.equal((await handler(request(probe))).status, 204);
  assert.equal((await handler(request({ ...probe, test: { ...probe.test, endpointId: OTHER } }))).status, 403);
  assert.equal(calls, 0);
});

test('partner bridge preserves the exact original installation epoch and refuses cross-application events', async () => {
  const application = { id: TEST_ID, installationId: OTHER, authorityVersion: 3 };
  const value = { ...event, version: 2, businessId: OTHER, application }; let observed;
  const handler = bridge(async job => { observed = job; return 'inserted'; }, { identity: { applicationId: TEST_ID } });
  assert.equal((await handler(request(value))).status, 202);
  assert.equal(observed.businessId, OTHER); assert.deepEqual(observed.application, application);
  for (const invalid of [event, { ...value, application: { ...application, id: OTHER } }]) {
    assert.equal((await handler(request(invalid))).status, 403);
  }
  assert.equal((await bridge(async () => 'inserted')(request(value))).status, 403);
  const nativeOperation = { id: 'evt_operation', type: 'operation.changed', version: 2, occurredAt: event.occurredAt, change: 'updated',
    businessId: OTHER, producer: { kind: 'business_key', id: TEST_ID }, resource: { type: 'operation', id: TEST_ID,
      revision: 'op1_' + 'a'.repeat(43), deleted: false, parent: null, href: `/api/v1/inbox/${OTHER}/operations/${TEST_ID}` } };
  assert.equal((await bridge(async () => 'inserted')(request(nativeOperation))).status, 403);
});

test('bridge captures configuration and rejects ambiguous identities or missing durable acceptance', async () => {
  const identity = { businessId: TEST_ID }, secrets = [TEST_WEBHOOK_SECRET];
  const handler = bridge(async () => 'inserted', { identity, secret: secrets });
  identity.businessId = OTHER; secrets.length = 0;
  assert.equal((await handler(request())).status, 202);
  for (const change of [{ accept: null }, { receiverId: 'bad' }, { identity: {} },
    { identity: { businessId: TEST_ID, applicationId: OTHER } }, { secret: [] }, { secret: 'bad' }]) {
    assert.throws(() => bridge(async () => 'inserted', change), TypeError);
  }
});
