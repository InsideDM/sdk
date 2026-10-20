import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {inspect} from 'node:util';
import {InsideDMPlatform,InsideDMConfigurationError,InsideDMProtocolError} from '../dist/esm/index.js';
import {createProblemResponse,TEST_REQUEST_ID} from '../dist/esm/testing.js';
const key=`idmp_${Buffer.alloc(12,7).toString('base64url')}_${Buffer.alloc(32,9).toString('base64url')}`,id=randomUUID(),businessId=randomUUID(),applicationId=randomUUID(),installationId=randomUUID();
const input={businessId,provider:'whatsapp',returnUrl:'https://partner.example/setup'};
const base=()=>({id,businessId,applicationId,installationId,provider:'whatsapp',purpose:'connect',status:'created',revision:'1',expiresAt:new Date(Date.now()+600_000).toISOString(),finishExpiresAt:null,connection:null});
const url=()=>`https://app.example/integrations/connect#session=${id}&business=${businessId}&token=${'A'.repeat(43)}`;
const json=(data,status=200)=>new Response(JSON.stringify({data}),{status,headers:{'content-type':'application/json','x-request-id':TEST_REQUEST_ID}});
const platform=(fetch,options={})=>new InsideDMPlatform({apiKey:key,baseUrl:'https://api.example',maxRetries:0,fetch,...options});
test('setup create and status use their canonical app endpoints with one key and no preliminary discovery',async()=>{
  let calls=0;const client=platform(async(address,init)=>{
    calls++;assert.equal(new Headers(init.headers).get('authorization'),`Bearer ${key}`);
    if(init.method==='POST'){assert.equal(new URL(address).pathname,'/api/v1/platform/onboarding-sessions');assert.deepEqual(JSON.parse(init.body),input);return json({...base(),url:url()},201);}
    assert.equal(new URL(address).pathname,`/api/v1/platform/onboarding-sessions/${id}`);assert.equal(new Headers(init.headers).has('idempotency-key'),false);return json(base());
  });
  assert.equal((await client.onboarding.create(input)).data.url,url());assert.equal((await client.onboarding.get(id)).data.status,'created');assert.equal(calls,2);
});
test('unknown providers, fake authority, account selection and unregistered-shaped returns fail before dispatch',async()=>{
  let calls=0;const client=platform(async()=>{calls++;throw new Error();});
  for(const patch of [{provider:'shopify'},{businessId:'../other'},{approved:true},{actorUserId:id},{installationId},{defaultWhatsAppAccount:id},{accessToken:'private'},{returnUrl:'http://partner.example/'}])
    await assert.rejects(client.onboarding.create({...input,...patch}),InsideDMConfigurationError);
  await assert.rejects(client.onboarding.get('../other'),InsideDMConfigurationError);await assert.rejects(client.onboarding.get(id,{idempotencyKey:'read'}),InsideDMConfigurationError);assert.equal(calls,0);
});
test('a retry preserves the captured business, setup intent and generated idempotency key',async()=>{
  const mutable={...input},seen=[];const client=platform(async(_address,init)=>{
    seen.push({body:init.body,key:new Headers(init.headers).get('idempotency-key')});mutable.businessId=randomUUID();mutable.returnUrl='https://changed.example/';
    return seen.length===1?createProblemResponse('rate_limited',{retryAfterSeconds:0}):json({...base(),url:url()},201);
  },{maxRetries:1});
  const result=await client.onboarding.create(mutable);assert.equal(result.meta.attempts,2);assert.deepEqual(seen[0],seen[1]);assert.equal(result.data.businessId,businessId);
});
test('uncertain setup exposes explicit intent recovery without default logging of keys or private links',async()=>{
  await assert.rejects(platform(async()=>{throw new Error(key+url()+input.returnUrl);}).onboarding.create(input),error=>{
    assert.equal(error.recovery.operation,'createOnboardingSession');assert.equal(error.recovery.businessId,businessId);assert.match(error.recovery.idempotencyKey,/^[a-f0-9-]{36}$/);
    for(const serialized of [inspect(error),JSON.stringify(error)])for(const secret of [key,url(),input.returnUrl,error.recovery.idempotencyKey])assert.equal(serialized.includes(secret),false);return true;
  });
});
test('wrong session, business, application and private-link contexts fail closed while reads strip secrets',async()=>{
  for(const patch of [{businessId:randomUUID()},{url:url().replace(id,randomUUID())},{status:'completed',finishExpiresAt:new Date(Date.now()+650_000).toISOString()}])
    await assert.rejects(platform(async()=>json({...base(),url:url(),...patch},201)).onboarding.create(input),InsideDMProtocolError);
  await assert.rejects(platform(async()=>json({...base(),id:randomUUID()})).onboarding.get(id),InsideDMProtocolError);
  const result=await platform(async()=>json({...base(),url:url(),authorizedBy:id,accessToken:'private'})).onboarding.get(id);
  for(const field of ['url','authorizedBy','accessToken'])assert.equal(field in result.data,false);
  let calls=0;const client=platform(async()=>json({...base(),applicationId:++calls===1?applicationId:randomUUID()}));await client.onboarding.get(id);await assert.rejects(client.onboarding.get(id),InsideDMProtocolError);
});
