// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { isFlowPublicationId } from './flowPublicationRequests.js';
import type { FlowGovernanceConfiguration } from './flowGovernanceTypes.js';
export const GET_FLOW_GOVERNANCE_OPERATION = {
    id: 'getFlowGovernance', name: 'flows.governance.get', audience: 'conversations', method: 'GET',
    path: '/api/v1/automation-governance/{businessId}/recipes/{recipeId}', pathTemplate: '/api/v1/automation-governance/:businessId/recipes/:recipeId',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.read'], humanPermissions: ['flows.view'],
    userExecution: 'direct', idempotency: 'none', scope: 'workspace',
} as const;
export class FlowGovernanceRequestError extends Error {
    constructor() { super('The flow governance request or result is invalid.'); this.name = 'FlowGovernanceRequestError'; }
}
export function parseFlowGovernanceQuery(route: string): {
    view: 'managed';
} {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    if ([...query].length !== 1 || query.get('view') !== 'managed')
        throw new FlowGovernanceRequestError();
    return { view: 'managed' };
}
export function parseFlowGovernanceConfiguration(value: unknown): FlowGovernanceConfiguration {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new FlowGovernanceRequestError();
    const row = value as Record<string, unknown>, keys = ['businessId', 'recipeId', 'revision', 'approvalMode', 'regressionMode', 'currentReleaseRequestId'];
    if (Object.keys(row).length !== keys.length || keys.some(key => !Object.hasOwn(row, key))
        || !isFlowPublicationId(row.businessId) || !isFlowPublicationId(row.recipeId) || row.currentReleaseRequestId !== null && !isFlowPublicationId(row.currentReleaseRequestId)
        || typeof row.revision !== 'number' || !Number.isSafeInteger(row.revision) || row.revision < 1 || row.revision > 2147483647
        || !['none', 'single_reviewer'].includes(String(row.approvalMode)) || !['off', 'required'].includes(String(row.regressionMode)))
        throw new FlowGovernanceRequestError();
    return row as unknown as FlowGovernanceConfiguration;
}
