import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {InsideDMPlatform,InsideDMConfigurationError,InsideDMProtocolError} from '../dist/esm/index.js';
import {TEST_REQUEST_ID} from '../dist/esm/testing.js';
const key=`idmp_${Buffer.alloc(12,7).toString('base64url')}_${Buffer.alloc(32,9).toString('base64url')}`,id=randomUUID();
const data=()=>({application:{id,name:'App',status:'active'},partner:{id,name:'Partner'},scopes:['platform.businesses.link'],maximumBusinessScopes:['contacts.read'],returnUrls:[],credentialExpiresAt:new Date(Date.now()+86_400_000).toISOString()});
const json=value=>new Response(JSON.stringify({data:value}),{headers:{'content-type':'application/json','x-request-id':TEST_REQUEST_ID}});
test('self checks server application setup with no business discovery or mutation headers',async()=>{
  let calls=0;const client=new InsideDMPlatform({apiKey:key,fetch:async(url,init)=>{
    calls++;assert.equal(new URL(url).pathname,'/api/v1/platform/self');assert.equal(init.method,'GET');assert.equal(init.body,undefined);
    assert.equal(new Headers(init.headers).get('authorization'),`Bearer ${key}`);assert.equal(new Headers(init.headers).has('idempotency-key'),false);return json(data());
  }});
  assert.equal((await client.self.get()).data.application.id,id);assert.equal(calls,1);
  await assert.rejects(client.self.get({idempotencyKey:'read'}),InsideDMConfigurationError);assert.equal(calls,1);
  await assert.rejects(client.self.get(null),InsideDMConfigurationError);assert.equal(calls,1);
});
test('self responses reject unknown authority and cannot change the application seen by the same client',async()=>{
  let calls=0;const client=new InsideDMPlatform({apiKey:key,fetch:async()=>json({...data(),application:{...data().application,id:++calls===1?id:randomUUID()}})});
  await client.self.get();await assert.rejects(client.self.get(),InsideDMProtocolError);
  const unknown=new InsideDMPlatform({apiKey:key,fetch:async()=>json({...data(),scopes:['unknown.scope']})});
  await assert.rejects(unknown.self.get(),InsideDMProtocolError);
});
