// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as KNOWLEDGE_RUN_SCHEMAS } from './schemas.js';
export const GET_KNOWLEDGE_RUN_OPERATION = {
    id: 'getKnowledgeRun', name: 'knowledge.runs.get', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/knowledge/sources/runs/{runId}',
    pathTemplate: '/api/v1/dashboard/:businessId/knowledge/sources/runs/:runId',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['knowledge.read'], humanPermissions: ['knowledge.view'],
    idempotency: 'none', scope: 'workspace', userExecution: 'direct',
} as const;
export const LIST_KNOWLEDGE_RUNS_OPERATION = {
    id: 'listKnowledgeRuns', name: 'knowledge.runs.list', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/knowledge', pathTemplate: '/api/v1/dashboard/:businessId/knowledge',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['knowledge.read'], humanPermissions: ['knowledge.view'],
    idempotency: 'none', scope: 'workspace', userExecution: 'direct',
} as const;
export const KNOWLEDGE_RUN_STATUSES = ['queued', 'running', 'waiting', 'succeeded', 'failed', 'cancelled', 'expired', 'uncertain', 'unknown'] as const;
export type KnowledgeRunStatus = (typeof KNOWLEDGE_RUN_STATUSES)[number];
export type KnowledgeRunCounter = number;
export interface KnowledgeRunProgress {
    id: string;
    businessId: string;
    status: KnowledgeRunStatus;
    sourceType: 'website' | 'unknown';
    attempts: number;
    pagesCrawled: KnowledgeRunCounter | null;
    documentSectionCount: KnowledgeRunCounter | null;
    sectionsEmbedded: KnowledgeRunCounter | null;
    sectionsEmbeddingSkipped: KnowledgeRunCounter | null;
    knowledgeVersion: KnowledgeRunCounter | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
}
export interface KnowledgeRunParams {
    limit?: number;
    cursor?: string;
    status?: KnowledgeRunStatus;
}
export interface KnowledgeRunPage {
    businessId: string;
    data: KnowledgeRunProgress[];
    page: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}
export class KnowledgeRunRequestError extends Error {
    constructor() { super('Use an existing knowledge run ID and the progress view without extra parameters.'); this.name = 'KnowledgeRunRequestError'; }
}
export function parseKnowledgeRunId(value: string): string {
    if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))
        throw new KnowledgeRunRequestError();
    return value.toLowerCase();
}
export function parseKnowledgeRunQuery(route: string): void {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    if ([...query].length !== 1 || query.get('view') !== 'progress')
        throw new KnowledgeRunRequestError();
}
export function parseKnowledgeRunProgress(value: unknown): KnowledgeRunProgress {
    return decodeContract(KNOWLEDGE_RUN_SCHEMAS.KnowledgeRunProgress!, value, { schemas: KNOWLEDGE_RUN_SCHEMAS }) as KnowledgeRunProgress;
}
export function parseKnowledgeRunListQuery(route: string): {
    limit: number;
    cursor?: string;
    status?: KnowledgeRunStatus;
} {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    if (query.get('view') !== 'ingestion_runs' || [...query.keys()].some(key => !['view', 'limit', 'cursor', 'status'].includes(key))
        || ['view', 'limit', 'cursor', 'status'].some(key => query.getAll(key).length > 1))
        throw new KnowledgeRunRequestError();
    const limit = query.get('limit'), cursor = query.get('cursor'), status = query.get('status');
    if (limit !== null && (!/^[1-9]\d{0,2}$/.test(limit) || Number(limit) > 100)
        || cursor !== null && !/^[A-Za-z0-9_.-]{1,2048}$/.test(cursor)
        || status !== null && !(KNOWLEDGE_RUN_STATUSES as readonly string[]).includes(status))
        throw new KnowledgeRunRequestError();
    return { limit: limit === null ? 25 : Number(limit), ...(cursor === null ? {} : { cursor }),
        ...(status === null ? {} : { status: status as KnowledgeRunStatus }) };
}
export function parseKnowledgeRunPage(value: unknown): KnowledgeRunPage {
    const page = decodeContract(KNOWLEDGE_RUN_SCHEMAS.KnowledgeRunPage!, value, { schemas: KNOWLEDGE_RUN_SCHEMAS }) as KnowledgeRunPage;
    if (page.page.hasMore !== (page.page.nextCursor !== null) || new Set(page.data.map(run => run.id)).size !== page.data.length
        || page.data.some(run => run.businessId !== page.businessId))
        throw new KnowledgeRunRequestError();
    return page;
}
