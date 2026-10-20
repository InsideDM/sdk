import assert from 'node:assert/strict';
import test from 'node:test';
import { InsideDMPlatform, InsideDMConfigurationError, InsideDMProtocolError } from '../dist/esm/index.js';
import { createTestClient, createProblemResponse, TEST_ID, TEST_REQUEST_ID } from '../dist/esm/testing.js';
const otherId = '11111111-1111-4111-8111-111111111111';
const json = (data, status=200) => new Response(JSON.stringify({data}), {status,headers:{'content-type':'application/json','x-request-id':TEST_REQUEST_ID}});
const receipt = () => ({businessId:TEST_ID,recipeId:TEST_ID,packId:'lead-capture',version:'1',digest:'sha256:'+'0'.repeat(64),status:'draft'});

test('one-key discovery serves the fixed catalog view and imports an exact version through the canonical builder path', async () => {
  const requests=[],client=createTestClient({respond(request,response){requests.push(request);return response;}});
  const catalog=await client.flows.templates.catalog({limit:undefined});
  assert.equal(catalog.data.businessId,TEST_ID);assert.deepEqual(catalog.data.page,{hasMore:false,nextCursor:null});
  assert.equal(requests[1].url,`https://api.insidedm.io/api/v1/dashboard/${TEST_ID}/automation-runtime/catalog?limit=25&view=flow_templates`);
  assert.equal(requests[1].headers.get('idempotency-key'),null);
  const imported=await client.flows.templates.import('lead-capture',{version:'1'},{idempotencyKey:'client/import/1'});
  assert.equal(imported.data.status,'draft');assert.equal(imported.meta.idempotencyKey,'client/import/1');
  assert.equal(requests[2].method,'POST');assert.equal(requests[2].url,`https://api.insidedm.io/api/v1/dashboard/${TEST_ID}/automation-runtime/template-packs/lead-capture/import`);
  assert.deepEqual(await requests[2].clone().json(),{version:'1'});
});
test('invalid pack, revision, graph, authority and read options fail before workspace discovery', async () => {
  let calls=0;const client=createTestClient({respond(_,response){calls++;return response;}});
  for(const params of [null,{limit:0},{limit:101},{limit:1.5},{cursor:''},{cursor:'../path'},{businessId:TEST_ID},{view:'full'}])await assert.rejects(client.flows.templates.catalog(params),InsideDMConfigurationError);
  await assert.rejects(client.flows.templates.catalog({}, {idempotencyKey:'unused'}),InsideDMConfigurationError);
  for(const [pack,input] of [['../lead',{version:'1'}],['lead-capture',{version:'01'}],['lead-capture',{version:'2147483648'}],['lead-capture',{version:'1',graph:{}}],
    ['lead-capture',{version:'1',actorUserId:TEST_ID}],['lead-capture',{version:'1',bindings:{endpoint:{endpointId:TEST_ID,expectedRevision:-1}}}],
    ['lead-capture',{version:'1',bindings:{endpoint:{endpointId:TEST_ID,expectedRevision:0,url:'https://private.example'}}}]])await assert.rejects(client.flows.templates.import(pack,input),InsideDMConfigurationError);
  assert.equal(calls,0);
});
test('catalog continuations accept empty filtered pages and reject inconsistent or foreign responses', async () => {
  const requests=[],client=createTestClient({respond(request,response){requests.push(request);return response;}});
  await client.flows.templates.catalog({limit:1,cursor:'signed.cursor'});
  assert.equal(new URL(requests[1].url).searchParams.get('cursor'),'signed.cursor');
  const catalog={businessId:TEST_ID,templates:[],dependencies:[],page:{hasMore:true,nextCursor:'next.cursor'}};
  const withResult=data=>createTestClient({respond(request,response){return new URL(request.url).pathname.endsWith('/catalog')?json(data):response;}});
  assert.deepEqual((await withResult(catalog).flows.templates.catalog()).data.page,catalog.page);
  for(const data of [{...catalog,businessId:otherId},{...catalog,page:{hasMore:false,nextCursor:'next.cursor'}}])await assert.rejects(withResult(data).flows.templates.catalog(),InsideDMProtocolError);
  assert.equal(Object.hasOwn((await withResult({...catalog,privateUrl:'https://private.example'}).flows.templates.catalog()).data,'privateUrl'),false);
});
test('import receipts reject foreign business, pack, version and automatic publication', async () => {
  for(const patch of [{businessId:otherId},{packId:'other-pack'},{version:'2'},{status:'published'}]){
    const client=createTestClient({respond(request,response){return request.method==='POST'?json({...receipt(),...patch},201):response;}});
    await assert.rejects(client.flows.templates.import('lead-capture',{version:'1'}),error=>{
      assert.ok(error instanceof InsideDMProtocolError);assert.equal(error.recovery.operation,'importFlowTemplate');assert.equal(error.recovery.packId,'lead-capture');return true;
    });
  }
});
test('approved partner imports snapshot bindings and retain one idempotency key across transient retries', async () => {
  const appKey=`idmp_${Buffer.alloc(12,7).toString('base64url')}_${Buffer.alloc(32,9).toString('base64url')}`;
  const delegation=`idmd_${Buffer.alloc(12,8).toString('base64url')}_${Buffer.alloc(32,10).toString('base64url')}`;
  const requests=[],input={version:'1',bindings:{'followup-endpoint':{endpointId:TEST_ID,expectedRevision:0}}};
  const platform=new InsideDMPlatform({apiKey:appKey,maxRetries:1,fetch:async(url,init)=>{
    if(new URL(url).pathname==='/api/v1/platform/delegations')return json({token:delegation,businessId:TEST_ID,applicationId:TEST_ID,installationId:TEST_ID,authorityVersion:'1',scopes:['flows.deploy'],expiresAt:new Date(Date.now()+60_000).toISOString()});
    requests.push({url:String(url),body:init.body,key:new Headers(init.headers).get('idempotency-key')});
    assert.equal(new Headers(init.headers).get('authorization'),`Bearer ${delegation}`);input.bindings['followup-endpoint'].expectedRevision=99;
    return requests.length===1?createProblemResponse('rate_limited',{retryAfterSeconds:0}):json({...receipt(),packId:'governed-webhook-followup'},201);
  }});
  const result=await platform.forBusiness(TEST_ID).flows.templates.import('governed-webhook-followup',input,{idempotencyKey:'deployment/client1/v1'});
  assert.equal(result.meta.attempts,2);assert.deepEqual(requests[0],requests[1]);assert.equal(JSON.parse(requests[0].body).bindings['followup-endpoint'].expectedRevision,0);
});
test('a lost import response exposes a private recovery key without logging caller input', async () => {
  const client=createTestClient({respond(request,response){if(request.method==='POST')throw new TypeError('connection lost');return response;}});
  await assert.rejects(client.flows.templates.import('lead-capture',{version:'1'},{idempotencyKey:'private/retry/key'}),error=>{
    assert.deepEqual(error.recovery,{operation:'importFlowTemplate',packId:'lead-capture',idempotencyKey:'private/retry/key'});
    assert.equal(JSON.stringify(error).includes('private/retry/key'),false);return true;
  });
});
test('deployment metadata reads share the existing editor GET and refuse invalid IDs or mutation keys before discovery',async()=>{
  const requests=[],client=createTestClient({respond(request,response){requests.push(request);return response;}});
  await assert.rejects(client.flows.deployments.get('not-a-flow'),InsideDMConfigurationError);
  await assert.rejects(client.flows.deployments.get(TEST_ID,{idempotencyKey:'unused'}),InsideDMConfigurationError);assert.equal(requests.length,0);
  const result=await client.flows.deployments.get(TEST_ID);assert.deepEqual(result.data.draft,{state:'unchanged',revision:1});
  assert.equal(requests[1].url,`https://api.insidedm.io/api/v1/flows/${TEST_ID}/recipes/${TEST_ID}/graph?view=deployment`);
  assert.equal(requests[1].method,'GET');assert.equal(requests[1].headers.get('idempotency-key'),null);
});
test('deployment responses bind business and flow while refusing contradictory drift observations',async()=>{
  for(const patch of [{businessId:otherId},{recipeId:otherId},{draft:{state:'unchanged',revision:null}},{draft:{state:'missing',revision:1}}]){
    const client=createTestClient({respond:async(request,response)=>new URL(request.url).pathname.endsWith('/graph')?json({...((await response.json()).data),...patch}):response});
    await assert.rejects(client.flows.deployments.get(TEST_ID),InsideDMProtocolError);
  }
});
