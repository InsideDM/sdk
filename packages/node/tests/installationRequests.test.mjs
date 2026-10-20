import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect} from 'node:util';
import {randomUUID} from 'node:crypto';
import {InsideDMPlatform,InsideDMConfigurationError,InsideDMProtocolError} from '../dist/esm/index.js';
import {createProblemResponse,TEST_REQUEST_ID} from '../dist/esm/testing.js';
const key=`idmp_${Buffer.alloc(12,7).toString('base64url')}_${Buffer.alloc(32,9).toString('base64url')}`;
const id=randomUUID(),applicationId=randomUUID(),path='/api/v1/platform/installation-requests';
const input={scopes:['contacts.read'],returnUrl:'https://partner.example/approved'};
const data=()=>({id,applicationId,status:'pending',scopes:['contacts.read'],expiresAt:new Date(Date.now()+600_000).toISOString(),result:null});
const link=()=>`https://app.example/integrations/authorize#request=${id}&token=${'a'.repeat(42)}A`;
const json=data=>new Response(JSON.stringify({data}),{headers:{'content-type':'application/json','x-request-id':TEST_REQUEST_ID}});
const platform=fetch=>new InsideDMPlatform({apiKey:key,fetch,maxRetries:0});
test('partner creates a private merchant link and authenticates its outcome without business discovery',async()=>{
  let calls=0;
  const sdk=platform(async(url,init)=>{
    calls++;assert.equal(new Headers(init.headers).get('authorization'),`Bearer ${key}`);
    if(init.method==='POST'){assert.equal(new URL(url).pathname,path);assert.deepEqual(JSON.parse(init.body),input);assert.equal(new Headers(init.headers).get('idempotency-key'),'link/client/one');return json({...data(),authorizationUrl:link()});}
    assert.equal(new URL(url).pathname,path+'/'+id);assert.equal(new Headers(init.headers).has('idempotency-key'),false);return json({...data(),status:'approved',result:{businessId:id,installationId:id}});
  });
  const created=await sdk.installationRequests.create(input,{idempotencyKey:'link/client/one'});assert.equal(created.data.authorizationUrl,link());assert.equal(created.meta.idempotencyKey,'link/client/one');
  const result=await sdk.installationRequests.get(id);assert.equal(result.data.result.businessId,id);assert.equal(calls,2);
});
test('invalid request, return targets, actor overrides and read intent keys are refused before network',async()=>{
  let calls=0;const sdk=platform(async()=>{calls++;throw new Error();});
  for(const patch of [{scopes:[]},{scopes:['unknown.read']},{businessId:id},{approved:true},{returnUrl:'javascript:alert(1)'},{returnUrl:'https://partner.example/#token=secret'}])await assert.rejects(sdk.installationRequests.create({...input,...patch}),InsideDMConfigurationError);
  await assert.rejects(sdk.installationRequests.create(input,{idempotencyKey:'ambiguous,key'}),InsideDMConfigurationError);
  await assert.rejects(sdk.installationRequests.get('../other'),InsideDMConfigurationError);
  await assert.rejects(sdk.installationRequests.get(id,{idempotencyKey:'read'}),InsideDMConfigurationError);assert.equal(calls,0);
});
test('uncertain writes retain the exact recovery key while ordinary logs omit input, token and link',async()=>{
  const sdk=platform(async()=>{throw new Error(key+' '+link());});
  await assert.rejects(sdk.installationRequests.create(input),error=>{
    assert.equal(error.recovery.operation,'createInstallationRequest');assert.match(error.recovery.idempotencyKey,/^[a-f0-9-]{36}$/);
    for(const text of [inspect(error),JSON.stringify(error)])for(const secret of [key,link(),input.returnUrl])assert.equal(text.includes(secret),false);
    return true;
  });
});
test('owner inconsistencies, foreign requests and callback capability leaks fail closed',async()=>{
  for(const wrong of [{...data(),authorizationUrl:link().replace(id,randomUUID())},{...data(),status:'approved',result:{businessId:id,installationId:id},authorizationUrl:link()}]){
    await assert.rejects(platform(async()=>json(wrong)).installationRequests.create(input),InsideDMProtocolError);
  }
  await assert.rejects(platform(async()=>json({...data(),id:randomUUID()})).installationRequests.get(id),InsideDMProtocolError);
  let calls=0;const sdk=platform(async()=>json({...data(),applicationId:++calls===1?applicationId:randomUUID()}));
  await sdk.installationRequests.get(id);await assert.rejects(sdk.installationRequests.get(id),InsideDMProtocolError);
});
test('creation transient retries reuse prepared canonical bytes and key',async()=>{
  const seen=[];const sdk=new InsideDMPlatform({apiKey:key,maxRetries:1,fetch:async(_url,init)=>{
    seen.push({body:init.body,key:new Headers(init.headers).get('idempotency-key')});return seen.length===1?createProblemResponse('rate_limited',{retryAfterSeconds:0}):json({...data(),authorizationUrl:link()});
  }});
  const result=await sdk.installationRequests.create(input);assert.equal(result.meta.attempts,2);assert.deepEqual(seen[0],seen[1]);
});
