// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as KNOWLEDGE_DOCUMENT_SCHEMAS } from './schemas.js';
import type { KnowledgeDocumentMetadata } from './knowledgeDocumentTypes.js';
export type { KnowledgeDocumentMetadata } from './knowledgeDocumentTypes.js';
export const GET_KNOWLEDGE_DOCUMENT_OPERATION = {
    id: 'getKnowledgeDocument', name: 'knowledge.get', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/kb/metadata', pathTemplate: '/api/v1/dashboard/:businessId/kb/metadata',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['knowledge.read'], humanPermissions: ['knowledge.view'],
    idempotency: 'none', scope: 'workspace', userExecution: 'direct',
} as const;
export function parseKnowledgeDocumentMetadata(value: unknown): KnowledgeDocumentMetadata {
    const data = decodeContract(KNOWLEDGE_DOCUMENT_SCHEMAS.KnowledgeDocumentMetadata!, value, { schemas: KNOWLEDGE_DOCUMENT_SCHEMAS }) as KnowledgeDocumentMetadata;
    if (data.id === null && (data.version !== 0 || data.sectionCount !== 0))
        throw new Error('Invalid knowledge document metadata.');
    return data;
}
