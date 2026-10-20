import assert from 'node:assert/strict';
import test from 'node:test';
import {inspect} from 'node:util';
import {InsideDMConfigurationError} from '../dist/esm/index.js';
import {createTestClient,TEST_ID} from '../dist/esm/testing.js';
const notification=()=>({intent:'notification',to:{phone:'+919800000099'},content:{type:'template',template:{id:TEST_ID},variables:{name:' Asha '}}});
const revision=`op1_${'A'.repeat(43)}`;

test('one key submits a notification, previews it and recovers progress without selecting an account',async()=>{
  const requests=[];
  const sdk=createTestClient({respond(request,response){requests.push(request);return response;}});
  assert.equal(requests.length,0);
  const submitted=await sdk.messages.send(notification(),{idempotencyKey:'order/123'});
  assert.equal(submitted.data.kind,'messages.send');assert.equal(submitted.meta.idempotencyKey,'order/123');
  assert.deepEqual(await requests[1].clone().json(),{...notification(),content:{...notification().content,variables:{name:'Asha'}}});
  assert.equal(requests[1].url,`https://api.insidedm.io/api/v1/inbox/${TEST_ID}/messages`);
  const preview=await sdk.messages.preview(notification());assert.equal(preview.data.channel,'whatsapp');
  assert.equal(requests[2].headers.get('idempotency-key'),null);
  await sdk.operations.get(submitted.data.id);assert.equal(requests[3].method,'GET');assert.equal(await requests[3].clone().text(),'');
  await sdk.operations.lookup('order/123');assert.equal(requests[4].method,'POST');
  assert.equal(requests[4].headers.get('idempotency-key'),null);assert.equal(requests[4].url.includes('order/123'),false);
  assert.deepEqual(await requests[4].clone().json(),{idempotencyKey:'order/123'});
  await sdk.operations.cancel(submitted.data.id,{expectedRevision:revision},{idempotencyKey:'cancel/123'});
  assert.equal(requests[5].headers.get('idempotency-key'),'cancel/123');
  assert.deepEqual(await requests[5].clone().json(),{expectedRevision:revision});
  assert.equal(requests.filter(r=>r.url.endsWith('/v1/workspace')).length,1);
});
test('invalid sends and cancellation revisions fail before tenant discovery or any network call',async()=>{
  let calls=0;const sdk=createTestClient({respond(_,r){calls++;return r;}});
  for(const value of [{...notification(),senderId:TEST_ID},{...notification(),intent:'reply'},
    {...notification(),to:{phone:'9800000099'}},{...notification(),content:{type:'text',text:' '}},
    {...notification(),content:{...notification().content,variables:{name:undefined}}}]){
    await assert.rejects(sdk.messages.send(value),InsideDMConfigurationError);
  }
  await assert.rejects(sdk.operations.get('../operations'),InsideDMConfigurationError);
  await assert.rejects(sdk.operations.cancel(TEST_ID,{expectedRevision:'old'}),InsideDMConfigurationError);
  await assert.rejects(sdk.operations.lookup(' bad key'),InsideDMConfigurationError);
  assert.equal(calls,0);
});
test('send and preview infer the sole supported intent without mutating caller input',async()=>{
  const requests=[];
  const sdk=createTestClient({respond(request,response){requests.push(request);return response;}});
  const input=Object.freeze({to:Object.freeze({phone:'+919800000099'}),content:Object.freeze({type:'template',template:Object.freeze({id:TEST_ID})})});
  await sdk.messages.preview(input);
  await sdk.messages.send(input,{idempotencyKey:'order/intent-default'});
  for(const request of requests.filter(request=>request.method==='POST')){
    const body=await request.clone().json();
    assert.equal(body.intent,'notification');assert.deepEqual(body.content.variables,{});
  }
  assert.equal(Object.hasOwn(input,'intent'),false);
  assert.equal(requests.filter(request=>request.method==='POST').length,2);
});
test('lost submission retries the original serialized request and key even if caller mutates its input',async()=>{
  const writes=[],input=notification();let lost=false;
  const sdk=createTestClient({respond:async(request,response)=>{
    if(request.method==='POST'){writes.push({body:await request.clone().text(),key:request.headers.get('idempotency-key')});
      if(!lost){lost=true;input.content.variables.name='Changed';throw new Error('Fixture response lost.');}}
    return response;
  }});
  const result=await sdk.messages.send(input,{idempotencyKey:'order/123',maxRetries:1});
  assert.equal(result.meta.attempts,2);assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);
});
test('an uncertain submission exposes its generated recovery key explicitly and excludes it from logs',async()=>{
  const sdk=createTestClient({respond(request,response){if(request.method==='POST')throw new Error('Fixture unknown.');return response;}});
  await assert.rejects(sdk.messages.send(notification()),error=>{
    assert.equal(error.recovery.operation,'sendMessage');assert.match(error.recovery.idempotencyKey,/^[a-f0-9-]{36}$/);
    assert.equal(inspect(error).includes(error.recovery.idempotencyKey),false);
    assert.equal(JSON.stringify(error).includes(error.recovery.idempotencyKey),false);return error.kind==='transport';
  });
});
