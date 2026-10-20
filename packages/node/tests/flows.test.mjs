import assert from 'node:assert/strict';
import test from 'node:test';
import {InsideDMConfigurationError,InsideDMProtocolError} from '../dist/esm/index.js';
import {createTestClient,TEST_ID} from '../dist/esm/testing.js';

test('run progress uses the canonical dashboard endpoint and a fixed minimal projection',async()=>{
  const requests=[],sdk=createTestClient({respond(request,response){requests.push(request);return response;}});
  const {data}=await sdk.flows.runs.get(TEST_ID);
  assert.equal(data.id,TEST_ID);assert.equal(data.status,'running');assert.equal(data.completedAt,null);
  assert.equal(requests.length,2);assert.equal(requests[1].url,`https://api.insidedm.io/api/v1/dashboard/${TEST_ID}/agent-runs/${TEST_ID}?view=progress`);
  assert.equal(requests[1].headers.get('idempotency-key'),null);assert.equal(await requests[1].text(),'');
});
test('bad run IDs fail before discovery',async()=>{
  let calls=0;const sdk=createTestClient({respond(_,response){calls++;return response;}});
  for(const id of ['',undefined,'../private','https://private.test',`${TEST_ID}?view=full`])await assert.rejects(sdk.flows.runs.get(id),InsideDMConfigurationError);
  assert.equal(calls,0);
});
test('progress refuses the wrong run and inconsistent terminal timestamps',async()=>{
  for(const mutation of [data=>({...data,id:'00000000-0000-4000-8000-000000000002'}),data=>({...data,status:'completed'})]){
    const sdk=createTestClient({respond:async(request,response)=>{
      if(!request.url.includes('/agent-runs/'))return response;
      const body=await response.json();return new Response(JSON.stringify({data:mutation(body.data)}),{status:200,headers:response.headers});
    }});
    await assert.rejects(sdk.flows.runs.get(TEST_ID),InsideDMProtocolError);
  }
});
