import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { constructWebhookEvent, InsideDMWebhookVerificationError } from '../dist/esm/webhooks.js';
import { createWebhookFixture, TEST_WEBHOOK_SECRET, TEST_ID } from '../dist/esm/testing.js';

const NOW = 1_800_000_000;
const event = { id: 'evt_fixture', type: 'contact.changed', version: 1, occurredAt: '2026-01-01T00:00:00Z', change: 'updated',
  resource: { type: 'contact', id: TEST_ID, revision: '9007199254740993', deleted: false, parent: null, href: `/v1/contacts/${TEST_ID}` } };
const signed = (body = event, extra = {}) => ({ ...createWebhookFixture(body, { timestamp: NOW }), nowSeconds: NOW, ...extra });

test('delivery changes use the signed thin message reference and existing v1 transport', () => {
  const delivery = { ...event, type: 'message.delivery_changed', resource: { ...event.resource,
    type: 'message', parent: { type: 'conversation', id: TEST_ID }, href: `/v1/messages/${TEST_ID}` } };
  assert.deepEqual(constructWebhookEvent(signed(delivery)), { kind: 'event', event: delivery });
  assert.throws(() => constructWebhookEvent(signed({ ...delivery, resource: event.resource })), InsideDMWebhookVerificationError);
  assert.equal(constructWebhookEvent(signed({ ...delivery, version: 2 })).kind, 'unknown');
});

test('opt-in operation progress v2 retains business/producer correlation without changing v1 resources or HMAC', () => {
  const progress = { id: 'evt_operation', type: 'operation.changed', version: 2, occurredAt: event.occurredAt, change: 'updated', businessId: TEST_ID,
    producer: { kind: 'business_key', id: TEST_ID }, resource: { type: 'operation', id: TEST_ID, revision: 'op1_' + 'a'.repeat(43),
      deleted: false, parent: null, href: `/api/v1/inbox/${TEST_ID}/operations/${TEST_ID}` } };
  const result = constructWebhookEvent(signed(progress));
  assert.equal(result.kind, 'event'); assert.deepEqual(result.event, progress);
  assert.equal(constructWebhookEvent(signed(event)).event.version, 1);
  for (const version of [1, 3]) assert.equal(constructWebhookEvent(signed({ ...progress, version })).kind, 'unknown');
  for (const change of [{ businessId: 'bad' }, { producer: null }, { producer: { kind: 'app', id: TEST_ID } },
    { resource: { ...progress.resource, type: 'message' } }, { resource: { ...progress.resource, deleted: true } }]) {
    assert.throws(() => constructWebhookEvent(signed({ ...progress, ...change })), InsideDMWebhookVerificationError);
  }
});

test('exact timestamp dot raw-byte HMAC matches an independent normative vector', () => {
  const input = signed();
  const hmac = createHmac('sha256', Buffer.alloc(32)).update(String(NOW) + '.').update(input.rawBody).digest('hex');
  assert.equal(input.signature, `t=${NOW},v1=${hmac}`);
  const result = constructWebhookEvent(input);
  assert.equal(result.kind, 'event');
  assert.deepEqual(result.event, event);
  assert.equal(result.event.resource.revision, '9007199254740993');
});

test('application resource v2 retains exact merchant and installation attribution, while v1 remains unchanged',()=>{
  const application={id:TEST_ID,installationId:TEST_ID,authorityVersion:3},value={...event,version:2,businessId:TEST_ID,application};
  assert.deepEqual(constructWebhookEvent(signed(value)),{kind:'event',event:value});
  for(const change of [{businessId:'invalid'},{application:null},{application:{...application,authorityVersion:0}},{application:{...application,installationId:'invalid'}}]){
    assert.throws(()=>constructWebhookEvent(signed({...value,...change})),InsideDMWebhookVerificationError);
  }
  const delivery={...value,type:'message.delivery_changed',resource:{...event.resource,type:'message',parent:{type:'conversation',id:TEST_ID}}};
  assert.equal(constructWebhookEvent(signed(delivery)).kind,'event');
  for(const change of [{change:'deleted'},{resource:{...delivery.resource,deleted:true}},{resource:{...delivery.resource,parent:null}}]){
    assert.throws(()=>constructWebhookEvent(signed({...delivery,...change})),InsideDMWebhookVerificationError);
  }
  assert.equal(constructWebhookEvent(signed({...event,version:2})).kind,'unknown');
});
test('installation operation progress keeps its original grant epoch and must agree with application attribution',()=>{
  const value={id:'evt_installation_operation',type:'operation.changed',version:2,occurredAt:event.occurredAt,change:'updated',businessId:TEST_ID,
    producer:{kind:'installation',id:TEST_ID,authorityVersion:3},application:{id:TEST_ID,installationId:TEST_ID,authorityVersion:3},
    resource:{type:'operation',id:TEST_ID,revision:'op1_'+'a'.repeat(43),deleted:false,parent:null,href:`/api/v1/inbox/${TEST_ID}/operations/${TEST_ID}`}};
  assert.deepEqual(constructWebhookEvent(signed(value)),{kind:'event',event:value});
  for(const producer of [{kind:'installation',id:TEST_ID},{...value.producer,authorityVersion:4},{kind:'human',id:TEST_ID}]){
    assert.throws(()=>constructWebhookEvent(signed({...value,producer})),InsideDMWebhookVerificationError);
  }
  const {application:_app,...native}=value;assert.deepEqual(constructWebhookEvent(signed(native)),{kind:'event',event:native});
});

test('tampered raw bytes, stale/future timestamps and malformed headers never parse successfully', () => {
  const input = signed();
  for (const extra of [ { rawBody: input.rawBody + ' ' }, { nowSeconds: NOW + 301 }, { nowSeconds: NOW - 301 },
    { signature: null }, { signature: input.signature + ',t=' + NOW }, { signature: input.signature.replace('t=', ' t=') },
    { signature: input.signature + ',v2=' + 'a'.repeat(64) }, { rawBody: {} }, { rawBody: 'a'.repeat(65537) } ]) {
    assert.throws(() => constructWebhookEvent({ ...input, ...extra }), InsideDMWebhookVerificationError);
  }
  for (const toleranceSeconds of [NaN, Infinity, 0, -1, 301, '300']) assert.throws(() => constructWebhookEvent(signed(event, { toleranceSeconds })), InsideDMWebhookVerificationError);
  for (const nowSeconds of [NaN, Infinity, -1, 1.5]) assert.throws(() => constructWebhookEvent(signed(event, { nowSeconds })), InsideDMWebhookVerificationError);
});

test('key rotation accepts both keys and both signatures without weakening header parsing', () => {
  const other = `whsec_${Buffer.alloc(32, 1).toString('base64url')}`;
  const input = signed();
  assert.equal(constructWebhookEvent({ ...input, secret: [other, TEST_WEBHOOK_SECRET] }).kind, 'event');
  const alternate = createWebhookFixture(event, { timestamp: NOW, secret: other });
  const signature = `${input.signature},${alternate.signature.split(',')[1]}`;
  assert.equal(constructWebhookEvent({ ...input, signature, secret: other }).kind, 'event');
  assert.throws(() => constructWebhookEvent({ ...input, signature: `${input.signature},${input.signature.split(',')[1]}` }), InsideDMWebhookVerificationError);
  assert.throws(() => constructWebhookEvent({ ...input, secret: [other, other, TEST_WEBHOOK_SECRET] }), InsideDMWebhookVerificationError);
});

test('signed unknown types or versions are explicit minimal envelopes; malformed known events fail', () => {
  assert.deepEqual(constructWebhookEvent(signed({ id: 'future', type: 'future.event', version: 2, private: 'ignored' })), {
    kind: 'unknown', event: { id: 'future', type: 'future.event', version: 2 },
  });
  assert.equal(constructWebhookEvent(signed({ ...event, version: 2 })).kind, 'unknown');
  assert.throws(() => constructWebhookEvent(signed({ ...event, resource: { ...event.resource, type: 'order' } })), InsideDMWebhookVerificationError);
  assert.throws(() => constructWebhookEvent(signed({ ...event, resource: null })), InsideDMWebhookVerificationError);
  const testEvent = { id: 'evt_test', type: 'endpoint.test', version: 1, occurredAt: event.occurredAt, change: 'test', test: { endpointId: TEST_ID, challenge: 'fixture' } };
  assert.deepEqual(constructWebhookEvent(signed(testEvent)).event, testEvent);
});

test('endpoint verification verifies signature and expiry, then emits exact domain-separated proof', () => {
  const challenge = { type: 'endpoint.verify', version: 1, verificationId: 'ver_fixture', endpointId: TEST_ID,
    targetGeneration: 1, secretGeneration: 1, challenge: Buffer.alloc(16).toString('base64url'), expiresAt: new Date((NOW + 30) * 1000).toISOString() };
  const result = constructWebhookEvent(signed(challenge));
  assert.equal(result.kind, 'verification');
  assert.deepEqual(result.response, { challenge: challenge.challenge,
    proof: createHmac('sha256', Buffer.alloc(32)).update(`insidedm.endpoint.verify.v1.${challenge.verificationId}.${challenge.challenge}`).digest('hex') });
  assert.throws(() => constructWebhookEvent(signed(challenge, { nowSeconds: NOW + 30 })), (e) => e.code === 'expired_challenge');
});
