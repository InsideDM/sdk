import assert from 'node:assert/strict';
import test from 'node:test';
import {inspect} from 'node:util';
import {InsideDMPlatform,InsideDMConfigurationError,InsideDMProtocolError,InsideDMTransportError} from '../dist/esm/index.js';
import {TEST_REQUEST_ID} from '../dist/esm/testing.js';
const KEY=`idmp_${Buffer.alloc(12).toString('base64url')}_${Buffer.alloc(32,1).toString('base64url')}`;
const SUB='11111111-1111-4111-8111-111111111111',APP='22222222-2222-4222-8222-222222222222',BUSINESS='33333333-3333-4333-8333-333333333333',ID='44444444-4444-4444-8444-444444444444',OTHER='55555555-5555-4555-8555-555555555555',AT='2026-10-20T00:00:00.000Z';
const CURSOR='YWJj.'+'A'.repeat(43),context={applicationId:APP,subscriptionId:SUB,businessId:BUSINESS};
const delivery=(patch={})=>({id:ID,deliveryId:'developer-webhook:'+'a'.repeat(64),eventId:'evt_'+'b'.repeat(32),eventType:'contact.changed',resource:{type:'contact',id:ID},kind:'automatic',status:'failed',attemptCount:1,
  nextAttemptAt:null,lastAttemptAt:AT,deliveredAt:null,lastHttpStatus:400,lastError:'HTTP 400',createdAt:AT,replayOf:null,replayableUntil:'2026-11-19T00:00:00.000Z',replayCount:0,replayPending:false,replayable:true,...patch});
const replay=()=>delivery({id:OTHER,deliveryId:delivery().deliveryId+':replay:1',kind:'manual_replay',status:'pending',attemptCount:0,lastAttemptAt:null,lastHttpStatus:null,lastError:null,replayOf:ID,replayable:false});
const health=(patch={})=>({...context,installationId:ID,authorityVersion:1,configurationStatus:'active',receiverStatus:'active',revision:'rh1_'+'a'.repeat(64),pausedReason:null,health:'unknown',consecutiveFailures:0,failureCount:0,lastDelivery:null,lastSuccessAt:null,lastFailureAt:null,asOf:AT,...patch});
const json=data=>Response.json({data},{headers:{'x-request-id':TEST_REQUEST_ID}});
const client=(fetch,options={})=>new InsideDMPlatform({apiKey:KEY,fetch,maxRetries:0,...options});
test('one application key reads health/history/detail and explicitly replays without construction or delegation requests',async()=>{
  const calls=[],sdk=client(async(url,init)=>{
    const path=new URL(url).pathname,headers=new Headers(init.headers);calls.push({path,method:init.method,headers,body:init.body?JSON.parse(init.body):null});assert.equal(headers.get('authorization'),`Bearer ${KEY}`);
    if(path.endsWith('/health'))return json(health());
    if(path.endsWith('/replay'))return json({...context,delivery:replay()});
    if(path.endsWith('/'+ID))return json({...context,delivery:{...delivery(),attempts:[]}});
    return json({...context,deliveries:[delivery()],nextCursor:null});
  });
  assert.equal(calls.length,0);assert.equal((await sdk.subscriptions.getHealth(SUB,{businessId:BUSINESS})).data.receiverStatus,'active');
  const list=await sdk.subscriptions.deliveries.list(SUB,{businessId:BUSINESS});assert.equal(list.data[0].id,ID);assert.equal(list.page.nextCursor,null);
  assert.deepEqual((await sdk.subscriptions.deliveries.get(SUB,ID,{businessId:BUSINESS})).data.attempts,[]);
  assert.equal((await sdk.subscriptions.deliveries.replay(SUB,ID,{businessId:BUSINESS,reason:'receiver_recovered'},{idempotencyKey:'recover/original'})).data.replayOf,ID);
  assert.equal(calls.length,4);assert.equal(calls.some(call=>call.path.includes('/delegations')),false);assert.deepEqual(calls.at(-1).body,{reason:'receiver_recovered'});
  assert.equal(calls.at(-1).headers.get('idempotency-key'),'recover/original');
});
test('diagnostic input rejects unknown authority, invalid targets/ranges and read idempotency keys before any HTTP',async()=>{
  let calls=0;const sdk=client(async()=>{calls++;throw new Error('unexpected');});
  for(const input of [{businessId:BUSINESS,approved:true},{businessId:BUSINESS,url:'https://attacker.example'},{businessId:'bad'}])await assert.rejects(sdk.subscriptions.getHealth(SUB,input),InsideDMConfigurationError);
  for(const input of [{businessId:BUSINESS,limit:101},{businessId:BUSINESS,from:'yesterday'},{businessId:BUSINESS,eventType:'endpoint.test'},{businessId:BUSINESS,authorityVersion:1},
    {businessId:BUSINESS,from:AT,to:'2026-11-20T00:00:00.000Z'}])await assert.rejects(sdk.subscriptions.deliveries.list(SUB,input),InsideDMConfigurationError);
  await assert.rejects(sdk.subscriptions.deliveries.get(SUB,'developer-webhook:'+'a'.repeat(64),{businessId:BUSINESS}),InsideDMConfigurationError);
  await assert.rejects(sdk.subscriptions.getHealth(SUB,{businessId:BUSINESS},{idempotencyKey:'not-a-read'}),InsideDMConfigurationError);
  await assert.rejects(sdk.subscriptions.deliveries.replay(SUB,ID,{businessId:BUSINESS,reason:'manual'}),InsideDMConfigurationError);assert.equal(calls,0);
});
test('pages and iteration retain normalized filters, dates and merchant target before dispatch and honor common pagination limits',async()=>{
  const calls=[],from=new Date(AT),input={businessId:BUSINESS,from,limit:1},sdk=client(async url=>{
    const search=new URL(url).searchParams;calls.push(new URL(url));const second=search.has('cursor');return json({...context,deliveries:[delivery({id:second?OTHER:ID})],nextCursor:second?null:CURSOR});
  });
  const pages=sdk.subscriptions.deliveries.pages(SUB,input,{maxPages:2});input.businessId=OTHER;from.setUTCFullYear(2030);
  const values=[];for await(const page of pages)values.push(...page.data);assert.deepEqual(values.map(v=>v.id),[ID,OTHER]);assert.equal(calls.length,2);
  for(const url of calls){assert.ok(url.pathname.includes('/businesses/'+BUSINESS+'/'));assert.equal(url.searchParams.get('from'),AT);assert.equal(url.searchParams.get('limit'),'1');}
  const limited=[];for await(const item of sdk.subscriptions.deliveries.iterate(SUB,{businessId:BUSINESS},{maxItems:1}))limited.push(item);assert.equal(limited.length,1);
  assert.throws(()=>sdk.subscriptions.deliveries.pages(SUB,{businessId:BUSINESS},{maxPages:0}),InsideDMConfigurationError);
});
test('a repeated history cursor is a protocol error instead of an unbounded pagination loop',async()=>{
  const sdk=client(async()=>json({...context,deliveries:[delivery()],nextCursor:CURSOR}));
  await assert.rejects(async()=>{for await(const _page of sdk.subscriptions.deliveries.pages(SUB,{businessId:BUSINESS})){}},error=>error instanceof InsideDMProtocolError&&error.code==='repeated_cursor');
});
test('foreign application/business/receiver/delivery contexts and inconsistent replay pointers fail closed',async()=>{
  let n=0;const sdk=client(async()=>json(health({applicationId:++n===1?APP:OTHER})));await sdk.subscriptions.getHealth(SUB,{businessId:BUSINESS});await assert.rejects(sdk.subscriptions.getHealth(SUB,{businessId:BUSINESS}),InsideDMProtocolError);
  for(const patch of [{businessId:OTHER},{subscriptionId:OTHER}])await assert.rejects(client(async()=>json({...context,...patch,deliveries:[],nextCursor:null})).subscriptions.deliveries.list(SUB,{businessId:BUSINESS}),InsideDMProtocolError);
  await assert.rejects(client(async()=>json({...context,delivery:{...delivery({id:OTHER}),attempts:[]}})).subscriptions.deliveries.get(SUB,ID,{businessId:BUSINESS}),InsideDMProtocolError);
  await assert.rejects(client(async()=>json({...context,delivery:{...replay(),replayOf:OTHER}})).subscriptions.deliveries.replay(SUB,ID,{businessId:BUSINESS,reason:'receiver_recovered'}),InsideDMProtocolError);
});
test('replay retries keep the original tenant, reason and stable key, with uncertain recovery metadata hidden from default logs',async()=>{
  const input={businessId:BUSINESS,reason:'receiver_recovered'},request={idempotencyKey:'replay/original'},calls=[];
  const sdk=client(async(url,init)=>{
    calls.push({url:String(url),body:String(init.body),key:new Headers(init.headers).get('idempotency-key')});
    if(calls.length===1){input.businessId=OTHER;input.reason='support_directed';request.idempotencyKey='changed';throw new Error('private receiver response');}
    return json({...context,delivery:replay()});
  },{maxRetries:1});
  const result=await sdk.subscriptions.deliveries.replay(SUB,ID,input,request);assert.equal(result.meta.attempts,2);assert.deepEqual(calls[1],calls[0]);assert.equal(calls[1].key,'replay/original');
  const unavailable=client(async()=>{throw new Error('private receiver response');});
  await assert.rejects(unavailable.subscriptions.deliveries.replay(SUB,ID,{businessId:BUSINESS,reason:'receiver_recovered'},{idempotencyKey:'replay/recover'}),error=>{
    assert.ok(error instanceof InsideDMTransportError);assert.deepEqual(error.recovery,{operation:'replayPlatformSubscriptionDelivery',subscriptionId:SUB,businessId:BUSINESS,deliveryId:ID,idempotencyKey:'replay/recover'});
    for(const printed of [inspect(error,{showHidden:true}),JSON.stringify(error)]){assert.equal(printed.includes('private receiver response'),false);assert.equal(printed.includes('replay/recover'),false);}return true;
  });
});
test('reviewed client recovery freezes the original health revision, tenant and key and can observe a newer pause after retry',async()=>{
  const input={businessId:BUSINESS,expectedRevision:'rh1_'+'a'.repeat(64)},request={idempotencyKey:'recover/client'},calls=[];
  const sdk=client(async(url,init)=>{
    calls.push({url:String(url),body:String(init.body),key:new Headers(init.headers).get('idempotency-key')});
    if(calls.length===1){input.businessId=OTHER;input.expectedRevision='rh1_'+'b'.repeat(64);request.idempotencyKey='changed';throw new Error('lost receiver recovery answer');}
    return json(health({receiverStatus:'paused',pausedReason:'receiver_gone',health:'warning',consecutiveFailures:1,revision:'rh1_'+'b'.repeat(64)}));
  },{maxRetries:1});
  const result=await sdk.subscriptions.recover(SUB,input,request);assert.equal(result.meta.attempts,2);assert.equal(result.data.receiverStatus,'paused');assert.deepEqual(calls[0],calls[1]);
  assert.deepEqual(JSON.parse(calls[1].body),{expectedRevision:'rh1_'+'a'.repeat(64)});assert.equal(calls[1].key,'recover/client');
});
test('client recovery rejects unreviewed state and authority flags before HTTP and retains a safe uncertain intent handle',async()=>{
  let calls=0;const sdk=client(async()=>{calls++;throw new Error('private receiver response');});
  for(const input of [{businessId:BUSINESS},{businessId:BUSINESS,expectedRevision:'1'},{businessId:BUSINESS,expectedRevision:'rh1_'+'a'.repeat(64),approved:true}])await assert.rejects(sdk.subscriptions.recover(SUB,input),InsideDMConfigurationError);
  assert.equal(calls,0);await assert.rejects(sdk.subscriptions.recover(SUB,{businessId:BUSINESS,expectedRevision:'rh1_'+'a'.repeat(64)},{idempotencyKey:'recover/retry'}),error=>{
    assert.ok(error instanceof InsideDMTransportError);assert.deepEqual(error.recovery,{operation:'recoverPlatformSubscriptionReceiver',subscriptionId:SUB,businessId:BUSINESS,idempotencyKey:'recover/retry'});
    assert.equal(inspect(error,{showHidden:true}).includes('recover/retry'),false);assert.equal(JSON.stringify(error).includes('private receiver response'),false);return true;
  });
});
