import {randomUUID} from 'node:crypto';
import {collection} from './client.js';
import type {Transport} from './transport.js';
import {InsideDMConfigurationError,InsideDMProtocolError,InsideDMError,attachWriteRecovery} from './errors.js';
import {isIdempotencyKey} from './generated/idempotency.js';
import {parsePartnerSubscriptionId} from './generated/partnerSubscriptions.js';
import {parsePartnerDeliveryListParams,parseReplayPartnerDelivery,parseRecoverPartnerReceiver,parsePartnerDeliveryPage,parsePartnerDeliveryResult,parsePartnerReceiverHealth,parsePartnerWebhookDeliveryDetail,
  type PartnerDeliveryListParams,type PartnerDeliveryContext,type PartnerWebhookDelivery,type PartnerWebhookDeliveryDetail,type PartnerReceiverHealth} from './generated/partnerSubscriptionDiagnostics.js';
import type {RequestOptions,WriteRequestOptions,PaginationOptions,PartnerDeliveryTarget,PartnerDeliveryListInput,PartnerDeliveryReplayInput,PartnerReceiverRecoveryInput,Result} from './types.js';

function capture(id:string,input:PartnerDeliveryTarget,kind:'target'|'list'|'replay'|'recover'='target'){
  try{
    const allowed=['businessId',...(kind==='list'?['limit','cursor','from','to','status','eventType']:[]),...(kind==='replay'?['reason']:[]),...(kind==='recover'?['expectedRevision']:[])];
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!allowed.includes(key)))throw new Error();
    const held={...input},subscriptionId=parsePartnerSubscriptionId(id),businessId=parsePartnerSubscriptionId(held.businessId);
    const query:Record<string,unknown>={...held};delete query.businessId;
    if(kind==='list')for(const key of ['from','to'])if(query[key]!==undefined){
      const value=query[key];if(!(value instanceof Date)&&typeof value!=='string')throw new Error();
      const date=value instanceof Date?new Date(value.getTime()):new Date(value);if(!Number.isFinite(date.getTime()))throw new Error();query[key]=date.toISOString();
    }
    const params=kind==='list'?parsePartnerDeliveryListParams(query):{};
    const body=kind==='replay'?JSON.stringify(parseReplayPartnerDelivery(JSON.stringify(query))):kind==='recover'?JSON.stringify(parseRecoverPartnerReceiver(JSON.stringify(query))):null;
    return {subscriptionId,businessId,params,body};
  }catch{throw new InsideDMConfigurationError('Provide the subscription and business IDs with the documented delivery filters or replay reason. Approval and authority flags are not supported.');}
}
function deliveryId(value:string){try{return parsePartnerSubscriptionId(value);}catch{throw new InsideDMConfigurationError('Use the delivery record id for history reads and replay.');}}
function options<T extends RequestOptions>(value:T,kind:'read'|'write'|'pages'='read'):T{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['signal','timeoutMs','attemptTimeoutMs','maxRetries',...(kind==='write'?['idempotencyKey']:[]),...(kind==='pages'?['maxPages','maxItems']:[])].includes(key)))
    throw new InsideDMConfigurationError('Use documented request options; only explicit replay accepts an idempotency key.');
  return {...value};
}
export function createPlatformSubscriptionDiagnostics(transport:Transport,bindApplication:(id:string,requestId:string)=>void){
  function check(context:PartnerDeliveryContext,target:{subscriptionId:string;businessId:string},requestId:string){
    if(context.subscriptionId!==target.subscriptionId||context.businessId!==target.businessId)throw new InsideDMProtocolError('InsideDM returned delivery data for another receiver or business.',{code:'invalid_response',requestId});
    bindApplication(context.applicationId,requestId);
  }
  function parse<T>(body:unknown,requestId:string,project:(value:unknown)=>T):T{
    try{return project((body as {data:unknown}).data);}catch(error){if(error instanceof InsideDMProtocolError)throw error;
      throw new InsideDMProtocolError('InsideDM returned invalid application delivery data.',{code:'invalid_response',requestId});}
  }
  function bound(id:string,input:PartnerDeliveryListInput){
    const target=capture(id,input,'list');
    const resource=collection<PartnerWebhookDelivery,PartnerDeliveryListParams>(transport,'listPlatformSubscriptionDeliveries',
      {subscriptionId:target.subscriptionId,businessId:target.businessId},(body,requestId)=>parse(body,requestId,value=>{
        const page=parsePartnerDeliveryPage(value);check(page,target,requestId);return {data:page.deliveries,page:{nextCursor:page.nextCursor}};
      }));
    return {...target,resource};
  }
  return {
    recover:async(id:string,input:PartnerReceiverRecoveryInput,request:WriteRequestOptions={}):Promise<Result<PartnerReceiverHealth>>=>{
      const target=capture(id,input,'recover'),held=options(request,'write'),idempotencyKey=held.idempotencyKey??randomUUID();
      if(!isIdempotencyKey(idempotencyKey)||idempotencyKey.includes(','))throw new InsideDMConfigurationError('Provide a valid receiver recovery idempotency key.');
      try{
        const result=await transport.request('recoverPlatformSubscriptionReceiver',{subscriptionId:target.subscriptionId,businessId:target.businessId},{},held,{body:target.body!,idempotencyKey});
        const data=parse(result.body,result.meta.requestId,value=>{const health=parsePartnerReceiverHealth(value);check(health,target,result.meta.requestId);return health;});return {data,meta:result.meta};
      }catch(error){if(error instanceof InsideDMError)throw attachWriteRecovery(error,{operation:'recoverPlatformSubscriptionReceiver',subscriptionId:target.subscriptionId,businessId:target.businessId,idempotencyKey});throw error;}
    },
    getHealth:async(id:string,input:PartnerDeliveryTarget,request:RequestOptions={}):Promise<Result<PartnerReceiverHealth>>=>{
      const target=capture(id,input),result=await transport.request('getPlatformSubscriptionHealth',{subscriptionId:target.subscriptionId,businessId:target.businessId},{},options(request));
      const data=parse(result.body,result.meta.requestId,value=>{const health=parsePartnerReceiverHealth(value);check(health,target,result.meta.requestId);return health;});return {data,meta:result.meta};
    },
    deliveries:{
      list:async(id:string,input:PartnerDeliveryListInput,request:RequestOptions={})=>{const target=bound(id,input);return target.resource.list(target.params,options(request));},
      pages:(id:string,input:PartnerDeliveryListInput,request:PaginationOptions={})=>{const target=bound(id,input);return target.resource.pages(target.params,options(request,'pages'));},
      iterate:(id:string,input:PartnerDeliveryListInput,request:PaginationOptions={})=>{const target=bound(id,input);return target.resource.iterate(target.params,options(request,'pages'));},
      get:async(id:string,recordId:string,input:PartnerDeliveryTarget,request:RequestOptions={}):Promise<Result<PartnerWebhookDeliveryDetail>>=>{
        const target=capture(id,input),selected=deliveryId(recordId),result=await transport.request('getPlatformSubscriptionDelivery',{subscriptionId:target.subscriptionId,businessId:target.businessId,deliveryId:selected},{},options(request));
        const data=parse(result.body,result.meta.requestId,value=>{const answer=parsePartnerDeliveryResult(value,true);check(answer,target,result.meta.requestId);
          if(answer.delivery.id!==selected)throw new InsideDMProtocolError('InsideDM returned a different delivery.',{code:'invalid_response',requestId:result.meta.requestId});
          return parsePartnerWebhookDeliveryDetail(answer.delivery);});return {data,meta:result.meta};
      },
      replay:async(id:string,recordId:string,input:PartnerDeliveryReplayInput,request:WriteRequestOptions={}):Promise<Result<PartnerWebhookDelivery>>=>{
        const target=capture(id,input,'replay'),selected=deliveryId(recordId),held=options(request,'write'),idempotencyKey=held.idempotencyKey??randomUUID();
        if(!isIdempotencyKey(idempotencyKey)||idempotencyKey.includes(','))throw new InsideDMConfigurationError('Provide a valid replay idempotency key.');
        try{
          const result=await transport.request('replayPlatformSubscriptionDelivery',{subscriptionId:target.subscriptionId,businessId:target.businessId,deliveryId:selected},{},held,{body:target.body!,idempotencyKey});
          const data=parse(result.body,result.meta.requestId,value=>{const answer=parsePartnerDeliveryResult(value);check(answer,target,result.meta.requestId);
            if(answer.delivery.id===selected||answer.delivery.replayOf!==selected||answer.delivery.kind!=='manual_replay')throw new InsideDMProtocolError('InsideDM returned an inconsistent replay.',{code:'invalid_response',requestId:result.meta.requestId});return answer.delivery;});
          return {data,meta:result.meta};
        }catch(error){if(error instanceof InsideDMError)throw attachWriteRecovery(error,{operation:'replayPlatformSubscriptionDelivery',subscriptionId:target.subscriptionId,businessId:target.businessId,deliveryId:selected,idempotencyKey});throw error;}
      },
    },
  };
}
