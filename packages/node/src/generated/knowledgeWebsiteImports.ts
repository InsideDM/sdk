// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { parseBoundedJson } from './boundedJson.js';
import { SCHEMAS as KNOWLEDGE_WEBSITE_IMPORT_SCHEMAS } from './schemas.js';
import type { ImportWebsiteKnowledgeInput, WebsiteKnowledgeImportReceipt } from './knowledgeWebsiteImportTypes.js';
export type { ImportWebsiteKnowledgeInput, WebsiteKnowledgeImportReceipt } from './knowledgeWebsiteImportTypes.js';
export const IMPORT_WEBSITE_KNOWLEDGE_OPERATION = {
    id: 'importWebsiteKnowledge', name: 'knowledge.sources.importWebsite', audience: 'conversations', method: 'POST',
    path: '/api/v1/dashboard/{businessId}/knowledge/sources', pathTemplate: '/api/v1/dashboard/:businessId/knowledge/sources',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['knowledge.write'], humanPermissions: ['knowledge.edit'],
    idempotency: 'required', scope: 'workspace', userExecution: 'direct', bodyLimit: 4096,
} as const;
export class KnowledgeWebsiteImportRequestError extends Error {
    constructor() { super('Provide a public HTTP(S) website URL and a page budget from 1 to 100.'); this.name = 'KnowledgeWebsiteImportRequestError'; }
}
export function parseWebsiteKnowledgeImportQuery(route: string): void {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    if (query.get('view') !== 'import' || query.getAll('view').length !== 1 || [...query.keys()].some(key => key !== 'view'))
        throw new KnowledgeWebsiteImportRequestError();
}
export function parseWebsiteKnowledgeImport(raw: string | Uint8Array): ImportWebsiteKnowledgeInput {
    try {
        const input = decodeContract(KNOWLEDGE_WEBSITE_IMPORT_SCHEMAS.ImportWebsiteKnowledgeInput!, parseBoundedJson(raw, 4096), { schemas: KNOWLEDGE_WEBSITE_IMPORT_SCHEMAS }) as ImportWebsiteKnowledgeInput;
        let url: URL;
        try {
            url = new URL(input.url);
        }
        catch {
            throw new KnowledgeWebsiteImportRequestError();
        }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
            || url.port && !(url.protocol === 'https:' && url.port === '443' || url.protocol === 'http:' && url.port === '80'))
            throw new KnowledgeWebsiteImportRequestError();
        url.hash = '';
        const normalized = url.toString();
        if (normalized.length > 2048)
            throw new KnowledgeWebsiteImportRequestError();
        return { url: normalized, ...(input.maxPages === undefined ? {} : { maxPages: input.maxPages }) };
    }
    catch {
        throw new KnowledgeWebsiteImportRequestError();
    }
}
export function parseWebsiteKnowledgeImportReceipt(value: unknown): WebsiteKnowledgeImportReceipt {
    return decodeContract(KNOWLEDGE_WEBSITE_IMPORT_SCHEMAS.WebsiteKnowledgeImportReceipt!, value, { schemas: KNOWLEDGE_WEBSITE_IMPORT_SCHEMAS }) as WebsiteKnowledgeImportReceipt;
}
