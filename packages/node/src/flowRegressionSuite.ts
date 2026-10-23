import type {Transport} from './transport.js';
import {InsideDMConfigurationError} from './errors.js';
import {parseFlowRegressionSuite} from './generated/flowRegressions.js';
import type {FlowRegressionSuite,SaveFlowRegressionSuiteInput,FlowRegressionSuiteEdits,Result,WriteRequestOptions} from './types.js';

/** Both forms capture a complete suite intent. Saved models carry their own
 * business/resource/revision pins; a retry never silently fetches newer ones. */
export function createRegressionSuiteSaver(transport:Transport){
  function saveSuite(suite:FlowRegressionSuite,changes?:FlowRegressionSuiteEdits,options?:WriteRequestOptions):Promise<Result<FlowRegressionSuite>>;
  function saveSuite(recipeId:string,input:SaveFlowRegressionSuiteInput,options?:WriteRequestOptions):Promise<Result<FlowRegressionSuite>>;
  async function saveSuite(source:FlowRegressionSuite|string,changes:FlowRegressionSuiteEdits|SaveFlowRegressionSuiteInput={},options?:WriteRequestOptions):Promise<Result<FlowRegressionSuite>>{
    let recipeId:string,businessId:string|undefined,input:SaveFlowRegressionSuiteInput;
    try{
      if(!changes||typeof changes!=='object'||Array.isArray(changes))throw new Error();
      if(typeof source==='string'){
        if(Object.hasOwn(changes,'kind'))throw new Error();
        recipeId=source;input=changes as SaveFlowRegressionSuiteInput;
      }else{
        const suite=parseFlowRegressionSuite(JSON.parse(JSON.stringify(source)));
        if(Object.keys(changes).some(key=>!['name','required','status','cases'].includes(key)))throw new Error();
        recipeId=suite.recipeId;businessId=suite.businessId;
        input={suiteId:suite.id,expectedRevision:suite.revision,name:suite.name,required:suite.required,status:suite.status,cases:suite.cases,...changes};
      }
    }catch{throw new InsideDMConfigurationError('Provide a saved suite and explicit edits, or a recipe ID and a complete create/update intent.');}
    const {body,meta}=await transport.ownerOperation('saveFlowRegressionSuite',recipeId,{...input,kind:'managed_deployment'},options,businessId);
    return {data:(body as {data:FlowRegressionSuite}).data,meta};
  }
  return saveSuite;
}
