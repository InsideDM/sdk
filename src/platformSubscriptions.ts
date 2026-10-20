import {randomUUID} from 'node:crypto';
import {Transport} from './transport.js';
import {createPlatformSubscriptionDiagnostics} from './platformSubscriptionDeliveries.js';
import {InsideDMConfigurationError,InsideDMProtocolError,InsideDMError,attachWriteRecovery} from './errors.js';
import {isIdempotencyKey} from './generated/idempotency.js';
import {parseCreatePartnerSubscription,parseUpdatePartnerSubscription,parsePartnerSubscriptionDecision,parseRotatePartnerSubscriptionSecret,parsePartnerSubscriptionId,
  parsePartnerSubscription,parsePartnerSubscriptionList,parsePartnerSubscriptionSecret,type CreatePartnerSubscription,type UpdatePartnerSubscription,
  type RotatePartnerSubscriptionSecret,type PartnerSubscriptionDecision,type PartnerSubscription,type PartnerSubscriptionSecret} from './generated/partnerSubscriptions.js';
import type {RequestOptions,WriteRequestOptions,ResponseMeta,Result} from './types.js';

type DecisionOperation='verifyPlatformSubscription'|'activatePlatformSubscription'|'pausePlatformSubscription'|'disablePlatformSubscription';
function options(value:RequestOptions,write=false){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['signal','timeoutMs','attemptTimeoutMs','maxRetries',...(write?['idempotencyKey']:[])].includes(key)))
    throw new InsideDMConfigurationError('Use request options for this method; idempotency keys belong to creation and secret rotation.');
  return {...value};
}
function encode<T>(value:unknown,parse:(raw:string)=>T):string{
  try{return JSON.stringify(parse(JSON.stringify(value)));}catch{throw new InsideDMConfigurationError('Provide the documented receiver fields and current revision; approval and authority flags are not supported.');}
}
function target(value:string){try{return parsePartnerSubscriptionId(value);}catch{throw new InsideDMConfigurationError('Provide a valid subscription ID.');}}
function key(value:WriteRequestOptions):string{
  const held=value.idempotencyKey??randomUUID();if(!isIdempotencyKey(held)||held.includes(','))throw new InsideDMConfigurationError('Provide a valid idempotency key.');return held;
}
/** App-owned configuration over the existing root transport. No method accepts
 * a merchant grant, approving identity or caller-selected request path. */
export function createPlatformSubscriptions(transport:Transport,bindApplication:(id:string,requestId:string)=>void){
  function check(sub:PartnerSubscription,meta:ResponseMeta,id?:string){
    if(id!==undefined&&sub.id!==id)throw new InsideDMProtocolError('InsideDM returned a different subscription.',{...meta,code:'invalid_response'});
    bindApplication(sub.applicationId,meta.requestId);return sub;
  }
  function metadata(body:unknown,meta:ResponseMeta,id?:string){
    try{return check(parsePartnerSubscription((body as {data:unknown}).data),meta,id);}
    catch(error){if(error instanceof InsideDMProtocolError)throw error;throw new InsideDMProtocolError('InsideDM returned invalid subscription metadata.',{...meta,code:'invalid_response'});}
  }
  function secret(body:unknown,meta:ResponseMeta,id?:string){
    try{const result=parsePartnerSubscriptionSecret((body as {data:unknown}).data);check(result.subscription,meta,id);return result;}
    catch(error){if(error instanceof InsideDMProtocolError)throw error;throw new InsideDMProtocolError('InsideDM returned invalid subscription secret metadata.',{...meta,code:'invalid_response'});}
  }
  async function decision(operation:DecisionOperation,id:string,input:PartnerSubscriptionDecision,request:RequestOptions):Promise<Result<PartnerSubscription>>{
    const subscriptionId=target(id),body=encode(input,parsePartnerSubscriptionDecision),held=options(request);
    // An uncertain unkeyed command requires a status read, never another
    // automatic provider challenge or a repeated stale-revision write.
    const result=await transport.request(operation,{subscriptionId},{},{...held,maxRetries:0},{body});
    return {data:metadata(result.body,result.meta,subscriptionId),meta:result.meta};
  }
  return {
    ...createPlatformSubscriptionDiagnostics(transport,bindApplication),
    create:async(input:CreatePartnerSubscription,request:WriteRequestOptions={}):Promise<Result<PartnerSubscriptionSecret>>=>{
      const body=encode(input,parseCreatePartnerSubscription),held=options(request,true),idempotencyKey=key(request);
      try{const result=await transport.request('createPlatformSubscription',{},{},held,{body,idempotencyKey});return {data:secret(result.body,result.meta),meta:result.meta};}
      catch(error){if(error instanceof InsideDMError)throw attachWriteRecovery(error,{operation:'createPlatformSubscription',idempotencyKey});throw error;}
    },
    list:async(request:RequestOptions={}):Promise<Result<PartnerSubscription[]>>=>{
      const result=await transport.request('listPlatformSubscriptions',{},{},options(request));
      try{const data=parsePartnerSubscriptionList((result.body as {data:unknown}).data);for(const sub of data)check(sub,result.meta);return {data,meta:result.meta};}
      catch(error){if(error instanceof InsideDMProtocolError)throw error;throw new InsideDMProtocolError('InsideDM returned an invalid subscription list.',{...result.meta,code:'invalid_response'});}
    },
    get:async(id:string,request:RequestOptions={}):Promise<Result<PartnerSubscription>>=>{
      const subscriptionId=target(id),result=await transport.request('getPlatformSubscription',{subscriptionId},{},options(request));return {data:metadata(result.body,result.meta,subscriptionId),meta:result.meta};
    },
    update:async(id:string,input:UpdatePartnerSubscription,request:RequestOptions={}):Promise<Result<PartnerSubscription>>=>{
      const subscriptionId=target(id),body=encode(input,parseUpdatePartnerSubscription),held=options(request);
      const result=await transport.request('updatePlatformSubscription',{subscriptionId},{},{...held,maxRetries:0},{body});return {data:metadata(result.body,result.meta,subscriptionId),meta:result.meta};
    },
    verify:(id:string,input:PartnerSubscriptionDecision,request:RequestOptions={})=>decision('verifyPlatformSubscription',id,input,request),
    activate:(id:string,input:PartnerSubscriptionDecision,request:RequestOptions={})=>decision('activatePlatformSubscription',id,input,request),
    pause:(id:string,input:PartnerSubscriptionDecision,request:RequestOptions={})=>decision('pausePlatformSubscription',id,input,request),
    disable:(id:string,input:PartnerSubscriptionDecision,request:RequestOptions={})=>decision('disablePlatformSubscription',id,input,request),
    rotateSecret:async(id:string,input:RotatePartnerSubscriptionSecret,request:WriteRequestOptions={}):Promise<Result<PartnerSubscriptionSecret>>=>{
      const subscriptionId=target(id),body=encode(input,parseRotatePartnerSubscriptionSecret),held=options(request,true),idempotencyKey=key(request);
      try{const result=await transport.request('rotatePlatformSubscriptionSecret',{subscriptionId},{},held,{body,idempotencyKey});return {data:secret(result.body,result.meta,subscriptionId),meta:result.meta};}
      catch(error){if(error instanceof InsideDMError)throw attachWriteRecovery(error,{operation:'rotatePlatformSubscriptionSecret',subscriptionId,idempotencyKey});throw error;}
    },
  };
}
