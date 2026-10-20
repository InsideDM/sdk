import assert from 'node:assert/strict';
import test from 'node:test';
import {inspect} from 'node:util';
import {InsideDMPlatform,InsideDMConfigurationError,InsideDMProtocolError,InsideDMTransportError,InsideDMApiError} from '../dist/esm/index.js';
import {TEST_REQUEST_ID,createProblemResponse} from '../dist/esm/testing.js';
const KEY=`idmp_${Buffer.alloc(12).toString('base64url')}_${Buffer.alloc(32,1).toString('base64url')}`;
const ID='11111111-1111-4111-8111-111111111111',APP='22222222-2222-4222-8222-222222222222',OTHER='33333333-3333-4333-8333-333333333333';
const SECRET='whsec_'+'A'.repeat(43),NEXT='whsec_'+'B'.repeat(42)+'A',AT='2026-10-20T01:00:00.000Z';
const input={name:'Client events',url:'https://partner.example/events',events:['contact.changed']};
const sub=patch=>({id:ID,applicationId:APP,...input,status:'pending',revision:'1',targetGeneration:1,secretGeneration:1,secretPrefix:SECRET.slice(0,14),
  secretOverlapUntil:null,ready:false,readinessValidUntil:null,createdAt:AT,updatedAt:AT,...patch});
const json=(data,status=200)=>Response.json({data},{status,headers:{'x-request-id':TEST_REQUEST_ID}});
const client=(fetch,options={})=>new InsideDMPlatform({apiKey:KEY,fetch,maxRetries:0,...options});
test('one root key configures all receiver methods with no construction or workspace-discovery request',async()=>{
  const calls=[],sdk=client(async(url,init)=>{
    const path=new URL(url).pathname,headers=new Headers(init.headers);calls.push({path,method:init.method,headers,body:init.body?JSON.parse(init.body):null});
    assert.equal(headers.get('authorization'),`Bearer ${KEY}`);
    if(path.endsWith('/subscriptions')&&init.method==='POST')return json({subscription:sub(),signingSecret:SECRET},201);
    if(path.endsWith('/subscriptions'))return json([sub()]);
    if(path.endsWith('/rotate-secret'))return json({subscription:sub({secretGeneration:2,secretPrefix:NEXT.slice(0,14)}),signingSecret:NEXT});
    return json(sub());
  });
  assert.equal(calls.length,0);
  await sdk.subscriptions.create(input,{idempotencyKey:'receiver/create'});await sdk.subscriptions.list();await sdk.subscriptions.get(ID);
  await sdk.subscriptions.update(ID,{expectedRevision:'1',name:'Support events'});
  await sdk.subscriptions.verify(ID,{expectedRevision:'1'});await sdk.subscriptions.activate(ID,{expectedRevision:'1'});
  await sdk.subscriptions.pause(ID,{expectedRevision:'1'});await sdk.subscriptions.disable(ID,{expectedRevision:'1'});
  await sdk.subscriptions.rotateSecret(ID,{expectedRevision:'1',mode:'overlap_24h'},{idempotencyKey:'receiver/rotate'});
  assert.equal(calls.length,9);assert.deepEqual(calls.map(c=>c.method),['POST','GET','GET','PATCH','POST','POST','POST','POST','POST']);
  assert.equal(calls[0].headers.get('idempotency-key'),'receiver/create');assert.equal(calls[8].headers.get('idempotency-key'),'receiver/rotate');
  for(const call of calls){assert.ok(call.path.startsWith('/api/v1/platform/subscriptions'));assert.equal(call.path.includes('workspace'),false);}
  assert.equal(inspect(sdk,{showHidden:true,depth:10}).includes(KEY),false);
});
test('configuration errors reject unknown events, approval flags, unsafe URLs and wrong request options before I/O',async()=>{
  let calls=0;const sdk=client(async()=>{calls++;return json(sub());});
  for(const patch of [{approved:true},{actorUserId:ID},{businessId:ID},{url:'http://partner.example/events'},{events:['endpoint.test']},{events:['installation.changed']}])
    await assert.rejects(sdk.subscriptions.create({...input,...patch}),InsideDMConfigurationError);
  await assert.rejects(sdk.subscriptions.get('../other'),InsideDMConfigurationError);
  await assert.rejects(sdk.subscriptions.get(ID,{idempotencyKey:'not-a-write'}),InsideDMConfigurationError);
  await assert.rejects(sdk.subscriptions.verify(ID,{expectedRevision:'1'},{idempotencyKey:'not-retained'}),InsideDMConfigurationError);
  await assert.rejects(sdk.subscriptions.update(ID,{expectedRevision:1,name:'Changed'}),InsideDMConfigurationError);
  assert.equal(calls,0);
});
test('unkeyed revision commands are attempted once even when transient retries were requested',async()=>{
  for(const method of ['update','verify','activate','pause','disable']){
    let calls=0;const sdk=client(async()=>{calls++;return createProblemResponse('dependency_unavailable');},{maxRetries:3});
    await assert.rejects(sdk.subscriptions[method](ID,{expectedRevision:'1',...(method==='update'?{name:'Changed'}:{})},{maxRetries:3}),InsideDMApiError);
    assert.equal(calls,1);
  }
});
test('keyed creation retries keep the original body and key after the caller mutates both objects',async()=>{
  const body=structuredClone(input),request={idempotencyKey:'original/create'},calls=[];
  const sdk=client(async(_url,init)=>{
    calls.push({body:String(init.body),key:new Headers(init.headers).get('idempotency-key')});
    if(calls.length===1){body.url='https://attacker.example/events';request.idempotencyKey='changed';throw new Error(SECRET);}
    return json({subscription:sub(),signingSecret:SECRET},201);
  },{maxRetries:1});
  const result=await sdk.subscriptions.create(body,request);assert.equal(result.meta.attempts,2);assert.equal(result.data.signingSecret,SECRET);
  assert.equal(calls.length,2);assert.equal(calls[0].body,calls[1].body);assert.equal(calls[1].key,'original/create');assert.equal(JSON.parse(calls[1].body).url,input.url);
});
test('uncertain secret-rotation errors keep explicit recovery context out of default logs',async()=>{
  const sdk=client(async()=>{throw new Error(SECRET);});
  await assert.rejects(sdk.subscriptions.rotateSecret(ID,{expectedRevision:'1',mode:'immediate'},{idempotencyKey:'rotation/recover'}),error=>{
    assert.ok(error instanceof InsideDMTransportError);assert.deepEqual(error.recovery,{operation:'rotatePlatformSubscriptionSecret',subscriptionId:ID,idempotencyKey:'rotation/recover'});
    for(const value of [inspect(error,{showHidden:true}),JSON.stringify(error)]){assert.equal(value.includes(SECRET),false);assert.equal(value.includes('rotation/recover'),false);}
    return true;
  });
});
test('foreign application/receiver results and inconsistent secret prefixes fail closed',async()=>{
  let n=0;const sdk=client(async()=>json(sub({applicationId:++n===1?APP:OTHER})));
  await sdk.subscriptions.get(ID);await assert.rejects(sdk.subscriptions.get(ID),InsideDMProtocolError);
  await assert.rejects(client(async()=>json(sub({id:OTHER}))).subscriptions.get(ID),InsideDMProtocolError);
  await assert.rejects(client(async()=>json({subscription:sub(),signingSecret:NEXT},201)).subscriptions.create(input),InsideDMProtocolError);
});
