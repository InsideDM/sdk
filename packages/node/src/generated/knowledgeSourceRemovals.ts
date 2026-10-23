// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { parseBoundedJson } from './boundedJson.js';
import { SCHEMAS as KNOWLEDGE_SOURCE_REMOVAL_SCHEMAS } from './schemas.js';
import type { RemoveKnowledgeSourceInput, KnowledgeSourceRemovalReceipt } from './knowledgeSourceRemovalTypes.js';
export type { RemoveKnowledgeSourceInput, KnowledgeSourceRemovalReceipt } from './knowledgeSourceRemovalTypes.js';
export const REMOVE_KNOWLEDGE_SOURCE_OPERATION = {
    id: 'removeKnowledgeSource', name: 'knowledge.sources.remove', audience: 'conversations', method: 'POST',
    path: '/api/v1/dashboard/{businessId}/kb/sources/{sourceId}/remove',
    pathTemplate: '/api/v1/dashboard/:businessId/kb/sources/:sourceId/remove',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['knowledge.write'], humanPermissions: ['knowledge.edit'],
    idempotency: 'required', scope: 'workspace', userExecution: 'direct', bodyLimit: 4096,
} as const;
export class KnowledgeSourceRemovalRequestError extends Error {
    constructor() { super('Provide the registered source UUID and current knowledge document version.'); this.name = 'KnowledgeSourceRemovalRequestError'; }
}
export function parseKnowledgeSourceId(input: unknown): string {
    if (typeof input !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input))
        throw new KnowledgeSourceRemovalRequestError();
    return input.toLowerCase();
}
export function parseKnowledgeSourceRemovalQuery(route: string): void {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    if (query.get('view') !== 'remove' || query.getAll('view').length !== 1 || [...query.keys()].some(key => key !== 'view'))
        throw new KnowledgeSourceRemovalRequestError();
}
export function parseKnowledgeSourceRemoval(raw: string | Uint8Array): RemoveKnowledgeSourceInput {
    try {
        return decodeContract(KNOWLEDGE_SOURCE_REMOVAL_SCHEMAS.RemoveKnowledgeSourceInput!, parseBoundedJson(raw, 4096), { schemas: KNOWLEDGE_SOURCE_REMOVAL_SCHEMAS }) as RemoveKnowledgeSourceInput;
    }
    catch {
        throw new KnowledgeSourceRemovalRequestError();
    }
}
export function parseKnowledgeSourceRemovalReceipt(value: unknown): KnowledgeSourceRemovalReceipt {
    const receipt = decodeContract(KNOWLEDGE_SOURCE_REMOVAL_SCHEMAS.KnowledgeSourceRemovalReceipt!, value, { schemas: KNOWLEDGE_SOURCE_REMOVAL_SCHEMAS }) as KnowledgeSourceRemovalReceipt;
    if (receipt.sectionsRequiringRefresh > receipt.sectionsHidden)
        throw new KnowledgeSourceRemovalRequestError();
    return receipt;
}
