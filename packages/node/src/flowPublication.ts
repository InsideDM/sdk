import type { Transport } from './transport.js';
import { InsideDMConfigurationError } from './errors.js';
import { parseFlowTemplateDeployment } from './generated/flowTemplateDeployments.js';
import { parseManagedPublicationInput } from './generated/flowPublicationRequests.js';
import type { FlowTemplateDeployment, FlowPublicationRequestInput, ManagedPublicationRequest, Result, WriteRequestOptions } from './types.js';

/** Both forms submit the caller's retained revision pins. No hidden read can
 * silently turn a retry into a request to review a different draft. */
export function createPublicationRequester(transport: Transport) {
  function requestPublication(deployment: FlowTemplateDeployment, config?: { note?: string }, options?: WriteRequestOptions): Promise<Result<ManagedPublicationRequest>>;
  function requestPublication(recipeId: string, input: FlowPublicationRequestInput, options?: WriteRequestOptions): Promise<Result<ManagedPublicationRequest>>;
  async function requestPublication(deployment: FlowTemplateDeployment | string,
    config: { note?: string } | FlowPublicationRequestInput = {}, options?: WriteRequestOptions): Promise<Result<ManagedPublicationRequest>> {
    let recipeId: string;
    let businessId: string | undefined;
    let command: ReturnType<typeof parseManagedPublicationInput>;
    try {
      if (typeof deployment === 'string') {
        if (!config || typeof config !== 'object' || Array.isArray(config)
          || Object.keys(config).some(key => !['expectedDeploymentRevision', 'expectedDraftRevision', 'expectedPublishedVersionId', 'note'].includes(key))) throw new Error();
        recipeId = deployment;
        command = parseManagedPublicationInput(JSON.stringify({ ...config, kind: 'managed_deployment' }));
      } else {
        const current = parseFlowTemplateDeployment(JSON.parse(JSON.stringify(deployment)));
        if (!['unchanged', 'modified'].includes(current.draft.state) || current.draft.revision === null || !config || typeof config !== 'object'
          || Array.isArray(config) || Object.keys(config).some(key => key !== 'note')) throw new Error();
        recipeId = current.recipeId;
        businessId = current.businessId;
        command = parseManagedPublicationInput(JSON.stringify({ kind: 'managed_deployment', expectedDeploymentRevision: current.revision,
          expectedDraftRevision: current.draft.revision, expectedPublishedVersionId: current.publication.versionId, ...config }));
      }
    } catch {
      throw new InsideDMConfigurationError('Provide a saved deployment with an available draft and optional note, or a recipe ID with the exact deployment, draft and published-version revision pins.');
    }
    const { body, meta } = await transport.ownerOperation('requestFlowPublication', recipeId, command, options, businessId);
    return { data: (body as { data: ManagedPublicationRequest }).data, meta };
  }
  return requestPublication;
}
