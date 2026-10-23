// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { parseBoundedJson } from './boundedJson.js';
import { SCHEMAS as KNOWLEDGE_SECTION_EDIT_SCHEMAS } from './schemas.js';
import type { SetKnowledgeSectionOverrideInput, AcknowledgeKnowledgeSectionOverrideInput, KnowledgeSectionEditReceipt } from './knowledgeSectionEditTypes.js';
export type { SetKnowledgeSectionOverrideInput, AcknowledgeKnowledgeSectionOverrideInput, KnowledgeSectionEditReceipt } from './knowledgeSectionEditTypes.js';
export const KNOWLEDGE_OVERRIDE_MAX_BYTES = 65536;
const shared = { audience: 'conversations', principalKinds: ['business_key', 'delegation', 'user_delegation'],
    requiredScopes: ['knowledge.content.write'], humanPermissions: ['knowledge.edit'], idempotency: 'required', scope: 'workspace', userExecution: 'direct' } as const;
export const SET_KNOWLEDGE_SECTION_OVERRIDE_OPERATION = { ...shared,
    id: 'setKnowledgeSectionOverride', name: 'knowledge.sections.setOverride', method: 'PUT',
    path: '/api/v1/dashboard/{businessId}/kb/sections/{sectionId}/override',
    pathTemplate: '/api/v1/dashboard/:businessId/kb/sections/:sectionId/override', bodyLimit: 524288,
} as const;
export const ACKNOWLEDGE_KNOWLEDGE_SECTION_OVERRIDE_OPERATION = { ...shared,
    id: 'acknowledgeKnowledgeSectionOverride', name: 'knowledge.sections.acknowledgeOverride', method: 'POST',
    path: '/api/v1/dashboard/{businessId}/kb/sections/{sectionId}/acknowledge',
    pathTemplate: '/api/v1/dashboard/:businessId/kb/sections/:sectionId/acknowledge', bodyLimit: 4096,
} as const;
export class KnowledgeSectionEditRequestError extends Error {
    constructor() { super('Provide the section UUID, original document version and verbatim text or null within 64 KiB.'); this.name = 'KnowledgeSectionEditRequestError'; }
}
export function parseKnowledgeSectionId(value: unknown): string {
    if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))
        throw new KnowledgeSectionEditRequestError();
    return value.toLowerCase();
}
export function parseKnowledgeSectionEditQuery(route: string): void {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    if (query.get('view') !== 'edit' || query.getAll('view').length !== 1 || [...query.keys()].some(key => key !== 'view'))
        throw new KnowledgeSectionEditRequestError();
}
export function parseSetKnowledgeSectionOverride(raw: string | Uint8Array): SetKnowledgeSectionOverrideInput {
    try {
        const input = decodeContract(KNOWLEDGE_SECTION_EDIT_SCHEMAS.SetKnowledgeSectionOverrideInput!, parseBoundedJson(raw, 524288), { schemas: KNOWLEDGE_SECTION_EDIT_SCHEMAS }) as SetKnowledgeSectionOverrideInput;
        if (input.overrideMd !== null && new TextEncoder().encode(input.overrideMd).byteLength > KNOWLEDGE_OVERRIDE_MAX_BYTES)
            throw new KnowledgeSectionEditRequestError();
        return input;
    }
    catch {
        throw new KnowledgeSectionEditRequestError();
    }
}
export function parseAcknowledgeKnowledgeSectionOverride(raw: string | Uint8Array): AcknowledgeKnowledgeSectionOverrideInput {
    try {
        return decodeContract(KNOWLEDGE_SECTION_EDIT_SCHEMAS.AcknowledgeKnowledgeSectionOverrideInput!, parseBoundedJson(raw, 4096), { schemas: KNOWLEDGE_SECTION_EDIT_SCHEMAS }) as AcknowledgeKnowledgeSectionOverrideInput;
    }
    catch {
        throw new KnowledgeSectionEditRequestError();
    }
}
export function parseKnowledgeSectionEditReceipt(value: unknown): KnowledgeSectionEditReceipt {
    return decodeContract(KNOWLEDGE_SECTION_EDIT_SCHEMAS.KnowledgeSectionEditReceipt!, value, { schemas: KNOWLEDGE_SECTION_EDIT_SCHEMAS }) as KnowledgeSectionEditReceipt;
}
