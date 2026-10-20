import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {inspect} from 'node:util';
import {setImmediate as turn} from 'node:timers/promises';
import {InsideDM,InsideDMPlatform,InsideDMApiError,InsideDMConfigurationError,InsideDMProtocolError} from '../dist/esm/index.js';
import {createProblemResponse,TEST_ID,TEST_REQUEST_ID} from '../dist/esm/testing.js';
const MASTER=`idmp_${Buffer.alloc(12,7).toString('base64url')}_${Buffer.alloc(32,9).toString('base64url')}`;
const APP=randomUUID(),EXCHANGE='/api/v1/platform/delegations';
const json=data=>new Response(JSON.stringify({data}),{headers:{'content-type':'application/json','x-request-id':TEST_REQUEST_ID}});
const platform=(fetch,options={})=>new InsideDMPlatform({apiKey:MASTER,fetch,maxRetries:0,...options});
const grant=(businessId,scopes=['contacts.read','contacts.write'],extra={})=>({businessId,applicationId:APP,installationId:randomUUID(),authorityVersion:'1',scopes,
  token:`idmd_${randomBytes(12).toString('base64url')}_${randomBytes(32).toString('base64url')}`,expiresAt:new Date(Date.now()+10*60_000).toISOString(),...extra});
const workspace=businessId=>json({id:businessId,name:'Approved business',timeZone:'Asia/Kolkata',key:null});
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}

test('platform construction and business selection are local, bounded inputs with private credentials',()=>{
  let calls=0;const root=platform(async()=>{calls++;throw new Error('No network expected.');});
  assert.ok(root.forBusiness(TEST_ID).messages.send);assert.equal(calls,0);
  for(const id of ['',null,'not-a-business',TEST_ID+'/other'])assert.throws(()=>root.forBusiness(id),InsideDMConfigurationError);
  for(const options of [{scopes:[]},{scopes:['platform.businesses.read']},{scopes:['contacts.read','contacts.read']},{skipConsent:true},null])
    assert.throws(()=>root.forBusiness(TEST_ID,options),InsideDMConfigurationError);
  assert.throws(()=>new InsideDMPlatform({apiKey:MASTER.replace('idmp_','idm_')}),InsideDMConfigurationError);
  assert.throws(()=>new InsideDM({apiKey:MASTER}),InsideDMConfigurationError);
  assert.throws(()=>new InsideDMPlatform({apiKey:MASTER,baseUrl:'https://other.example'}),error=>error instanceof InsideDMConfigurationError&&error.field==='baseUrl');
  assert.ok(!inspect(root,{showHidden:true,depth:20}).includes(MASTER));
});

test('concurrent clients share one exchange and cache by business and canonical immutable scope set',async()=>{
  const gate=deferred(),started=deferred(),tokens=new Map();let exchanges=0,reads=0;
  const root=platform(async(url,init)=>{
    const authorization=new Headers(init.headers).get('authorization');
    if(new URL(url).pathname===EXCHANGE){assert.equal(authorization,`Bearer ${MASTER}`);exchanges++;
      const input=JSON.parse(init.body);started.resolve();await gate.promise;const data=grant(input.businessId,input.scopes);tokens.set(data.token,data);return json(data);}
    reads++;assert.notEqual(authorization,`Bearer ${MASTER}`);const token=tokens.get(authorization.slice(7));assert.ok(token);return workspace(token.businessId);
  });
  const scopes=['contacts.write','contacts.read'],client=root.forBusiness(TEST_ID,{scopes});scopes.splice(0,2,'orders.read');
  const pending=Array.from({length:20},(_,i)=>(i%2?client:root.forBusiness(TEST_ID,{scopes:['contacts.read','contacts.write']})).workspace.get());
  await started.promise;assert.equal(exchanges,1);gate.resolve();const responses=await Promise.all(pending);
  assert.ok(responses.every(value=>value.data.id===TEST_ID));assert.equal(reads,20);
  await root.forBusiness(TEST_ID,{scopes:['contacts.write','contacts.read']}).workspace.get();assert.equal(exchanges,1);
  await root.forBusiness(randomUUID()).workspace.get();assert.equal(exchanges,2);
  assert.ok(!inspect(client,{showHidden:true,depth:20}).includes([...tokens.keys()][0]));
});

test('one invalid-token refresh preserves mutation bytes, key and business routing without a discovery request',async()=>{
  let exchanges=0;const writes=[],tokens=[];
  const root=platform(async(url,init)=>{
    if(new URL(url).pathname===EXCHANGE){exchanges++;const value=grant(TEST_ID,['contacts.write'],{authorityVersion:exchanges===1?'1':'3'});tokens.push(value.token);return json(value);}
    assert.equal(init.method,'PATCH');assert.equal(new URL(url).pathname,`/api/v1/dashboard/${TEST_ID}/contacts/${TEST_ID}`);
    writes.push({body:init.body,key:new Headers(init.headers).get('idempotency-key'),authorization:new Headers(init.headers).get('authorization')});
    return writes.length===1?createProblemResponse('invalid_token'):json({contactId:TEST_ID,displayName:'Asha',revision:'1'});
  });
  const result=await root.forBusiness(TEST_ID).contacts.update(TEST_ID,{displayName:'Asha'},{idempotencyKey:'crm/profile/one'});
  assert.equal(exchanges,2);assert.equal(writes.length,2);assert.equal(result.meta.attempts,2);
  assert.equal(writes[0].body,writes[1].body);assert.equal(writes[0].key,'crm/profile/one');assert.equal(writes[1].key,writes[0].key);
  assert.equal(writes[0].authorization,`Bearer ${tokens[0]}`);assert.equal(writes[1].authorization,`Bearer ${tokens[1]}`);
});

test('persistent business denial permits one refresh and root denial never dispatches a business request',async()=>{
  let exchanges=0,business=0;
  const root=platform(async(url)=>new URL(url).pathname===EXCHANGE?(exchanges++,json(grant(TEST_ID))):(business++,createProblemResponse('invalid_token')));
  await assert.rejects(root.forBusiness(TEST_ID).workspace.get(),error=>error instanceof InsideDMApiError&&error.code==='invalid_token');
  assert.equal(exchanges,2);assert.equal(business,2);
  const denied=platform(async(url)=>{assert.equal(new URL(url).pathname,EXCHANGE);return createProblemResponse('resource_not_found');});
  await assert.rejects(denied.forBusiness(TEST_ID).workspace.get(),error=>error instanceof InsideDMApiError&&error.code==='resource_not_found');
});

test('pre-aborted calls send nothing and a total deadline covers token exchange even when fetch ignores abort',async()=>{
  const aborted=new AbortController();aborted.abort();let calls=0,signal;
  const root=platform(async(_url,init)=>{calls++;signal=init.signal;return new Promise(()=>{});});
  await assert.rejects(root.forBusiness(TEST_ID).workspace.get({signal:aborted.signal}),error=>error.kind==='aborted');assert.equal(calls,0);
  const start=performance.now();await assert.rejects(root.forBusiness(TEST_ID).workspace.get({timeoutMs:20}),error=>error.kind==='timeout');
  assert.ok(performance.now()-start<500);await turn();assert.equal(calls,1);assert.equal(signal.aborted,true);
});

test('one cancelled waiter does not abort another caller sharing its refresh',async()=>{
  const gate=deferred(),started=deferred(),controller=new AbortController();let exchanges=0,exchangeSignal;
  const root=platform(async(url,init)=>{
    if(new URL(url).pathname===EXCHANGE){exchanges++;exchangeSignal=init.signal;started.resolve();await gate.promise;return json(grant(TEST_ID));}
    return workspace(TEST_ID);
  });
  const cancelled=root.forBusiness(TEST_ID).workspace.get({signal:controller.signal}),survivor=root.forBusiness(TEST_ID).workspace.get();
  await started.promise;controller.abort();await assert.rejects(cancelled,error=>error.kind==='aborted');assert.equal(exchangeSignal.aborted,false);
  gate.resolve();assert.equal((await survivor).data.id,TEST_ID);assert.equal(exchanges,1);
});

test('a short total deadline cannot cancel a longer waiter sharing the same acquisition policy',async()=>{
  const gate=deferred(),started=deferred();let exchanges=0,signal;
  const root=platform(async(url,init)=>{
    if(new URL(url).pathname===EXCHANGE){exchanges++;signal=init.signal;started.resolve();await gate.promise;return json(grant(TEST_ID));}
    return workspace(TEST_ID);
  });
  const short=root.forBusiness(TEST_ID).workspace.get({timeoutMs:20}),long=root.forBusiness(TEST_ID).workspace.get({timeoutMs:1000});
  await started.promise;await assert.rejects(short,error=>error.kind==='timeout');assert.equal(signal.aborted,false);
  gate.resolve();assert.equal((await long).data.id,TEST_ID);assert.equal(exchanges,1);
});

test('the request budget is not restarted after acquisition completes',async()=>{
  let calls=0,signal;
  const root=platform(async(url,init)=>{
    calls++;
    if(new URL(url).pathname===EXCHANGE){await new Promise(resolve=>setTimeout(resolve,25));return json(grant(TEST_ID));}
    signal=init.signal;return new Promise(()=>{});
  });
  const start=performance.now();await assert.rejects(root.forBusiness(TEST_ID).workspace.get({timeoutMs:60}),error=>error.kind==='timeout');
  assert.equal(calls,2);assert.equal(signal.aborted,true);assert.ok(performance.now()-start<250);
});

test('a late acquisition cannot replace a newer installation epoch cached by another retry policy',async()=>{
  const gate=deferred(),started=deferred(),installationId=randomUUID(),used=[];let exchanges=0;
  const old=grant(TEST_ID,undefined,{installationId,authorityVersion:'1'}),current=grant(TEST_ID,undefined,{installationId,authorityVersion:'3'});
  const root=platform(async(url,init)=>{
    if(new URL(url).pathname===EXCHANGE){exchanges++;
      if(exchanges===1){started.resolve();await gate.promise;return json(old);}return json(current);}
    used.push(new Headers(init.headers).get('authorization'));return workspace(TEST_ID);
  });
  const first=root.forBusiness(TEST_ID).workspace.get({maxRetries:0});await started.promise;
  await root.forBusiness(TEST_ID).workspace.get({maxRetries:1});gate.resolve();await first;
  await root.forBusiness(TEST_ID).workspace.get();assert.equal(exchanges,2);assert.equal(used.at(-1),`Bearer ${current.token}`);
});

test('near-expiry tokens refresh preemptively and request parameters cannot mutate the selected business',async()=>{
  let exchanges=0;const root=platform(async(url,init)=>{
    if(new URL(url).pathname===EXCHANGE){exchanges++;assert.equal(JSON.parse(init.body).businessId,TEST_ID);return json(grant(TEST_ID,undefined,{expiresAt:new Date(Date.now()+20_000).toISOString()}));}
    return workspace(TEST_ID);
  });
  const client=root.forBusiness(TEST_ID);await client.workspace.get();await client.workspace.get();assert.equal(exchanges,2);
});

test('malformed or foreign exchange results fail before business I/O and secret-bearing network errors stay redacted',async()=>{
  for(const data of [grant(randomUUID()),grant(TEST_ID,undefined,{token:MASTER}),grant(TEST_ID,undefined,{expiresAt:new Date(Date.now()-1000).toISOString()})]){
    const root=platform(async(url)=>{assert.equal(new URL(url).pathname,EXCHANGE);return json(data);});
    await assert.rejects(root.forBusiness(TEST_ID).workspace.get(),InsideDMProtocolError);
  }
  const root=platform(async()=>{throw new Error(MASTER);});
  await assert.rejects(root.forBusiness(TEST_ID).workspace.get(),error=>!inspect(error,{showHidden:true,depth:20}).includes(MASTER)&&!JSON.stringify(error).includes(MASTER));
});

test('the installation cache evicts idle entries instead of retaining an unbounded client portfolio',async()=>{
  let exchanges=0;const tokens=new Map();
  const root=platform(async(url,init)=>{
    if(new URL(url).pathname===EXCHANGE){exchanges++;const data=grant(JSON.parse(init.body).businessId);tokens.set(data.token,data.businessId);return json(data);}
    return workspace(tokens.get(new Headers(init.headers).get('authorization').slice(7)));
  });
  await root.forBusiness(TEST_ID).workspace.get();
  for(let i=0;i<500;i++)await root.forBusiness(randomUUID()).workspace.get();
  await root.forBusiness(TEST_ID).workspace.get();assert.equal(exchanges,502);
});

test('pending exchanges are bounded and cancelling all callers aborts their shared work',async()=>{
  const controller=new AbortController(),signals=[];
  const root=platform(async(_url,init)=>{signals.push(init.signal);return new Promise(()=>{});});
  const pending=Array.from({length:101},()=>root.forBusiness(randomUUID()).workspace.get({signal:controller.signal}));
  const results=Promise.allSettled(pending);await turn();assert.equal(signals.length,100);controller.abort();
  const settled=await results;assert.equal(settled.filter(value=>value.status==='rejected'&&value.reason.code==='delegation_capacity').length,1);
  await turn();assert.ok(signals.every(signal=>signal.aborted));
});
