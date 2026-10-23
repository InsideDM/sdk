import type {Transport} from './transport.js';
import {InsideDMConfigurationError} from './errors.js';
import {parseFlowDraftSnapshot,parseFlowDraftSave} from './generated/flowDrafts.js';
import type {AvailableFlowDraft,FlowDraftDefinition,SaveFlowDraftInput,FlowDraftSaveReceipt,Result,WriteRequestOptions} from './types.js';

/** Save exactly the observed draft; no implicit fetch, merge, publication or retry intent change. */
export function createFlowDraftSaver(transport:Transport){
  function save(draft:AvailableFlowDraft,definition:FlowDraftDefinition,options?:WriteRequestOptions):Promise<Result<FlowDraftSaveReceipt>>;
  function save(recipeId:string,input:SaveFlowDraftInput,options?:WriteRequestOptions):Promise<Result<FlowDraftSaveReceipt>>;
  async function save(source:AvailableFlowDraft|string,input:FlowDraftDefinition|SaveFlowDraftInput,options?:WriteRequestOptions):Promise<Result<FlowDraftSaveReceipt>>{
    let recipeId:string,businessId:string|undefined,command:ReturnType<typeof parseFlowDraftSave>;
    try{
      if(typeof source==='string'){
        if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['expectedDeploymentRevision','expectedDraftRevision','definition'].includes(key)))throw new Error();
        recipeId=source;command=parseFlowDraftSave(JSON.stringify({...input,kind:'managed_draft'}));
      }else{
        const draft=parseFlowDraftSnapshot(JSON.parse(JSON.stringify(source)));if(draft.state!=='available')throw new Error();
        recipeId=draft.recipeId;businessId=draft.businessId;
        command=parseFlowDraftSave(JSON.stringify({kind:'managed_draft',expectedDeploymentRevision:draft.deploymentRevision,expectedDraftRevision:draft.revision,definition:input}));
      }
      if(command.kind!=='managed_draft'||command.definition.id!==recipeId||businessId!==undefined&&command.definition.businessId!==businessId)throw new Error();
    }catch{throw new InsideDMConfigurationError('Provide an available saved draft and edited definition, or a recipe ID with the exact managed/draft revisions and definition.');}
    const {body,meta}=await transport.ownerOperation('saveFlowDraft',recipeId,command,options,businessId??command.definition.businessId);
    return {data:(body as {data:FlowDraftSaveReceipt}).data,meta};
  }
  return save;
}
