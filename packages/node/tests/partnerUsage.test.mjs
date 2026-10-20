import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {InsideDMPlatform,InsideDMConfigurationError,InsideDMProtocolError} from '../dist/esm/index.js';
import {createProblemResponse,TEST_REQUEST_ID} from '../dist/esm/testing.js';
const key=`idmp_${Buffer.alloc(12,7).toString('base64url')}_${Buffer.alloc(32,9).toString('base64url')}`,id=randomUUID(),app=randomUUID();
const data=()=>({businessId:id,applicationId:app,installation:{id,status:'active'},meter:'api_requests',unit:'requests',basis:'telemetry',timeZone:'UTC',granularity:'day',
  from:'2026-10-18T00:00:00.000Z',to:'2026-10-19T00:00:00.000Z',totalAdmitted:3,totalRefused:1,points:[{bucketStart:'2026-10-18T00:00:00.000Z',admitted:3,refused:1}],
  freshness:{source:'batched_public_api_counters',observedAt:'2026-10-20T01:00:00.000Z',retainedSince:'2026-09-19T01:00:00.000Z',latestRecordedMinute:'2026-10-18T12:00:00.000Z'}});
const json=value=>new Response(JSON.stringify({data:value}),{headers:{'content-type':'application/json','x-request-id':TEST_REQUEST_ID}});
const platform=(fetch,options={})=>new InsideDMPlatform({apiKey:key,fetch,maxRetries:0,...options});
test('usage normalizes convenient dates and routes one own-client telemetry read without discovery',async()=>{
  const client=platform(async(url,init)=>{
    const parsed=new URL(url);assert.equal(parsed.pathname,`/api/v1/platform/businesses/${id}/usage`);assert.equal(parsed.searchParams.get('from'),data().from);assert.equal(parsed.searchParams.get('to'),data().to);
    assert.equal(init.method,'GET');assert.equal(new Headers(init.headers).get('authorization'),`Bearer ${key}`);assert.equal(new Headers(init.headers).has('idempotency-key'),false);return json(data());
  });
  const report=await client.usage.get({businessId:id,from:'2026-10-18',to:new Date('2026-10-19T00:00:00Z')});assert.equal(report.data.totalAdmitted,3);assert.equal(report.data.basis,'telemetry');
});
test('invalid windows, caller producers and mutation keys are refused before network',async()=>{
  let calls=0;const client=platform(async()=>{calls++;throw new Error();});
  for(const patch of [{businessId:'bad'},{from:'2026-02-30'},{from:'2026-10-18T01:00:00Z'},{from:'2026-01-01',to:'2026-03-01'},
    {granularity:'month'},{producerId:id},{installationId:id},{cost:0},{from:new Date(NaN)}])await assert.rejects(client.usage.get({businessId:id,...patch}),InsideDMConfigurationError);
  await assert.rejects(client.usage.get({businessId:id},{idempotencyKey:'read'}),InsideDMConfigurationError);assert.equal(calls,0);
});
test('usage retries preserve the frozen normalized window when caller dates change',async()=>{
  const urls=[],from=new Date(data().from),to=new Date(data().to),input={businessId:id,from,to};
  const client=platform(async(url)=>{urls.push(String(url));from.setUTCFullYear(2020);input.to=new Date('2026-11-01T00:00:00Z');return urls.length===1?createProblemResponse('rate_limited',{retryAfterSeconds:0}):json(data());},{maxRetries:1});
  assert.equal((await client.usage.get(input)).meta.attempts,2);assert.equal(urls[0],urls[1]);
});
test('foreign attribution, mismatched periods and invented billing totals fail closed',async()=>{
  for(const wrong of [{...data(),businessId:randomUUID()},{...data(),totalAdmitted:4},{...data(),basis:'billable'},
    {...data(),from:'2026-10-17T00:00:00.000Z'}, {...data(),freshness:{...data().freshness,retainedSince:'2026-10-18T12:00:00Z'}}])await assert.rejects(platform(async()=>json(wrong)).usage.get({businessId:id,from:'2026-10-18',to:'2026-10-19'}),InsideDMProtocolError);
});
