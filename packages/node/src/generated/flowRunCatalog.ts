// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as FLOW_RUN_CATALOG_SCHEMAS } from './schemas.js';
import { parseFlowRunProgress, type PublicFlowRun } from './flowRunProgress.js';
import type { FlowRunPage } from './flowRunCatalogTypes.js';
export const LIST_FLOW_RUNS_OPERATION = {
    id: 'listFlowRuns', name: 'flows.runs.list', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/agent-runs',
    pathTemplate: '/api/v1/dashboard/:businessId/agent-runs',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.read'], humanPermissions: ['flows.view'],
    idempotency: 'none', scope: 'workspace',
} as const;
export class FlowRunListRequestError extends Error {
    constructor() { super('Use the documented progress view, flowId, status, limit and original cursor.'); this.name = 'FlowRunListRequestError'; }
}
export function parseFlowRunListQuery(route: string): {
    flowId?: string;
    status?: PublicFlowRun['status'];
    limit: number;
    cursor?: string;
} {
    const params = new URL(route, 'https://api.insidedm.io').searchParams;
    const allowed = ['view', 'flowId', 'status', 'limit', 'cursor'];
    if (params.get('view') !== 'progress' || [...params.keys()].some(key => !allowed.includes(key))
        || allowed.some(key => params.getAll(key).length > 1))
        throw new FlowRunListRequestError();
    const flowId = params.get('flowId'), status = params.get('status'), limit = params.get('limit'), cursor = params.get('cursor');
    if (flowId !== null && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(flowId)
        || status !== null && !['running', 'waiting', 'completed', 'failed', 'cancelled'].includes(status)
        || limit !== null && (!/^[1-9]\d{0,2}$/.test(limit) || Number(limit) > 100)
        || cursor !== null && !/^[A-Za-z0-9_.-]{1,2048}$/.test(cursor))
        throw new FlowRunListRequestError();
    return { limit: limit === null ? 25 : Number(limit), ...(flowId === null ? {} : { flowId }),
        ...(status === null ? {} : { status: status as PublicFlowRun['status'] }), ...(cursor === null ? {} : { cursor }) };
}
export function parseFlowRunPage(value: unknown): FlowRunPage {
    const page = decodeContract(FLOW_RUN_CATALOG_SCHEMAS.FlowRunPage!, value, { schemas: FLOW_RUN_CATALOG_SCHEMAS }) as FlowRunPage;
    if (page.page.hasMore !== (page.page.nextCursor !== null) || new Set(page.data.map(run => run.id)).size !== page.data.length)
        throw new FlowRunListRequestError();
    for (const [index, run] of page.data.entries()) {
        parseFlowRunProgress({ data: run });
        if (index > 0 && page.data[index - 1]!.startedAt < run.startedAt)
            throw new FlowRunListRequestError();
    }
    return page;
}
