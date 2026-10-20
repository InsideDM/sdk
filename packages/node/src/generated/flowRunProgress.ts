// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export const GET_FLOW_RUN_OPERATION = {
    id: 'getFlowRun', name: 'flows.runs.get', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/agent-runs/{runId}',
    pathTemplate: '/api/v1/dashboard/:businessId/agent-runs/:runId',
    principalKinds: ['business_key', 'delegation'], requiredScopes: ['flows.read'], humanPermissions: ['flows.view'],
    idempotency: 'none', scope: 'workspace',
} as const;
export interface PublicFlowRun {
    id: string;
    flowId: string;
    status: 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled';
    startedAt: string;
    completedAt: string | null;
}
export function isFlowRunProgressQuery(route: string): boolean {
    const params = new URLSearchParams(route.slice(route.indexOf('?') + 1));
    return route.includes('?') && [...params].length === 1 && params.get('view') === 'progress';
}
export function parseFlowRunProgress(input: unknown): {
    data: PublicFlowRun;
} {
    const root = input as {
        data?: Record<string, unknown>;
    } | null;
    const data = root?.data, uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
    const instant = (value: unknown): value is string => typeof value === 'string' && value.length === 24
        && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
    if (!data || Array.isArray(data) || typeof data !== 'object'
        || typeof data.id !== 'string' || !uuid.test(data.id) || typeof data.flowId !== 'string' || !uuid.test(data.flowId)
        || !['running', 'waiting', 'completed', 'failed', 'cancelled'].includes(String(data.status))
        || !instant(data.startedAt) || data.completedAt !== null && !instant(data.completedAt)
        || ['running', 'waiting'].includes(String(data.status)) !== (data.completedAt === null))
        throw new Error('Invalid flow progress.');
    return { data: { id: data.id, flowId: data.flowId, status: data.status as PublicFlowRun['status'],
            startedAt: data.startedAt, completedAt: data.completedAt as string | null } };
}
