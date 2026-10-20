import {createHash,randomUUID} from 'node:crypto';
import type {BusinessClient} from './client.js';
import {InsideDMConfigurationError,InsideDMError,type FailureKind} from './errors.js';
import {parseBoundedJson} from './generated/boundedJson.js';
import {parseBlueprintVersion,type PublicBlueprintVersion} from './generated/partnerBlueprints.js';
import {parsePreviewBlueprintUpdate,parseBlueprintUpdatePreview,type BlueprintUpdatePreview,type BlueprintUpdateReceipt,type BlueprintUpdateReason,type BlueprintUpdateTarget} from './generated/flowBlueprintUpdates.js';
import type {FlowTemplateBinding} from './generated/flowTemplateDeployments.js';
import type {RequestOptions} from './types.js';

/** Explicit client selections only; the SDK never discovers and updates a whole portfolio implicitly. */
export interface BlueprintRolloutClient{
  businessId:string;
  recipeId:string;
  bindings?:Record<string,FlowTemplateBinding>;
}
/** Safe diagnostic metadata. Provider responses, exception text and credentials are excluded. */
export interface BlueprintRolloutFailure{
  kind:FailureKind|'unexpected';code:string;status:number|null;requestId:string|null;
  retryable:boolean;retryAfterSeconds:number|null;
}
export interface BlueprintRolloutPlan{
  schemaVersion:'inside-blueprint-draft-rollout/v1';
  id:string;
  target:BlueprintUpdateTarget;
  clients:Array<{businessId:string;recipeId:string;preview:BlueprintUpdatePreview|null;error:BlueprintRolloutFailure|null}>;
}
export interface BlueprintRolloutOutcome{
  businessId:string;recipeId:string;
  state:'draft_updated'|'unchanged'|'action_required'|'preview_failed'|'not_attempted'|'failed';
  idempotencyKey:string|null;
  receipt:BlueprintUpdateReceipt|null;
  reasons:BlueprintUpdateReason[];
  error:BlueprintRolloutFailure|null;
  requestId:string|null;
}

const SCHEMA='inside-blueprint-draft-rollout/v1',MAX_CLIENTS=25,MAX_PLAN_BYTES=4*1024*1024;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function invalid():never{throw new InsideDMConfigurationError('Provide a saved rollout plan or 1–25 distinct business/flow selections with reviewed bindings.');}
function exact(v:Record<string,unknown>,required:string[],optional:string[]=[]){
  if(required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>![...required,...optional].includes(k)))invalid();
}
function snapshot(v:unknown):unknown{
  try{return parseBoundedJson(JSON.stringify(v),MAX_PLAN_BYTES);}catch{return invalid();}
}
function requestOptions(value:RequestOptions):RequestOptions{
  if(!record(value)||Object.keys(value).some(k=>!['signal','timeoutMs','attemptTimeoutMs','maxRetries'].includes(k))
    ||value.signal!==undefined&&!(value.signal instanceof AbortSignal))invalid();
  for(const [key,min,max] of [['timeoutMs',1,120000],['attemptTimeoutMs',1,60000],['maxRetries',0,5]] as const){
    const v=value[key];if(v!==undefined&&(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max))invalid();
  }
  return {...value};
}
function failure(error:unknown):BlueprintRolloutFailure{
  return error instanceof InsideDMError?{kind:error.kind,code:error.code,status:error.status,requestId:error.requestId,retryable:error.retryable,retryAfterSeconds:error.retryAfterSeconds}
    :{kind:'unexpected',code:'unexpected_failure',status:null,requestId:null,retryable:false,retryAfterSeconds:null};
}
function aborted():BlueprintRolloutFailure{return {kind:'aborted',code:'request_aborted',status:null,requestId:null,retryable:false,retryAfterSeconds:null};}
function readFailure(v:unknown):BlueprintRolloutFailure{
  if(!record(v))invalid();exact(v,['kind','code','status','requestId','retryable','retryAfterSeconds']);
  if(!['configuration','api','transport','timeout','aborted','protocol','webhook_verification','unexpected'].includes(String(v.kind))
    ||typeof v.code!=='string'||!/^[a-z][a-z0-9_]{0,127}$/.test(v.code)||typeof v.retryable!=='boolean'
    ||v.status!==null&&(typeof v.status!=='number'||!Number.isInteger(v.status)||v.status<100||v.status>599)
    ||v.requestId!==null&&(typeof v.requestId!=='string'||v.requestId.length>128||!/^[a-zA-Z0-9_-]+$/.test(v.requestId))
    ||v.retryAfterSeconds!==null&&(typeof v.retryAfterSeconds!=='number'||!Number.isFinite(v.retryAfterSeconds)||v.retryAfterSeconds<0))invalid();
  return v as unknown as BlueprintRolloutFailure;
}
function targetOf(v:unknown):BlueprintUpdateTarget{
  try{return parsePreviewBlueprintUpdate(JSON.stringify({target:v})).target;}catch{return invalid();}
}
const sameTarget=(a:BlueprintUpdateTarget,b:BlueprintUpdateTarget)=>a.applicationId===b.applicationId&&a.key===b.key&&a.version===b.version&&a.digest===b.digest;
function readPlan(value:BlueprintRolloutPlan):BlueprintRolloutPlan{
  const v=snapshot(value);if(!record(v))invalid();exact(v,['schemaVersion','id','target','clients']);
  if(v.schemaVersion!==SCHEMA||!uuid(v.id)||!Array.isArray(v.clients)||v.clients.length<1||v.clients.length>MAX_CLIENTS)invalid();
  const target=targetOf(v.target),seen=new Set<string>();
  const clients=v.clients.map(item=>{
    if(!record(item))invalid();exact(item,['businessId','recipeId','preview','error']);
    if(!uuid(item.businessId)||!uuid(item.recipeId)||seen.has(item.businessId+'/'+item.recipeId)||(item.preview===null)===(item.error===null))invalid();
    seen.add(item.businessId+'/'+item.recipeId);
    let preview:BlueprintUpdatePreview|null=null;
    if(item.preview!==null){
      try{preview=parseBlueprintUpdatePreview(item.preview);}catch{return invalid();}
      if(preview.businessId!==item.businessId||preview.recipeId!==item.recipeId||!sameTarget(preview.target,target))invalid();
    }
    return {businessId:item.businessId,recipeId:item.recipeId,preview,error:item.error===null?null:readFailure(item.error)};
  });
  return {schemaVersion:SCHEMA,id:v.id,target,clients};
}

/** Local, serial orchestration over existing client owners; no server batch job or publication authority. */
export function createBlueprintRollouts(forBusiness:(id:string)=>BusinessClient){
  return {
    /** Inspect up to 25 explicitly selected flows. Persist the returned plan before applying it. */
    preview:async(blueprint:PublicBlueprintVersion,clients:readonly BlueprintRolloutClient[],options:RequestOptions={}):Promise<BlueprintRolloutPlan>=>{
      let source:PublicBlueprintVersion;
      try{source=parseBlueprintVersion(snapshot(blueprint));}catch{return invalid();}
      const target={applicationId:source.applicationId,key:source.definition.key,version:source.definition.version,digest:source.digest};
      const held=requestOptions(options),selected=snapshot(clients),seen=new Set<string>();
      if(!Array.isArray(selected)||selected.length<1||selected.length>MAX_CLIENTS)invalid();
      // Validate and capture every selection before starting any network work.
      const captured=selected.map(item=>{
        if(!record(item))invalid();exact(item,['businessId','recipeId'],['bindings']);
        if(!uuid(item.businessId)||!uuid(item.recipeId)||seen.has(item.businessId+'/'+item.recipeId))invalid();
        seen.add(item.businessId+'/'+item.recipeId);
        let bindings:Record<string,FlowTemplateBinding>|undefined;
        try{bindings=parsePreviewBlueprintUpdate(JSON.stringify({target,...(item.bindings===undefined?{}:{bindings:item.bindings})})).bindings;}catch{return invalid();}
        return {businessId:item.businessId,recipeId:item.recipeId,bindings};
      });
      const plan:BlueprintRolloutPlan={schemaVersion:SCHEMA,id:randomUUID(),target,clients:[]};
      for(const client of captured){
        const identity={businessId:client.businessId,recipeId:client.recipeId};
        if(held.signal?.aborted){plan.clients.push({...identity,preview:null,error:aborted()});continue;}
        try{
          const {data}=await forBusiness(client.businessId).flows.deployments.previewUpdate(client.recipeId,source,client.bindings===undefined?{}:{bindings:client.bindings},held);
          plan.clients.push({...identity,preview:data,error:null});
        }catch(error){plan.clients.push({...identity,preview:null,error:failure(error)});}
      }
      return plan;
    },
    /** Lazy serial writes: persist each outcome; breaking the loop prevents later clients from starting.
     * Reuse the original plan to recover uncertain writes with identical per-client keys. */
    apply:(plan:BlueprintRolloutPlan,options:RequestOptions={}):AsyncIterable<BlueprintRolloutOutcome>=>{
      // Capture now, rather than when the consumer first calls next().
      const captured=readPlan(plan),held=requestOptions(options);
      return (async function*(){
        for(const client of captured.clients){
          const base={businessId:client.businessId,recipeId:client.recipeId,receipt:null,reasons:[] as BlueprintUpdateReason[],requestId:null};
          if(!client.preview){yield {...base,state:'preview_failed' as const,idempotencyKey:null,error:client.error};continue;}
          if(client.preview.state==='action_required'){yield {...base,state:'action_required' as const,idempotencyKey:null,error:null,reasons:client.preview.reasons};continue;}
          const idempotencyKey='blueprint-rollout/v1/'+createHash('sha256').update(JSON.stringify([captured.id,client.businessId,client.recipeId])).digest('hex');
          if(held.signal?.aborted){yield {...base,state:'not_attempted' as const,idempotencyKey,error:aborted()};continue;}
          try{
            const {data,meta}=await forBusiness(client.businessId).flows.deployments.applyUpdate(client.preview,{...held,idempotencyKey});
            yield {...base,state:data.status,idempotencyKey,receipt:data,error:null,requestId:meta.requestId};
          }catch(error){const diagnostic=failure(error);yield {...base,state:'failed' as const,idempotencyKey,error:diagnostic,requestId:diagnostic.requestId};}
        }
      })();
    },
  };
}
