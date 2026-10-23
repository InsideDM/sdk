// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as FLOW_STEP_SCHEMAS } from './schemas.js';
export const LIST_FLOW_STEPS_OPERATION = {
    id: 'listFlowSteps', name: 'flows.steps.list', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/automations/palette', pathTemplate: '/api/v1/dashboard/:businessId/automations/palette',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.read'], humanPermissions: ['flows.view'],
    idempotency: 'none', scope: 'workspace', userExecution: 'direct',
} as const;
export const LIST_SAVED_FLOW_BLOCKS_OPERATION = {
    id: 'listSavedFlowBlocks', name: 'flows.blocks.list', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/automations/blocks', pathTemplate: '/api/v1/dashboard/:businessId/automations/blocks',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.read'], humanPermissions: ['flows.view'],
    idempotency: 'none', scope: 'workspace', userExecution: 'direct',
} as const;
export const GET_SAVED_FLOW_BLOCK_INTERFACE_OPERATION = {
    id: 'getSavedFlowBlockInterface', name: 'flows.blocks.get', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/automations/blocks/{flowId}', pathTemplate: '/api/v1/dashboard/:businessId/automations/blocks/:flowId',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.read'], humanPermissions: ['flows.view'],
    idempotency: 'none', scope: 'workspace', userExecution: 'direct',
} as const;
export interface SavedFlowBlockInterfaceParams {
    versionId: string;
}
export interface SavedFlowBlockField {
    variableId: string;
    key: string;
    type: 'string' | 'number' | 'boolean' | 'datetime' | 'json' | 'string_list';
    required: boolean;
}
export interface SavedFlowBlockInterface {
    businessId: string;
    flowId: string;
    versionId: string;
    version: number;
    name: string;
    inputs: SavedFlowBlockField[];
    outputs: SavedFlowBlockField[];
}
export interface SavedFlowBlockParams {
    limit?: number;
    cursor?: string;
}
export interface SavedFlowBlockReference {
    flowId: string;
    versionId: string;
    version: number;
    name: string;
    type: 'call' | 'mcp';
}
export interface SavedFlowBlockPage {
    businessId: string;
    data: SavedFlowBlockReference[];
    page: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}
export interface FlowStep {
    type: string;
    version: number;
    name: string;
    description: string;
    tier: 'steps' | 'bundles';
    effect: 'message' | 'read' | 'write' | 'money_in';
    channels: {
        whatsapp: 'full' | 'template_only' | 'none';
        instagram: 'full' | 'template_only' | 'none';
    };
    billableMessages: 0 | 1 | 'per_item';
    ready: boolean;
}
export interface FlowStepCatalog {
    businessId: string;
    schemaVersion: 1;
    steps: FlowStep[];
}
export class FlowStepRequestError extends Error {
    constructor() { super('Use the documented flow catalog view and pagination.'); this.name = 'FlowStepRequestError'; }
}
export function parseFlowStepQuery(route: string): void {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    if ([...query].length !== 1 || query.get('view') !== 'built_in_steps')
        throw new FlowStepRequestError();
}
export function parseFlowStepCatalog(value: unknown): FlowStepCatalog {
    const catalog = decodeContract(FLOW_STEP_SCHEMAS.FlowStepCatalog!, value, { schemas: FLOW_STEP_SCHEMAS }) as FlowStepCatalog;
    if (new Set(catalog.steps.map(step => step.type)).size !== catalog.steps.length)
        throw new FlowStepRequestError();
    return catalog;
}
export function parseSavedFlowBlockQuery(route: string): {
    limit: number;
    cursor?: string;
} {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    if (query.get('view') !== 'saved_references' || [...query.keys()].some(key => !['view', 'limit', 'cursor'].includes(key))
        || ['view', 'limit', 'cursor'].some(key => query.getAll(key).length > 1))
        throw new FlowStepRequestError();
    const limit = query.get('limit'), cursor = query.get('cursor');
    if (limit !== null && (!/^[1-9]\d{0,2}$/.test(limit) || Number(limit) > 100)
        || cursor !== null && !/^[A-Za-z0-9_.-]{1,2048}$/.test(cursor))
        throw new FlowStepRequestError();
    return { limit: limit === null ? 25 : Number(limit), ...(cursor === null ? {} : { cursor }) };
}
export function parseSavedFlowBlockPage(value: unknown): SavedFlowBlockPage {
    const page = decodeContract(FLOW_STEP_SCHEMAS.SavedFlowBlockPage!, value, { schemas: FLOW_STEP_SCHEMAS }) as SavedFlowBlockPage;
    if (page.page.hasMore !== (page.page.nextCursor !== null) || new Set(page.data.map(block => block.flowId)).size !== page.data.length
        || page.data.some(block => !block.name.trim()))
        throw new FlowStepRequestError();
    return page;
}
export function parseSavedFlowBlockInterfaceQuery(route: string): SavedFlowBlockInterfaceParams {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    const versionId = query.get('versionId');
    if ([...query].length !== 2 || query.get('view') !== 'interface' || versionId === null
        || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(versionId))
        throw new FlowStepRequestError();
    return { versionId: versionId.toLowerCase() };
}
export function parseSavedFlowBlockInterface(value: unknown): SavedFlowBlockInterface {
    const result = decodeContract(FLOW_STEP_SCHEMAS.SavedFlowBlockInterface!, value, { schemas: FLOW_STEP_SCHEMAS }) as SavedFlowBlockInterface;
    if (!result.name.trim() || [result.inputs, result.outputs].some(ports => new Set(ports.map(port => port.variableId)).size !== ports.length
        || new Set(ports.map(port => port.key)).size !== ports.length
        || ports.some(port => !port.variableId.trim() || !port.key.trim() || /\p{Cc}/u.test(port.variableId + port.key))))
        throw new FlowStepRequestError();
    return result;
}
