// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as KNOWLEDGE_SOURCE_SCHEMAS } from './schemas.js';
export const LIST_KNOWLEDGE_SOURCES_OPERATION = {
    id: 'listKnowledgeSources', name: 'knowledge.sources.list', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/knowledge/sources', pathTemplate: '/api/v1/dashboard/:businessId/knowledge/sources',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['knowledge.read'], humanPermissions: ['knowledge.view'],
    idempotency: 'none', scope: 'workspace', userExecution: 'direct',
} as const;
export const KNOWLEDGE_SOURCE_KINDS = ['website', 'text', 'document', 'unknown'] as const;
export const KNOWLEDGE_SOURCE_STATUSES = ['active', 'pending_deletion', 'deleted', 'unknown'] as const;
export type KnowledgeSourceKind = (typeof KNOWLEDGE_SOURCE_KINDS)[number];
export type KnowledgeSourceStatus = (typeof KNOWLEDGE_SOURCE_STATUSES)[number];
export interface KnowledgeSourceMetadata {
    id: string;
    businessId: string;
    kind: KnowledgeSourceKind;
    status: KnowledgeSourceStatus;
    label: string;
    url: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface KnowledgeSourceParams {
    limit?: number;
    cursor?: string;
    kind?: KnowledgeSourceKind;
    status?: KnowledgeSourceStatus;
}
export interface KnowledgeSourcePage {
    businessId: string;
    data: KnowledgeSourceMetadata[];
    page: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}
export class KnowledgeSourceRequestError extends Error {
    constructor() { super('Use the source catalog view, a limit of 1–100 and supported source filters.'); this.name = 'KnowledgeSourceRequestError'; }
}
export function parseKnowledgeSourceListQuery(route: string): {
    limit: number;
    cursor?: string;
    kind?: KnowledgeSourceKind;
    status?: KnowledgeSourceStatus;
} {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    if (query.get('view') !== 'catalog' || [...query.keys()].some(key => !['view', 'limit', 'cursor', 'kind', 'status'].includes(key))
        || ['view', 'limit', 'cursor', 'kind', 'status'].some(key => query.getAll(key).length > 1))
        throw new KnowledgeSourceRequestError();
    const limit = query.get('limit'), cursor = query.get('cursor'), kind = query.get('kind'), status = query.get('status');
    if (limit !== null && (!/^[1-9]\d{0,2}$/.test(limit) || Number(limit) > 100)
        || cursor !== null && !/^[A-Za-z0-9_.-]{1,2048}$/.test(cursor)
        || kind !== null && !(KNOWLEDGE_SOURCE_KINDS as readonly string[]).includes(kind)
        || status !== null && !(KNOWLEDGE_SOURCE_STATUSES as readonly string[]).includes(status))
        throw new KnowledgeSourceRequestError();
    return { limit: limit === null ? 25 : Number(limit), ...(cursor === null ? {} : { cursor }),
        ...(kind === null ? {} : { kind: kind as KnowledgeSourceKind }), ...(status === null ? {} : { status: status as KnowledgeSourceStatus }) };
}
export function parseKnowledgeSourceMetadata(value: unknown): KnowledgeSourceMetadata {
    return decodeContract(KNOWLEDGE_SOURCE_SCHEMAS.KnowledgeSourceMetadata!, value, { schemas: KNOWLEDGE_SOURCE_SCHEMAS }) as KnowledgeSourceMetadata;
}
export function parseKnowledgeSourcePage(value: unknown): KnowledgeSourcePage {
    const page = decodeContract(KNOWLEDGE_SOURCE_SCHEMAS.KnowledgeSourcePage!, value, { schemas: KNOWLEDGE_SOURCE_SCHEMAS }) as KnowledgeSourcePage;
    if (page.page.hasMore !== (page.page.nextCursor !== null) || new Set(page.data.map(source => source.id)).size !== page.data.length
        || page.data.some(source => source.businessId !== page.businessId))
        throw new KnowledgeSourceRequestError();
    return page;
}
