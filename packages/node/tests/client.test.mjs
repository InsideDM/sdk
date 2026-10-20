import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import { InsideDM, InsideDMApiError, InsideDMConfigurationError, InsideDMProtocolError, InsideDMTransportError } from '../dist/esm/index.js';
import { createTestClient, createProblemResponse, TEST_ID, TEST_REQUEST_ID } from '../dist/esm/testing.js';

const KEY = `idm_${Buffer.alloc(12).toString('base64url')}_${Buffer.alloc(32, 1).toString('base64url')}`;
const client = (fetch, options = {}) => new InsideDM({ apiKey: KEY, baseUrl: 'https://api.example.test', fetch, maxRetries: 0, ...options });
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-request-id': TEST_REQUEST_ID, ...extra } });

test('a real delegation family uses the same business client and accepts workspace identity without a fabricated key',async()=>{
  const token=`idmd_${Buffer.alloc(12,2).toString('base64url')}_${Buffer.alloc(32,3).toString('base64url')}`;
  let calls=0;
  const sdk=new InsideDM({apiKey:token,baseUrl:'https://api.example.test',fetch:async(url,init)=>{
    calls++;assert.equal(new Headers(init.headers).get('authorization'),`Bearer ${token}`);
    assert.equal(new URL(url).pathname,'/v1/workspace');
    return json({data:{id:TEST_ID,name:'Approved business',timeZone:'Asia/Kolkata',key:null}});
  }});
  assert.equal(calls,0);const workspace=await sdk.workspace.get();assert.equal(workspace.data.id,TEST_ID);assert.equal(workspace.data.key,null);
  assert.ok(!inspect(sdk,{showHidden:true,depth:10}).includes(token));
  assert.throws(()=>new InsideDM({apiKey:token+'='}),InsideDMConfigurationError);
  assert.throws(()=>new InsideDM({apiKey:token.replace('idmd_','idmp_')}),InsideDMConfigurationError);
});

test('all eleven supported operations use the contracted method, path, filters and metadata', async () => {
  const requests = [];
  const sdk = createTestClient({ respond(request, response) { requests.push(request); return response; } });
  const results = await Promise.all([
    sdk.workspace.get(), sdk.contacts.list({ channel: 'whatsapp', limit: 7 }), sdk.contacts.get(TEST_ID),
    sdk.conversations.list({ channel: 'instagram', state: 'open', contactId: TEST_ID }), sdk.conversations.get(TEST_ID),
    sdk.conversations.messages.list(TEST_ID, { direction: 'inbound', before: '2026-01-02T00:00:00Z', after: '2026-01-01T00:00:00Z' }),
    sdk.messages.get(TEST_ID), sdk.orders.list({ state: 'draft', paymentState: 'pending', contactId: TEST_ID }), sdk.orders.get(TEST_ID),
    sdk.orders.shipments.list(TEST_ID, { limit: 1 }), sdk.shipments.get(TEST_ID),
  ]);
  assert.deepEqual(requests.map((r) => new URL(r.url).pathname), [
    '/v1/workspace', '/v1/contacts', `/v1/contacts/${TEST_ID}`, '/v1/conversations', `/v1/conversations/${TEST_ID}`,
    `/v1/conversations/${TEST_ID}/messages`, `/v1/messages/${TEST_ID}`, '/v1/orders', `/v1/orders/${TEST_ID}`,
    `/v1/orders/${TEST_ID}/shipments`, `/v1/shipments/${TEST_ID}`,
  ]);
  assert.ok(requests.every((r) => r.method === 'GET'));
  assert.equal(new URL(requests[1].url).search, '?channel=whatsapp&limit=7');
  assert.ok(results.every((r) => r.meta.requestId === TEST_REQUEST_ID && r.meta.attempts === 1));
  assert.equal(results[2].data.email, null);
  assert.deepEqual(results[2].data.tags, []);
});

test('constructor is local, credentials are private, and untrusted configuration is rejected', () => {
  let calls = 0;
  const sdk = client(() => { calls++; throw new Error(KEY); });
  assert.equal(calls, 0);
  assert.ok(!inspect(sdk, { showHidden: true, depth: 10 }).includes(KEY));
  for (const apiKey of ['', 'idm_fake', KEY + '=']) assert.throws(() => new InsideDM({ apiKey }), InsideDMConfigurationError);
  for (const baseUrl of ['http://remote.test', 'https://user:pass@api.test', 'https://api.test?key=x', 'https://api.test/#x', 'file:///etc/passwd']) {
    assert.throws(() => new InsideDM({ apiKey: KEY, baseUrl }), InsideDMConfigurationError);
  }
  for (const maxRetries of [-1, 6, NaN, Infinity, '2']) assert.throws(() => client(fetch, { maxRetries }), InsideDMConfigurationError);
  assert.doesNotThrow(() => new InsideDM({ apiKey: KEY, baseUrl: 'http://127.0.0.1:8000' }));
});

test('strict request validation happens before transport and URL prefixes are preserved', async () => {
  let calls = 0;
  const sdk = createTestClient({ respond(_, response) { calls++; return response; } });
  for (const params of [{ limit: 0 }, { limit: 101 }, { limit: '2' }, { channel: 'unknown' }, { cursor: null }, { bogus: true }, { cursor: 'a'.repeat(2049) }]) {
    await assert.rejects(sdk.contacts.list(params), InsideDMConfigurationError);
  }
  await assert.rejects(sdk.contacts.get('../orders'), InsideDMConfigurationError);
  assert.equal(calls, 0);
  await client(async (url, init) => {
    assert.equal(url, 'https://api.example.test/prefix/v1/contacts');
    assert.equal(init.redirect, 'manual');
    assert.equal(init.headers.authorization, `Bearer ${KEY}`);
    return json({ data: [], page: { nextCursor: null } });
  }, { baseUrl: 'https://api.example.test/prefix/' }).contacts.list();
});

test('new response fields are discarded; unknown enums, strings for large values, and nulls survive', async () => {
  const sdk = createTestClient({ async respond(_, response) {
    const body = await response.json();
    body.data.channels = [{ channel: 'future_channel', handle: null }];
    body.data.revision = '90071992547409930000';
    body.data.internalSecret = KEY;
    return json(body);
  } });
  const { data } = await sdk.contacts.get(TEST_ID);
  assert.equal(data.channels[0].channel, 'unknown');
  assert.equal(data.revision, '90071992547409930000');
  assert.equal(data.phone, null);
  assert.equal('internalSecret' in data, false);
});

test('malformed data, HTML, invalid UTF8, redirects, missing request IDs, and large bodies fail safely', async () => {
  const responses = [json({ data: {} }), new Response(KEY, { headers: { 'content-type': 'text/html' } }),
    json({ data: [], page: { nextCursor: null } }, 200, { 'x-request-id': TEST_ID }),
    new Response(new Uint8Array([255]), { headers: { 'content-type': 'application/json', 'x-request-id': TEST_REQUEST_ID } }),
    new Response(null, { status: 302, headers: { location: `https://attacker.test/${KEY}` } }),
    new Response('{}', { headers: { 'content-type': 'application/json' } }),
    json({}, 200, { 'content-length': String(1024 * 1024 + 1) }),
    new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(1024 * 1024 + 1)); c.close(); } }), { headers: { 'content-type': 'application/json' } }),
  ];
  for (const response of responses) {
    await assert.rejects(client(async () => response).workspace.get(), (error) => {
      assert.ok(error instanceof InsideDMProtocolError);
      assert.equal(error.attempts, 1);
      assert.ok(!inspect(error).includes(KEY));
      assert.ok(!JSON.stringify(error).includes(KEY));
      return true;
    });
  }
});

test('known API errors carry explicit problem details but omit them from default logs', async () => {
  const sdk = client(async () => createProblemResponse('invalid_cursor', { detail: KEY }), { maxRetries: 2 });
  await assert.rejects(sdk.contacts.list({ cursor: 'expired' }), (error) => {
    assert.ok(error instanceof InsideDMApiError);
    assert.equal(error.code, 'invalid_cursor');
    assert.equal(error.attempts, 1);
    assert.equal(error.problem.detail, KEY);
    assert.ok(!inspect(error, { showHidden: true }).includes(KEY));
    assert.ok(!JSON.stringify(error).includes(KEY));
    return true;
  });
});

test('receiver-verification throttles remain typed API errors while unregistered policy labels fail closed',async()=>{
  for(const policyId of ['partner-webhook-verification','unregistered-policy']){
    const sdk=client(async()=>{
      const base=createProblemResponse('rate_limited',{retryAfterSeconds:30});
      return json({...await base.json(),policyId},429,{'content-type':'application/problem+json','retry-after':'30'});
    });
    await assert.rejects(sdk.workspace.get(),error=>{
      if(policyId==='unregistered-policy'){assert.ok(error instanceof InsideDMProtocolError);return true;}
      assert.ok(error instanceof InsideDMApiError);assert.equal(error.code,'rate_limited');assert.equal(error.problem.policyId,policyId);assert.equal(error.attempts,1);return true;
    });
  }
});

test('bounded safe-read retries, Retry-After and permanent status handling', async () => {
  let calls = 0;
  const result = await client(async () => ++calls === 1 ? createProblemResponse('rate_limited', { retryAfterSeconds: 0 }) : json({ data: [], page: { nextCursor: null } }), { maxRetries: 2 }).contacts.list();
  assert.equal(result.meta.attempts, 2);
  for (const code of ['invalid_token', 'insufficient_scope', 'revision_conflict']) {
    calls = 0;
    await assert.rejects(client(async () => { calls++; return createProblemResponse(code); }, { maxRetries: 2 }).workspace.get(), InsideDMApiError);
    assert.equal(calls, 1);
  }
  calls = 0;
  await assert.rejects(client(async () => { calls++; return createProblemResponse('rate_limited', { retryAfterSeconds: 3600 }); }, { maxRetries: 2, timeoutMs: 50 }).workspace.get(), InsideDMApiError);
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(client(async () => { calls++; throw new Error(KEY); }, { maxRetries: 1 }).workspace.get(), (e) => e instanceof InsideDMTransportError && !inspect(e).includes(KEY));
  assert.equal(calls, 2);
});

test('attempt and total timeouts include fetch and streams that ignore abort', async () => {
  const never = () => new Promise(() => {});
  const started = performance.now();
  await assert.rejects(client(never, { timeoutMs: 40, attemptTimeoutMs: 20, maxRetries: 2 }).workspace.get(), (e) => e.kind === 'timeout');
  assert.ok(performance.now() - started < 500);
  const stream = new ReadableStream({ pull: never });
  await assert.rejects(client(async () => new Response(stream, { headers: { 'content-type': 'application/json', 'x-request-id': TEST_REQUEST_ID } }), { timeoutMs: 20 }).workspace.get(), (e) => e.kind === 'timeout');
  let calls = 0;
  const recovered = await client(async () => ++calls === 1
    ? new Response(new ReadableStream({ pull: never }), { headers: { 'content-type': 'application/json', 'x-request-id': TEST_REQUEST_ID } })
    : json({ data: [], page: { nextCursor: null } }), { timeoutMs: 1000, attemptTimeoutMs: 20, maxRetries: 1 }).contacts.list();
  assert.equal(recovered.meta.attempts, 2);
});

test('caller cancellation aborts admission, in-flight fetch, body and retry waits', async () => {
  const pre = new AbortController(); pre.abort(KEY);
  let calls = 0;
  await assert.rejects(client(async () => { calls++; throw Error(); }).workspace.get({ signal: pre.signal }), (e) => e.kind === 'aborted');
  assert.equal(calls, 0);
  for (const fetcher of [() => new Promise(() => {}), async () => createProblemResponse('rate_limited', { retryAfterSeconds: 1 }),
    async () => new Response(new ReadableStream({ pull: () => new Promise(() => {}) }), { headers: { 'content-type': 'application/json' } })]) {
    const controller = new AbortController();
    const pending = client(fetcher, { maxRetries: 2 }).workspace.get({ signal: controller.signal });
    setTimeout(() => controller.abort(KEY), 15);
    await assert.rejects(pending, (e) => e.kind === 'aborted' && !inspect(e).includes(KEY));
  }
});

test('pagination is lazy, preserves snapshots and cursors, respects limits and detects cycles', async () => {
  const requests = [];
  const sdk = createTestClient({ respond(request) {
    const url = new URL(request.url); requests.push(url);
    return json({ data: [], page: { nextCursor: requests.length === 1 ? 'next' : null } });
  } });
  const params = { channel: 'whatsapp', limit: 3 };
  const iterator = sdk.contacts.pages(params);
  params.channel = 'instagram';
  assert.equal(requests.length, 0);
  await iterator.next(); await iterator.next(); await iterator.next();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].search, '?channel=whatsapp&limit=3&cursor=next');
  let calls = 0;
  const cycle = createTestClient({ respond() { calls++; return json({ data: [], page: { nextCursor: 'same' } }); } });
  await assert.rejects(async () => { for await (const _ of cycle.contacts.pages()) {} }, (e) => e.code === 'repeated_cursor');
  assert.equal(calls, 2);
  calls = 0;
  for await (const _ of cycle.contacts.pages({}, { maxPages: 1 })) {}
  assert.equal(calls, 1);
  assert.throws(() => cycle.contacts.pages({}, { maxItems: 0 }), InsideDMConfigurationError);
  const fixture = await createTestClient().contacts.get(TEST_ID);
  const summary = { ...fixture.data }; delete summary.tags;
  calls = 0;
  const limited = createTestClient({ respond() { calls++; return json({ data: [summary, summary, summary], page: { nextCursor: 'more' } }); } });
  const items = [];
  for await (const item of limited.contacts.iterate({}, { maxItems: 2 })) items.push(item);
  assert.equal(items.length, 2); assert.equal(calls, 1);
});
