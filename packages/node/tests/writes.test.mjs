import assert from 'node:assert/strict';
import test from 'node:test';
import { inspect } from 'node:util';
import { InsideDM, InsideDMApiError, InsideDMConfigurationError } from '../dist/esm/index.js';
import { createTestClient, createProblemResponse, TEST_ID, TEST_REQUEST_ID } from '../dist/esm/testing.js';

const KEY = `idm_${Buffer.alloc(12).toString('base64url')}_${Buffer.alloc(32, 1).toString('base64url')}`;
const route = `/api/v1/dashboard/${TEST_ID}/contacts/${TEST_ID}/attributes`;
const json = (data) => new Response(JSON.stringify({ data }), { headers: { 'content-type': 'application/json', 'x-request-id': TEST_REQUEST_ID } });
const workspace = () => json({ id: TEST_ID, name: 'Fixture', timeZone: 'UTC', key: {
  id: TEST_ID, label: 'Fixture', prefix: 'idm_fixture', scopes: ['contacts.write'], state: 'active',
  createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-12-01T00:00:00Z',
} });
const client = (fetch, options = {}) => new InsideDM({ apiKey: KEY, fetch, maxRetries: 0, ...options });
const updated = (attributes) => json({ contactId: TEST_ID, attributes, revision: '90071992547409930001' });

test('profile edits freeze normalized names before discovery, recover the same key, and support explicit clearing', async () => {
  const input = { displayName: ' मीरा ' }, writes = []; let lost = false;
  const sdk = createTestClient({ respond: async (request, response) => {
    if (request.url.endsWith('/v1/workspace')) input.displayName = 'changed-after-call';
    if (request.method === 'PATCH') {
      writes.push({ url: request.url, body: await request.clone().text(), key: request.headers.get('idempotency-key') });
      if (!lost) { lost = true; throw new Error('Fixture response lost.'); }
    }
    return response;
  } });
  const result = await sdk.contacts.update(TEST_ID, input, { idempotencyKey: 'crm/profile/one', maxRetries: 1 });
  assert.equal(writes.length, 2); assert.deepEqual(writes[0], writes[1]);
  assert.equal(writes[0].url, `https://api.insidedm.io/api/v1/dashboard/${TEST_ID}/contacts/${TEST_ID}`);
  assert.deepEqual(JSON.parse(writes[0].body), { displayName: 'मीरा' }); assert.equal(result.data.displayName, 'मीरा');
  assert.equal((await sdk.contacts.update(TEST_ID, { displayName: null })).data.displayName, null);
});
test('profile edits refuse invalid runtime names and identity mutations before discovery, and check response identity', async () => {
  let calls = 0; const sdk = createTestClient({ respond(_, response) { calls++; return response; } });
  for (const input of [{}, { displayName: undefined }, { displayName: '' }, { displayName: ' ' }, { displayName: 'a\nb' },
    { displayName: 'x'.repeat(257) }, { displayName: 'Asha', phone: '+919999999999' }]) {
    await assert.rejects(sdk.contacts.update(TEST_ID, input), InsideDMConfigurationError);
  }
  assert.equal(calls, 0);
  const malformed = client(async url => url.endsWith('/v1/workspace') ? workspace() : json({ contactId: '11111111-1111-4111-8111-111111111111', displayName: 'Asha', revision: '1' }));
  await assert.rejects(malformed.contacts.update(TEST_ID, { displayName: 'Asha' }), error => error.kind === 'protocol');
});
test('profile recovery includes the operation and key without retaining or logging a customer name', async () => {
  const sdk = client(async url => { if (url.endsWith('/v1/workspace')) return workspace(); throw new Error('Fixture lost response.'); });
  await assert.rejects(sdk.contacts.update(TEST_ID, { displayName: 'Private customer' }, { idempotencyKey: 'private-profile-key' }), error => {
    assert.deepEqual(error.recovery, { operation: 'updateContact', contactId: TEST_ID, idempotencyKey: 'private-profile-key' });
    assert.equal(inspect(error).includes('Private customer'), false); assert.equal(JSON.stringify(error).includes('private-profile-key'), false);
    return error.kind === 'transport';
  });
});

test('one-key setup resolves the workspace and writes through the existing canonical route', async () => {
  const requests = [];
  const sdk = createTestClient({ respond(request, response) { requests.push(request); return response; } });
  const result = await sdk.contacts.attributes.update(TEST_ID, { attributes: { score: 0.75, preference: null } });
  assert.deepEqual(requests.map((request) => [request.method, new URL(request.url).pathname]), [['GET', '/v1/workspace'], ['PATCH', route]]);
  assert.deepEqual(result.data.attributes, { score: 0.75, preference: null });
  assert.match(result.meta.idempotencyKey, /^[a-f0-9-]{36}$/);
  assert.equal(requests[1].headers.get('idempotency-key'), result.meta.idempotencyKey);
  await sdk.contacts.attributes.update(TEST_ID, { attributes: { score: 1 } });
  assert.equal(requests.length, 3);
  assert.notEqual(requests[2].headers.get('idempotency-key'), result.meta.idempotencyKey);
});

test('writes validate runtime values, sizes and opaque keys before any network call', async () => {
  let calls = 0;
  const sdk = createTestClient({ respond(_, response) { calls++; return response; } });
  for (const input of [{ attributes: {} }, { attributes: { score: NaN } }, { attributes: { score: undefined } },
    { attributes: { nested: {} } }, { attributes: { 'Bad key': 1 } }, { attributes: { score: 1 }, extra: true },
    { attributes: { preference: '\0' } }, { attributes: { preference: '\ud800' } },
    { attributes: { preference: 'x'.repeat(65536) } }, { attributes: Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`field_${i}`, 1])) }]) {
    await assert.rejects(sdk.contacts.attributes.update(TEST_ID, input), InsideDMConfigurationError);
  }
  for (const idempotencyKey of ['', ' leading', 'trailing ', 'line\nbreak', 'é', 'x'.repeat(129)]) {
    await assert.rejects(sdk.contacts.attributes.update(TEST_ID, { attributes: { score: 1 } }, { idempotencyKey }), InsideDMConfigurationError);
  }
  await assert.rejects(sdk.contacts.attributes.update('../contacts', { attributes: { score: 1 } }), InsideDMConfigurationError);
  assert.equal(calls, 0);
});

test('a lost response retries the same serialized intent and key without duplicating caller mutations', async () => {
  const inputs = [];
  const patch = { attributes: { score: 1 } };
  const sdk = client(async (url, init) => {
    if (url.endsWith('/v1/workspace')) return workspace();
    inputs.push({ method: init.method, key: init.headers['idempotency-key'], body: init.body });
    if (inputs.length === 1) { patch.attributes.score = 99; throw new Error('response lost'); }
    return updated({ score: 1 });
  }, { maxRetries: 1 });
  const result = await sdk.contacts.attributes.update(TEST_ID, patch, { idempotencyKey: 'job/contact/one' });
  assert.equal(inputs.length, 2);
  assert.deepEqual(inputs[0], inputs[1]);
  assert.deepEqual(JSON.parse(inputs[0].body), { attributes: { score: 1 } });
  assert.equal(result.meta.attempts, 2);
  assert.equal(result.meta.idempotencyKey, 'job/contact/one');
  assert.equal(result.data.revision, '90071992547409930001');
});

test('uncertain results expose explicit recovery context without including it in default error logs', async () => {
  const sdk = client(async (url) => { if (url.endsWith('/v1/workspace')) return workspace(); throw new Error('fixture failure'); });
  let recovery;
  await assert.rejects(sdk.contacts.attributes.update(TEST_ID, { attributes: { score: 1 } }, { idempotencyKey: 'private-order-123' }), (error) => {
    recovery = error.recovery;
    assert.deepEqual(recovery, { operation: 'updateContactAttributes', contactId: TEST_ID, idempotencyKey: 'private-order-123' });
    assert.ok(Object.isFrozen(recovery));
    assert.equal(inspect(error).includes('private-order-123'), false);
    assert.equal(JSON.stringify(error).includes('private-order-123'), false);
    return error.kind === 'transport';
  });
  assert.ok(recovery);
});

test('permission and idempotency conflicts retain typed API errors and are never retried', async () => {
  for (const code of ['insufficient_scope', 'invalid_token', 'idempotency_conflict']) {
    let writes = 0;
    const sdk = client(async (url) => { if (url.endsWith('/v1/workspace')) return workspace(); writes++; return createProblemResponse(code); }, { maxRetries: 2 });
    await assert.rejects(sdk.contacts.attributes.update(TEST_ID, { attributes: { score: 1 } }), (error) => error instanceof InsideDMApiError && error.code === code && error.recovery.idempotencyKey.length > 0);
    assert.equal(writes, 1);
  }
});

test('the total write deadline includes workspace discovery and a stream that ignores cancellation', async () => {
  let writes = 0;
  const sdk = client(async (url) => {
    if (url.endsWith('/v1/workspace')) { await new Promise((resolve) => setTimeout(resolve, 25)); return workspace(); }
    writes++;
    return new Response(new ReadableStream({ start() {} }), { headers: { 'content-type': 'application/json', 'x-request-id': TEST_REQUEST_ID } });
  }, { timeoutMs: 500, attemptTimeoutMs: 450 });
  const began = performance.now();
  await assert.rejects(sdk.contacts.attributes.update(TEST_ID, { attributes: { score: 1 } }), (error) => error.kind === 'timeout' && error.recovery.operation === 'updateContactAttributes');
  assert.equal(writes, 1);
  assert.ok(performance.now() - began < 1500);
});

test('dynamic attributes are validated and unknown response properties are removed', async () => {
  const sdk = client(async (url) => url.endsWith('/v1/workspace') ? workspace() : json({ contactId: TEST_ID, revision: '1', attributes: { active: true, score: 1.25, preference: null }, private: 'omit' }));
  const { data } = await sdk.contacts.attributes.update(TEST_ID, { attributes: { score: 1.25 } });
  assert.deepEqual(data, { contactId: TEST_ID, revision: '1', attributes: { active: true, score: 1.25, preference: null } });
  for (const attributes of [{ nested: {} }, { score: [] }, { 'Bad key': 'value' }]) {
    await assert.rejects(client(async (url) => url.endsWith('/v1/workspace') ? workspace() : updated(attributes)).contacts.attributes.update(TEST_ID, { attributes: { score: 1 } }), (error) => error.kind === 'protocol');
  }
});

test('tag replacement freezes a normalized full set before discovery and retries the same canonical request and key', async () => {
  const input = { tags: [' VIP ', 'Seasonal', 'vip'] }, writes = []; let lost = false;
  const sdk = createTestClient({ respond: async (request, response) => {
    if (request.url.endsWith('/v1/workspace')) input.tags.push('changed-after-call');
    if (request.method === 'PATCH') {
      writes.push({ url: request.url, body: await request.clone().text(), key: request.headers.get('idempotency-key') });
      if (!lost) { lost = true; throw new Error('Fixture response lost.'); }
    }
    return response;
  } });
  const result = await sdk.contacts.tags.replace(TEST_ID, input, { idempotencyKey: 'crm/tags/one', maxRetries: 1 });
  assert.equal(writes.length, 2); assert.deepEqual(writes[0], writes[1]);
  assert.equal(writes[0].url, `https://api.insidedm.io/api/v1/dashboard/${TEST_ID}/contacts/${TEST_ID}/tags`);
  assert.deepEqual(JSON.parse(writes[0].body), { tags: ['seasonal', 'vip'] }); assert.deepEqual(result.data.tags, ['seasonal', 'vip']);
  assert.deepEqual((await sdk.contacts.tags.replace(TEST_ID, { tags: [] })).data.tags, []);
});
test('invalid tag lists fail before any network request, and malformed contact observations are refused', async () => {
  let calls = 0; const sdk = createTestClient({ respond(_, response) { calls++; return response; } });
  for (const input of [{ tags: [' '] }, { tags: [null] }, { tags: Array.from({ length: 51 }, () => 'vip') }, { tags: ['x'.repeat(257)] }, { tags: [], actorId: TEST_ID }]) {
    await assert.rejects(sdk.contacts.tags.replace(TEST_ID, input), InsideDMConfigurationError);
  }
  assert.equal(calls, 0);
  for (const data of [{ contactId: '11111111-1111-4111-8111-111111111111', tags: [], revision: '1' }, { contactId: TEST_ID, tags: ['VIP'], revision: '1' }]) {
    const malformed = client(async url => url.endsWith('/v1/workspace') ? workspace() : json(data));
    await assert.rejects(malformed.contacts.tags.replace(TEST_ID, { tags: [] }), error => error.kind === 'protocol');
  }
});
test('an uncertain tag replacement exposes its recovery key without logging the tag values', async () => {
  const sdk = client(async url => { if (url.endsWith('/v1/workspace')) return workspace(); throw new Error('Fixture response lost.'); });
  await assert.rejects(sdk.contacts.tags.replace(TEST_ID, { tags: ['sensitive-segment'] }, { idempotencyKey: 'crm/tag-change/private' }), error => {
    assert.deepEqual(error.recovery, { operation: 'replaceContactTags', contactId: TEST_ID, idempotencyKey: 'crm/tag-change/private' });
    assert.equal(inspect(error).includes('sensitive-segment'), false); assert.equal(JSON.stringify(error).includes('crm/tag-change/private'), false);
    return error.kind === 'transport';
  });
});
test('contact creation supplies its channel, freezes its address before discovery and recovers the same request', async () => {
  const input = { name: ' Asha ', phone: '+6591234567' }, writes = []; let lost = false;
  const sdk = createTestClient({ respond: async (request, response) => {
    if (request.url.endsWith('/v1/workspace')) input.phone = '+919800000099';
    if (request.method === 'POST') {
      writes.push({ url: request.url, body: await request.clone().text(), key: request.headers.get('idempotency-key') });
      if (!lost) { lost = true; throw new Error('Fixture response lost.'); }
    }
    return response;
  } });
  const result = await sdk.contacts.create(input, { idempotencyKey: 'crm/customer/create-one', maxRetries: 1 });
  assert.equal(writes.length, 2); assert.deepEqual(writes[0], writes[1]);
  assert.equal(writes[0].url, `https://api.insidedm.io/api/v1/dashboard/${TEST_ID}/contacts?view=reference`);
  assert.deepEqual(JSON.parse(writes[0].body), { channel: 'whatsapp', name: 'Asha', phone: '+6591234567' });
  assert.deepEqual(result.data, { contactId: TEST_ID, revision: '1' });
});
test('contact creation rejects consent, sender controls and malformed addresses locally', async () => {
  let calls = 0; const sdk = createTestClient({ respond(_, response) { calls++; return response; } });
  for (const input of [{ name: 'Asha', phone: '6591234567' }, { name: '', phone: '+6591234567' },
    { name: 'Asha', phone: '+6591234567', consent: 'granted' }, { name: 'Asha', phone: '+6591234567', channel: 'whatsapp' },
    { name: 'Asha', phone: '+6591234567', senderId: TEST_ID }]) await assert.rejects(sdk.contacts.create(input), InsideDMConfigurationError);
  assert.equal(calls, 0);
});
test('uncertain contact creation exposes its recovery key without retaining recipient data in error logs', async () => {
  const sdk = client(async url => { if (url.endsWith('/v1/workspace')) return workspace(); throw new Error('Fixture response lost.'); });
  await assert.rejects(sdk.contacts.create({ name: 'Private name', phone: '+6591234567' }), error => {
    assert.equal(error.recovery.operation, 'createContact'); assert.match(error.recovery.idempotencyKey, /^[a-f0-9-]{36}$/);
    assert.equal(inspect(error).includes('6591234567'), false); assert.equal(inspect(error).includes('Private name'), false);
    assert.equal(JSON.stringify(error).includes(error.recovery.idempotencyKey), false); return error.kind === 'transport';
  });
});
