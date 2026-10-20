import assert from 'node:assert/strict';
import test from 'node:test';
import { InsideDMConfigurationError } from '../dist/esm/index.js';
import { createTestClient, TEST_ID } from '../dist/esm/testing.js';

test('one-key discovery shares workspace resolution and exposes the canonical template and readiness routes', async () => {
  const requests = [], sdk = createTestClient({ respond(request, response) { requests.push(request); return response; } });
  const page = await sdk.templates.list({ limit: 7 });
  assert.deepEqual(page.data, []); assert.equal(page.page.nextCursor, null);
  const ready = await sdk.messaging.getReadiness(); assert.equal(ready.data.channel, 'whatsapp');
  assert.deepEqual(requests.map(request => new URL(request.url).pathname), ['/v1/workspace', `/api/v1/inbox/${TEST_ID}/templates`, `/api/v1/inbox/${TEST_ID}/messaging-readiness`]);
  assert.equal(new URL(requests[1].url).searchParams.get('limit'), '7');
  for (const request of requests) { assert.equal(request.method, 'GET'); assert.equal(request.headers.get('idempotency-key'), null); assert.equal(await request.clone().text(), ''); }
});

test('template discovery validates runtime filters before any network request', async () => {
  let calls = 0; const sdk = createTestClient({ respond(_, response) { calls++; return response; } });
  for (const params of [{ limit: 0 }, { limit: 101 }, { conversationId: '../other' }, { senderId: TEST_ID }, { cursor: 'A'.repeat(2049) }]) {
    await assert.rejects(sdk.templates.list(params), InsideDMConfigurationError);
  }
  assert.equal(calls, 0);
});

test('template iteration is lazy and stops at the explicit page bound', async () => {
  let pages = 0; const sdk = createTestClient({ respond(request, response) {
    if (new URL(request.url).pathname.endsWith('/templates')) {
      pages++; return new Response(JSON.stringify({ data: [], page: { nextCursor: `cursor${pages}.${'A'.repeat(43)}` } }), { headers: response.headers });
    }
    return response;
  } });
  const iterator = sdk.templates.pages({}, { maxPages: 2 }); assert.equal(pages, 0);
  for await (const page of iterator) assert.deepEqual(page.data, []);
  assert.equal(pages, 2);
});
test('configuration discovery selects the restricted view of the existing settings endpoint', async () => {
  const requests = [], sdk = createTestClient({ respond(request, response) { requests.push(request); return response; } });
  const result = await sdk.messaging.getConfiguration();
  assert.deepEqual(result.data.value.templateAliases, {});
  assert.equal(result.data.version, null);
  assert.equal(requests[1].url, `https://api.insidedm.io/api/v1/dashboard/${TEST_ID}/developer/messaging-settings?view=configuration`);
  assert.equal(requests[1].headers.get('idempotency-key'), null);
  assert.equal(await requests[1].clone().text(), '');
});
