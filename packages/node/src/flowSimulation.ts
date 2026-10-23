import type {Transport} from './transport.js';
import {InsideDMConfigurationError} from './errors.js';
import {parseFlowTemplateDeployment} from './generated/flowTemplateDeployments.js';
import {parseManagedFlowSimulationInput} from './generated/flowSimulations.js';
import type {FlowTemplateDeployment,FlowDraftSimulation,SimulateFlowDraftInput,FlowSimulationOptions,Result,RequestOptions} from './types.js';

/** Capture the observed draft once; provider readiness and native coverage are
 * computed by the existing simulator, never inferred by the client. */
export function createFlowSimulator(transport:Transport){
  function simulate(deployment:FlowTemplateDeployment,input?:FlowSimulationOptions,options?:RequestOptions):Promise<Result<FlowDraftSimulation>>;
  function simulate(recipeId:string,input:SimulateFlowDraftInput,options?:RequestOptions):Promise<Result<FlowDraftSimulation>>;
  async function simulate(source:FlowTemplateDeployment|string,input:FlowSimulationOptions|SimulateFlowDraftInput={},options?:RequestOptions):Promise<Result<FlowDraftSimulation>>{
    let recipeId:string,businessId:string|undefined,command:ReturnType<typeof parseManagedFlowSimulationInput>;
    try{
      if(!input||typeof input!=='object'||Array.isArray(input))throw new Error();
      if(typeof source==='string'){
        if(Object.keys(input).some(key=>!['expectedRevision','variables','pathId'].includes(key)))throw new Error();
        recipeId=source;command=parseManagedFlowSimulationInput(JSON.stringify({...input,kind:'managed_draft'}));
      }else{
        const deployment=parseFlowTemplateDeployment(JSON.parse(JSON.stringify(source)));
        if(!['unchanged','modified'].includes(deployment.draft.state)||deployment.draft.revision===null||Object.keys(input).some(key=>!['variables','pathId'].includes(key)))throw new Error();
        recipeId=deployment.recipeId;businessId=deployment.businessId;
        command=parseManagedFlowSimulationInput(JSON.stringify({kind:'managed_draft',expectedRevision:deployment.draft.revision,...input}));
      }
    }catch{throw new InsideDMConfigurationError('Provide a saved deployment and simulator inputs, or a recipe ID with the exact draft revision.');}
    const {body,meta}=await transport.ownerOperation('simulateFlowDraft',recipeId,command,options,businessId);
    return {data:(body as {data:FlowDraftSimulation}).data,meta};
  }
  return simulate;
}
