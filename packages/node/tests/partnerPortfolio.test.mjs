import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {InsideDMPlatform,InsideDMConfigurationError,InsideDMProtocolError,InsideDMApiError} from '../dist/esm/index.js';
import {createProblemResponse,TEST_REQUEST_ID} from '../dist/esm/testing.js';
const key=`idmp_${Buffer.alloc(12,7).toString('base64url')}_${Buffer.alloc(32,9).toString('base64url')}`,id=randomUUID(),app=randomUUID();
const business=(businessId=id,applicationId=app)=>({id:businessId,name:'Client',status:'active',timeZone:'Asia/Kolkata',installation:{id:businessId,businessId,applicationId,status:'active',scopes:['messages.send'],authorityVersion:'1',revision:'1'}});
const json=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json','x-request-id':TEST_REQUEST_ID}});
const platform=fetch=>new InsideDMPlatform({apiKey:key,fetch,maxRetries:0});
test('portfolio iterators are lazy, follow empty pages and preserve limits without business discovery',async()=>{
  const urls=[];const client=platform(async(url,init)=>{
    const parsed=new URL(url);urls.push(parsed);assert.equal(parsed.pathname,'/api/v1/platform/businesses');assert.equal(parsed.searchParams.get('limit'),'1');assert.equal(new Headers(init.headers).get('authorization'),`Bearer ${key}`);
    const cursor=parsed.searchParams.get('cursor');return json(cursor===null?{data:[],page:{nextCursor:'next'}}:cursor==='next'?{data:[business()],page:{nextCursor:'last'}}:{data:[business(randomUUID())],page:{nextCursor:null}});
  });
  const params={limit:1},iterator=client.businesses.iterate(params,{maxItems:1});params.limit=50;assert.equal(urls.length,0);
  const values=[];for await(const row of iterator)values.push(row);assert.equal(values.length,1);assert.equal(values[0].id,id);assert.equal(urls.length,2);
});
test('portfolio get and list accept only bounded parameters and current matching metadata',async()=>{
  let calls=0;const client=platform(async(url)=>{calls++;assert.equal(new URL(url).pathname,`/api/v1/platform/businesses/${id}`);return json({data:business()});});
  assert.equal((await client.businesses.get(id)).data.id,id);
  await assert.rejects(client.businesses.get('../other'),InsideDMConfigurationError);
  await assert.rejects(client.businesses.get(id,{idempotencyKey:'read'}),InsideDMConfigurationError);
  await assert.rejects(client.businesses.list({},{idempotencyKey:'read'}),InsideDMConfigurationError);
  for(const params of [{limit:0},{limit:51},{cursor:''},{businessId:id},{status:'active'}])await assert.rejects(client.businesses.list(params),InsideDMConfigurationError);
  assert.equal(calls,1);
});
test('foreign business, mixed application pages, revoked profiles and repeated cursors are refused',async()=>{
  await assert.rejects(platform(async()=>json({data:business(randomUUID())})).businesses.get(id),InsideDMProtocolError);
  await assert.rejects(platform(async()=>json({data:[business(),business(randomUUID(),randomUUID())],page:{nextCursor:null}})).businesses.list(),InsideDMProtocolError);
  await assert.rejects(platform(async()=>json({data:[{...business(),installation:{...business().installation,status:'revoked'}}],page:{nextCursor:null}})).businesses.list(),InsideDMProtocolError);
  const repeated=platform(async()=>json({data:[],page:{nextCursor:'repeat'}}));
  await assert.rejects(async()=>{for await(const page of repeated.businesses.pages({}, {maxPages:4})){assert.equal(page.data.length,0);}},error=>error instanceof InsideDMProtocolError&&error.code==='repeated_cursor');
});
test('cursor expiry remains a visible failure and never silently restarts the walk',async()=>{
  let calls=0;const client=platform(async()=>++calls===1?json({data:[],page:{nextCursor:'expired'}}):createProblemResponse('invalid_cursor'));
  await assert.rejects(async()=>{for await(const _row of client.businesses.iterate()){throw new Error('No business was returned.');}},error=>error instanceof InsideDMApiError&&error.code==='invalid_cursor');assert.equal(calls,2);
});
