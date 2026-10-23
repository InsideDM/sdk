// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { parseBoundedJson } from './boundedJson.js';
import { SCHEMAS as KNOWLEDGE_WEBSITE_REMOVAL_SCHEMAS } from './schemas.js';
import { parseWebsiteKnowledgeImport } from './knowledgeWebsiteImports.js';
import type { RemoveWebsiteKnowledgeInput, WebsiteKnowledgeRemovalReceipt } from './knowledgeWebsiteRemovalTypes.js';
export type { RemoveWebsiteKnowledgeInput, WebsiteKnowledgeRemovalReceipt } from './knowledgeWebsiteRemovalTypes.js';
export const REMOVE_WEBSITE_KNOWLEDGE_OPERATION = {
    id: 'removeWebsiteKnowledge', name: 'knowledge.sources.removeWebsite', audience: 'conversations', method: 'DELETE',
    path: '/api/v1/dashboard/{businessId}/knowledge/sources', pathTemplate: '/api/v1/dashboard/:businessId/knowledge/sources',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['knowledge.write'], humanPermissions: ['knowledge.edit'],
    idempotency: 'required', scope: 'workspace', userExecution: 'direct', bodyLimit: 4096,
} as const;
export class KnowledgeWebsiteRemovalRequestError extends Error {
    constructor() { super('Provide the exact HTTP(S) website URL to remove from knowledge.'); this.name = 'KnowledgeWebsiteRemovalRequestError'; }
}
export function parseWebsiteKnowledgeRemovalQuery(route: string): void {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    if (query.get('view') !== 'remove' || query.getAll('view').length !== 1 || [...query.keys()].some(key => key !== 'view'))
        throw new KnowledgeWebsiteRemovalRequestError();
}
export function parseWebsiteKnowledgeRemoval(raw: string | Uint8Array): RemoveWebsiteKnowledgeInput {
    try {
        const input = decodeContract(KNOWLEDGE_WEBSITE_REMOVAL_SCHEMAS.RemoveWebsiteKnowledgeInput!, parseBoundedJson(raw, 4096), { schemas: KNOWLEDGE_WEBSITE_REMOVAL_SCHEMAS }) as RemoveWebsiteKnowledgeInput;
        return { url: parseWebsiteKnowledgeImport(JSON.stringify(input)).url };
    }
    catch {
        throw new KnowledgeWebsiteRemovalRequestError();
    }
}
export function parseWebsiteKnowledgeRemovalReceipt(value: unknown): WebsiteKnowledgeRemovalReceipt {
    const receipt = decodeContract(KNOWLEDGE_WEBSITE_REMOVAL_SCHEMAS.WebsiteKnowledgeRemovalReceipt!, value, { schemas: KNOWLEDGE_WEBSITE_REMOVAL_SCHEMAS }) as WebsiteKnowledgeRemovalReceipt;
    if (parseWebsiteKnowledgeRemoval(JSON.stringify({ url: receipt.url })).url !== receipt.url
        || receipt.sectionsRequiringRefresh > receipt.sectionsHidden
        || receipt.sourceId === null && (receipt.sectionsDropped > 0 || receipt.sectionsHidden > 0)
        || receipt.outcome === 'already_removed' && (receipt.cancelledImports > 0 || receipt.sectionsDropped > 0 || receipt.sectionsHidden > 0))
        throw new KnowledgeWebsiteRemovalRequestError();
    return receipt;
}
