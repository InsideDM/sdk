// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as KNOWLEDGE_SECTION_SCHEMAS } from './schemas.js';
import type { KnowledgeSectionContent, KnowledgeSectionContentPage } from './knowledgeSectionTypes.js';
export type { KnowledgeSectionContent, KnowledgeSectionContentPage, KnowledgeSectionParams } from './knowledgeSectionTypes.js';
export const LIST_KNOWLEDGE_SECTIONS_OPERATION = {
    id: 'listKnowledgeSections', name: 'knowledge.sections.list', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/kb', pathTemplate: '/api/v1/dashboard/:businessId/kb',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['knowledge.content.read'], humanPermissions: ['knowledge.view'],
    idempotency: 'none', scope: 'workspace', userExecution: 'direct',
} as const;
export class KnowledgeSectionRequestError extends Error {
    constructor() { super('Use the sections view, a limit of 1–25 and the cursor from the same document query.'); this.name = 'KnowledgeSectionRequestError'; }
}
export function parseKnowledgeSectionQuery(route: string): {
    limit: number;
    cursor?: string;
} {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    if (query.get('view') !== 'sections' || [...query.keys()].some(key => !['view', 'limit', 'cursor'].includes(key))
        || ['view', 'limit', 'cursor'].some(key => query.getAll(key).length > 1))
        throw new KnowledgeSectionRequestError();
    const limit = query.get('limit'), cursor = query.get('cursor');
    if (limit !== null && (!/^[1-9]\d?$/.test(limit) || Number(limit) > 25)
        || cursor !== null && !/^[A-Za-z0-9_.-]{1,2048}$/.test(cursor))
        throw new KnowledgeSectionRequestError();
    return { limit: limit === null ? 10 : Number(limit), ...(cursor === null ? {} : { cursor }) };
}
export function parseKnowledgeSectionContent(value: unknown): KnowledgeSectionContent {
    const section = decodeContract(KNOWLEDGE_SECTION_SCHEMAS.KnowledgeSectionContent!, value, { schemas: KNOWLEDGE_SECTION_SCHEMAS }) as KnowledgeSectionContent;
    const parent = section.stableKey.includes('/') ? section.stableKey.split('/')[0]! : null;
    if (section.parentKey !== parent || section.manualOverrideMd === null && (section.overrideStale || section.overrideOrphaned))
        throw new KnowledgeSectionRequestError();
    return section;
}
export function parseKnowledgeSectionContentPage(value: unknown): KnowledgeSectionContentPage {
    const page = decodeContract(KNOWLEDGE_SECTION_SCHEMAS.KnowledgeSectionContentPage!, value, { schemas: KNOWLEDGE_SECTION_SCHEMAS }) as KnowledgeSectionContentPage;
    if (page.page.hasMore !== (page.page.nextCursor !== null) || page.page.hasMore && page.data.length === 0)
        throw new KnowledgeSectionRequestError();
    const ids = new Set<string>(), keys = new Set<string>();
    for (const row of page.data) {
        const section = parseKnowledgeSectionContent(row);
        if (section.businessId !== page.businessId || ids.has(section.id) || keys.has(section.stableKey)
            || section.documentId !== page.data[0]!.documentId || section.documentVersion !== page.data[0]!.documentVersion)
            throw new KnowledgeSectionRequestError();
        ids.add(section.id);
        keys.add(section.stableKey);
    }
    return page;
}
