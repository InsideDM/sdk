import {createHash} from 'node:crypto';
import {Transport} from './transport.js';
import {parseCreateBlueprintVersion,parseBlueprintKey,parseBlueprintPathVersion,parseBlueprintVersion,parseBlueprintVersions,parseBlueprintTemplates,
  type CreateBlueprintVersionInput,type PublicBlueprintVersion,type PublicBlueprintTemplate} from './generated/partnerBlueprints.js';
import {InsideDMConfigurationError,InsideDMProtocolError,InsideDMError,attachWriteRecovery} from './errors.js';
import {isIdempotencyKey} from './generated/idempotency.js';
import type {RequestOptions,WriteRequestOptions,ResponseMeta,Result} from './types.js';

function options<T extends RequestOptions>(value:T,write=false):T{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['signal','timeoutMs','attemptTimeoutMs','maxRetries',...(write?['idempotencyKey']:[])].includes(key)))throw new InsideDMConfigurationError('Use request options; only version creation takes an idempotency key.');return {...value};
}
function target(key:string,version?:number){
  try{parseBlueprintKey(key);if(version!==undefined){if(typeof version!=='number')throw new Error();parseBlueprintPathVersion(String(version));}return {blueprintKey:key,...(version===undefined?{}:{version:String(version)})};}
  catch{throw new InsideDMConfigurationError('Provide a blueprint key and a positive integer version.');}
}
export function createPlatformBlueprints(transport:Transport,bindApplication:(id:string,requestId:string)=>void){
  function check(item:PublicBlueprintVersion,meta:ResponseMeta,key:string,version?:number){
    if(item.definition.key!==key||version!==undefined&&item.definition.version!==version)throw new InsideDMProtocolError('InsideDM returned a different blueprint version.',{code:'invalid_response',requestId:meta.requestId});
    bindApplication(item.applicationId,meta.requestId);return item;
  }
  return {
    /** Discover supported portable sources and their named, typed customization fields. */
    listTemplates:async(request:RequestOptions={}):Promise<Result<PublicBlueprintTemplate[]>>=>{
      const result=await transport.request('listBlueprintTemplates',{},{},options(request));
      try{return {data:parseBlueprintTemplates((result.body as {data:unknown}).data),meta:result.meta};}
      catch{throw new InsideDMProtocolError('InsideDM returned invalid blueprint template metadata.',{code:'invalid_response',requestId:result.meta.requestId});}
    },
    /** Save an immutable source version, without creating or publishing client flows. */
    createVersion:async(input:CreateBlueprintVersionInput,request:WriteRequestOptions={}):Promise<Result<PublicBlueprintVersion>>=>{
      let body:string,captured:CreateBlueprintVersionInput;const held=options(request,true);
      try{captured=parseCreateBlueprintVersion(JSON.stringify(input));body=JSON.stringify(captured);}
      catch{throw new InsideDMConfigurationError('Provide the source key/version, exact template reference, display text and supported customization fields.');}
      // The immutable source identity provides a useful default across restarts;
      // changing this version's contents conflicts rather than silently replacing it.
      const idempotencyKey=held.idempotencyKey??'blueprint/v1/'+createHash('sha256').update(JSON.stringify([captured.key,captured.version])).digest('hex');
      if(!isIdempotencyKey(idempotencyKey))throw new InsideDMConfigurationError('Provide a valid idempotency key.');
      try{
        const result=await transport.request('createBlueprintVersion',{},{},held,{body,idempotencyKey});
        let data:PublicBlueprintVersion;
        try{
          data=check(parseBlueprintVersion((result.body as {data:unknown}).data),result.meta,captured.key,captured.version);
          if(data.definition.template.id!==captured.template.id||data.definition.template.version!==captured.template.version||data.definition.template.digest!==captured.template.digest
            ||data.definition.name!==captured.name.trim()||data.definition.description!==captured.description.trim()
            ||Object.entries(captured.parameters??{}).some(([key,value])=>data.definition.parameters[key]!==value)
            ||JSON.stringify([...data.definition.clientOverrides].sort())!==JSON.stringify([...(captured.clientOverrides??[])].sort()))throw new Error('Wrong blueprint content.');
        }catch(error){if(error instanceof InsideDMProtocolError)throw error;throw new InsideDMProtocolError('InsideDM returned a different blueprint definition.',{code:'invalid_response',requestId:result.meta.requestId});}
        return {data,meta:result.meta};
      }catch(error){if(error instanceof InsideDMError)throw attachWriteRecovery(error,{operation:'createBlueprintVersion',blueprintKey:captured.key,version:captured.version,idempotencyKey});throw error;}
    },
    getVersion:async(key:string,version:number,request:RequestOptions={}):Promise<Result<PublicBlueprintVersion>>=>{
      const path=target(key,version),result=await transport.request('getBlueprintVersion',path,{},options(request));
      try{return {data:check(parseBlueprintVersion((result.body as {data:unknown}).data),result.meta,key,version),meta:result.meta};}
      catch(error){if(error instanceof InsideDMProtocolError)throw error;throw new InsideDMProtocolError('InsideDM returned invalid blueprint metadata.',{code:'invalid_response',requestId:result.meta.requestId});}
    },
    listVersions:async(key:string,request:RequestOptions={}):Promise<Result<PublicBlueprintVersion[]>>=>{
      const path=target(key),result=await transport.request('listBlueprintVersions',path,{},options(request));
      try{const data=parseBlueprintVersions((result.body as {data:unknown}).data);for(const item of data)check(item,result.meta,key);return {data,meta:result.meta};}
      catch(error){if(error instanceof InsideDMProtocolError)throw error;throw new InsideDMProtocolError('InsideDM returned invalid blueprint version history.',{code:'invalid_response',requestId:result.meta.requestId});}
    },
  };
}
