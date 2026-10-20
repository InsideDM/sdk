import assert from 'node:assert/strict';
import test from 'node:test';
import {inspect} from 'node:util';
import {InsideDMConfigurationError,InsideDMProtocolError} from '../dist/esm/index.js';
import {createTestClient,TEST_ID} from '../dist/esm/testing.js';

const event=()=>({id:'orders/123/ready',binding:TEST_ID,subject:{contactId:TEST_ID},properties:{order:{id:'123'}}});

test('a stable event ID publishes to the shared flow owner with inferred type and one-key discovery',async()=>{
  const requests=[],input=event();
  const sdk=createTestClient({respond(request,response){requests.push(request);return response;}});
  const result=await sdk.events.publish(input);
  assert.equal(result.data.kind,'events.publish');assert.equal(result.meta.idempotencyKey,input.id);
  assert.equal(requests.length,2);assert.equal(requests[1].url,`https://sdk-fixture.invalid/api/v1/flows/${TEST_ID}/events`);
  assert.equal(requests[1].headers.get('idempotency-key'),input.id);
  assert.deepEqual(await requests[1].clone().json(),{...input,type:'flow.triggered'});
  assert.equal(Object.hasOwn(input,'type'),false);
  await sdk.operations.lookup({kind:'events.publish',idempotencyKey:input.id});
  assert.deepEqual(await requests[2].clone().json(),{kind:'events.publish',idempotencyKey:input.id});
  assert.equal(requests[2].headers.get('idempotency-key'),null);
  assert.equal(requests[2].url.includes(input.id),false);
});

test('invalid event inputs and a conflicting retry key fail before discovery',async()=>{
  let calls=0;const sdk=createTestClient({respond(_,response){calls++;return response;}});
  const sparse=[];sparse.length=1;sparse.extra='lossy';
  for(const input of [{...event(),id:' '},{...event(),binding:'../flows'},
    {...event(),subject:{contactId:TEST_ID,phone:'+919800000099'}},{...event(),type:'order.created'},
    {...event(),occurredAt:'yesterday'},{...event(),properties:{value:undefined}},
    {...event(),properties:JSON.parse('{"__proto__":{"secret":true}}')},
    {...event(),properties:{value:sparse}},{...event(),properties:{value:Number.NaN}},
    {...event(),properties:{value:'x'.repeat(33*1024)}},{...event(),resumeRunId:TEST_ID}]){
    await assert.rejects(sdk.events.publish(input),InsideDMConfigurationError);
  }
  await assert.rejects(sdk.events.publish(event(),{idempotencyKey:'another/event'}),InsideDMConfigurationError);
  await assert.rejects(sdk.operations.lookup({kind:'other',idempotencyKey:'event'}),InsideDMConfigurationError);
  assert.equal(calls,0);
});

test('event retries preserve the original properties, occurrence and event ID after caller mutation',async()=>{
  const writes=[],input=event();input.occurredAt='2026-10-19T12:00:00.000Z';
  const sdk=createTestClient({respond:async(request,response)=>{
    if(request.method==='POST'){
      writes.push({body:await request.clone().text(),key:request.headers.get('idempotency-key')});
      if(writes.length===1){input.id='changed';input.properties.order.id='changed';throw new Error('Lost response.');}
    }
    return response;
  }});
  const result=await sdk.events.publish(input,{maxRetries:1});
  assert.equal(result.meta.attempts,2);assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);
  assert.equal(JSON.parse(writes[0].body).properties.order.id,'123');
});

test('uncertain publication exposes explicit recovery without logging the customer event ID',async()=>{
  const input=event(),sdk=createTestClient({respond(request,response){if(request.method==='POST')throw new Error('Lost response.');return response;}});
  await assert.rejects(sdk.events.publish(input),error=>{
    assert.deepEqual(error.recovery,{operation:'publishEvent',idempotencyKey:input.id});
    assert.equal(inspect(error).includes(input.id),false);assert.equal(JSON.stringify(error).includes(input.id),false);
    return error.kind==='transport';
  });
});

test('event publication requires 202 and refuses a mismatched operation/resource pair',async()=>{
  for(const mode of ['wrong-status','wrong-resource']){
    const sdk=createTestClient({respond:async(request,response)=>{
      if(request.method!=='POST')return response;
      const body=await response.json();
      if(mode==='wrong-resource')body.data.resource={type:'message',id:TEST_ID};
      return new Response(JSON.stringify(body),{status:mode==='wrong-status'?200:202,headers:response.headers});
    }});
    await assert.rejects(sdk.events.publish(event()),InsideDMProtocolError);
  }
});
