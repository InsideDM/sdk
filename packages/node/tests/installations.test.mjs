import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {inspect} from 'node:util';
import {InsideDMPlatform,InsideDMConfigurationError,InsideDMProtocolError} from '../dist/esm/index.js';
import {createProblemResponse,TEST_REQUEST_ID} from '../dist/esm/testing.js';
const key=`idmp_${Buffer.alloc(12,7).toString('base64url')}_${Buffer.alloc(32,9).toString('base64url')}`,id=randomUUID(),app=randomUUID();
const data=()=>({id,businessId:randomUUID(),applicationId:app,status:'active',scopes:['messages.send'],authorityVersion:'1',revision:'1'});
const json=value=>new Response(JSON.stringify({data:value}),{headers:{'content-type':'application/json','x-request-id':TEST_REQUEST_ID}});
const platform=(fetch,options={})=>new InsideDMPlatform({apiKey:key,fetch,maxRetries:0,...options});
test('installation methods route only the installation ID and exact reviewed intent, without business discovery',async()=>{
  const calls=[],value=data();const client=platform(async(url,init)=>{
    calls.push(init);assert.equal(new Headers(init.headers).get('authorization'),`Bearer ${key}`);
    if(init.method==='GET'){assert.equal(new URL(url).pathname,`/api/v1/platform/installations/${id}`);assert.equal(new Headers(init.headers).has('idempotency-key'),false);return json(value);}
    assert.equal(new URL(url).pathname,`/api/v1/platform/installations/${id}/revoke`);assert.deepEqual(JSON.parse(init.body),{expectedRevision:'1',reason:'requested'});return json({...value,status:'revoked',authorityVersion:'2',revision:'2'});
  });
  const read=await client.installations.get(id);assert.equal(read.data.status,'active');
  const result=await client.installations.revoke(id,{expectedRevision:read.data.revision,reason:'requested'});assert.equal(result.data.status,'revoked');assert.equal(calls.length,2);assert.ok(result.meta.idempotencyKey);
});
test('malformed revisions, unsupported reasons and authority overrides fail before network',async()=>{
  let calls=0;const client=platform(async()=>{calls++;throw new Error();});
  for(const patch of [{businessId:id},{approved:true},{expectedRevision:1},{expectedRevision:'0'},{expectedRevision:'2147483648'},{reason:'erase'}])await assert.rejects(client.installations.revoke(id,{expectedRevision:'1',reason:'requested',...patch}),InsideDMConfigurationError);
  await assert.rejects(client.installations.get('../other'),InsideDMConfigurationError);
  await assert.rejects(client.installations.get(id,{idempotencyKey:'read'}),InsideDMConfigurationError);assert.equal(calls,0);
});
test('a lost revoke answer carries explicit recovery intent while logs exclude credentials',async()=>{
  const client=platform(async()=>{throw new Error(key);});
  await assert.rejects(client.installations.revoke(id,{expectedRevision:'1',reason:'security'},{idempotencyKey:'disconnect/client-one'}),error=>{
    assert.deepEqual(error.recovery,{operation:'revokeInstallation',installationId:id,idempotencyKey:'disconnect/client-one'});
    assert.equal(inspect(error).includes(key),false);assert.equal(JSON.stringify(error).includes(key),false);return true;
  });
});
test('retries preserve intent and a historical replay may truthfully report a fresh active grant',async()=>{
  const seen=[],value=data();const client=platform(async(_url,init)=>{
    seen.push({body:init.body,key:new Headers(init.headers).get('idempotency-key')});
    return seen.length===1?createProblemResponse('rate_limited',{retryAfterSeconds:0}):json({...value,authorityVersion:'3',revision:'3'});
  },{maxRetries:1});
  const result=await client.installations.revoke(id,{expectedRevision:'1',reason:'requested'});assert.equal(result.data.status,'active');assert.equal(result.data.revision,'3');assert.deepEqual(seen[0],seen[1]);
});
test('foreign installation or changing application responses are refused',async()=>{
  await assert.rejects(platform(async()=>json({...data(),id:randomUUID()})).installations.get(id),InsideDMProtocolError);
  let calls=0;const client=platform(async()=>json({...data(),applicationId:++calls===1?app:randomUUID()}));
  await client.installations.get(id);await assert.rejects(client.installations.get(id),InsideDMProtocolError);
});
