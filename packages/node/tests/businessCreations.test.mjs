import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect} from 'node:util';
import {randomUUID} from 'node:crypto';
import {InsideDMPlatform,InsideDMConfigurationError,InsideDMProtocolError} from '../dist/esm/index.js';
import {createProblemResponse,TEST_REQUEST_ID} from '../dist/esm/testing.js';
const key=`idmp_${Buffer.alloc(12,7).toString('base64url')}_${Buffer.alloc(32,9).toString('base64url')}`,id=randomUUID(),applicationId=randomUUID(),businessId=randomUUID();
const input={externalId:'merchant_42',name:'New merchant',timeZone:'Europe/London',returnUrl:'https://partner.example/complete'};
const data=()=>({id,applicationId,businessId,externalId:input.externalId,status:'needs_owner_claim',revision:'1',claimExpiresAt:new Date(Date.now()+600_000).toISOString()});
const link=()=>`https://app.example/integrations/claim#creation=${id}&token=${'a'.repeat(42)}A`;
const json=(data,status=200)=>new Response(JSON.stringify({data}),{status,headers:{'content-type':'application/json','x-request-id':TEST_REQUEST_ID}});
const platform=(fetch,options={})=>new InsideDMPlatform({apiKey:key,fetch,maxRetries:0,...options});
test('client provisioning, outcome reads and explicit link renewal use the canonical app owners without tenant discovery',async()=>{
  const client=platform(async(url,init)=>{
    const path=new URL(url).pathname;assert.equal(new Headers(init.headers).get('authorization'),`Bearer ${key}`);
    if(path==='/api/v1/platform/businesses'){assert.equal(init.method,'POST');assert.deepEqual(JSON.parse(init.body),input);return json({...data(),claimUrl:link()},201);}
    if(init.method==='GET'){assert.equal(path,`/api/v1/platform/business-creations/${id}`);assert.equal(new Headers(init.headers).has('idempotency-key'),false);return json({...data(),status:'owner_claimed'});}
    assert.equal(path,`/api/v1/platform/business-creations/${id}/claim-link`);assert.deepEqual(JSON.parse(init.body),{expectedRevision:'1'});return json({...data(),revision:'2',claimUrl:link()});
  });
  assert.equal((await client.businesses.create(input,{idempotencyKey:'create/client-42'})).data.claimUrl,link());
  assert.equal((await client.businessCreations.get(id)).data.status,'owner_claimed');assert.equal((await client.businessCreations.renewClaimLink(id,{expectedRevision:'1'})).data.revision,'2');
});
test('business setup rejects identity, scope, billing and sender overrides before network',async()=>{
  let calls=0;const client=platform(async()=>{calls++;throw new Error();});
  for(const patch of [{externalId:'client@example.test'},{name:' trailing '},{timeZone:'Invalid/zone'},{timeZone:null},{ownerEmail:'owner@example.test'},
    {approved:true},{scopes:['messages.send']},{billingPayer:'partner'},{defaultWhatsAppAccount:id},{returnUrl:'javascript:alert(1)'}])
    await assert.rejects(client.businesses.create({...input,...patch}),InsideDMConfigurationError);
  await assert.rejects(client.businessCreations.get(id,{idempotencyKey:'read'}),InsideDMConfigurationError);
  await assert.rejects(client.businessCreations.get('../other'),InsideDMConfigurationError);
  await assert.rejects(client.businessCreations.renewClaimLink(id,{expectedRevision:'0'}),InsideDMConfigurationError);
  await assert.rejects(client.businessCreations.renewClaimLink(id,{expectedRevision:'1',businessId}),InsideDMConfigurationError);assert.equal(calls,0);
});
test('retries retain captured creation intent and key even if caller input changes after dispatch',async()=>{
  const seen=[],mutable={...input};const client=platform(async(_url,init)=>{
    seen.push({body:init.body,key:new Headers(init.headers).get('idempotency-key')});mutable.externalId='changed';mutable.name='Changed';
    return seen.length===1?createProblemResponse('rate_limited',{retryAfterSeconds:0}):json({...data(),claimUrl:link()},201);
  },{maxRetries:1});
  const created=await client.businesses.create(mutable);assert.equal(created.meta.attempts,2);assert.deepEqual(seen[0],seen[1]);assert.equal(created.data.externalId,input.externalId);
});
test('uncertain creations and replacements expose explicit safe recovery metadata without default secret logging',async()=>{
  const client=platform(async()=>{throw new Error(key+link()+input.returnUrl);});
  for(const run of [()=>client.businesses.create(input),()=>client.businessCreations.renewClaimLink(id,{expectedRevision:'1'})])await assert.rejects(run(),error=>{
    assert.match(error.recovery.idempotencyKey,/^[a-f0-9-]{36}$/);assert.ok(['createPlatformBusiness','renewBusinessClaimLink'].includes(error.recovery.operation));
    if(error.recovery.operation==='renewBusinessClaimLink')assert.equal(error.recovery.creationId,id);
    for(const serialized of [inspect(error),JSON.stringify(error)])for(const secret of [key,link(),input.returnUrl])assert.equal(serialized.includes(secret),false);return true;
  });
});
test('foreign contexts fail closed and unknown profile or capability fields never escape metadata reads',async()=>{
  for(const wrong of [{...data(),externalId:'another-client',claimUrl:link()},{...data(),claimUrl:link().replace(id,randomUUID())},{...data(),status:'owner_claimed',claimUrl:link()}])
    await assert.rejects(platform(async()=>json(wrong,201)).businesses.create(input),InsideDMProtocolError);
  await assert.rejects(platform(async()=>json({...data(),id:randomUUID()})).businessCreations.get(id),InsideDMProtocolError);
  const read=await platform(async()=>json({...data(),claimUrl:link(),name:'Private profile',claimedBy:id})).businessCreations.get(id);
  for(const field of ['claimUrl','name','claimedBy'])assert.equal(field in read.data,false);
  let calls=0;const client=platform(async()=>json({...data(),applicationId:++calls===1?applicationId:randomUUID()}));
  await client.businessCreations.get(id);await assert.rejects(client.businessCreations.get(id),InsideDMProtocolError);
});
