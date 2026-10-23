// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as CONTACT_FIELD_SCHEMAS } from './schemas.js';
import { parseBoundedJson } from './boundedJson.js';
export const CONTACT_FIELD_AGENT_HINT_MAX_LENGTH = 80;
export const CONTACT_FIELD_MEMORY_POLICY_DETAIL = 'Agent memory is not allowed for this field by the personal-data policy.';
export interface ContactFieldDefinition {
    id: string;
    key: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'date';
    createdAt: string;
    agentMayRemember: boolean;
    agentHint: string | null;
}
export interface ContactFieldCatalog {
    definitions: ContactFieldDefinition[];
    limit: number;
    version: number;
}
export const LIST_CONTACT_FIELDS_OPERATION = {
    id: 'listContactFields', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/contact-fields', pathTemplate: '/api/v1/dashboard/:businessId/contact-fields',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['contacts.read'], humanPermissions: ['contacts.view'],
    idempotency: 'none', scope: 'workspace',
} as const;
export const CREATE_CONTACT_FIELD_OPERATION = {
    id: 'createContactField', name: 'contacts.fields.create', audience: 'conversations', method: 'POST',
    path: '/api/v1/dashboard/{businessId}/contact-fields', pathTemplate: '/api/v1/dashboard/:businessId/contact-fields',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['contacts.write'], humanPermissions: ['contacts.edit'],
    idempotency: 'required', scope: 'workspace', userExecution: 'direct', bodyLimit: 4096,
} as const;
export const ARCHIVE_CONTACT_FIELD_OPERATION = {
    id: 'archiveContactField', name: 'contacts.fields.archive', audience: 'conversations', method: 'DELETE',
    path: '/api/v1/dashboard/{businessId}/contact-fields/{definitionId}', pathTemplate: '/api/v1/dashboard/:businessId/contact-fields/:definitionId',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['contacts.write'], humanPermissions: ['contacts.edit'],
    idempotency: 'required', scope: 'workspace', userExecution: 'direct', bodyLimit: 1024,
} as const;
export const CONFIGURE_CONTACT_FIELD_MEMORY_OPERATION = {
    id: 'configureContactFieldMemory', name: 'contacts.fields.configureMemory', audience: 'conversations', method: 'PATCH',
    path: '/api/v1/dashboard/{businessId}/contact-fields/{definitionId}', pathTemplate: '/api/v1/dashboard/:businessId/contact-fields/:definitionId',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['contacts.write'], humanPermissions: ['contacts.edit'],
    idempotency: 'required', scope: 'workspace', userExecution: 'direct', bodyLimit: 1024,
} as const;
export interface CreateContactFieldInput {
    label: string;
    key?: string | null;
    type?: 'text' | 'number' | 'boolean' | 'date';
}
export interface CreatedContactField {
    businessId: string;
    definition: ContactFieldDefinition;
    appliedVersion: number;
    auditId: string;
    requestId: string;
}
export interface ArchiveContactFieldInput {
    expectedVersion: number;
}
export interface ArchivedContactField {
    businessId: string;
    definitionId: string;
    archived: true;
    appliedVersion: number;
    auditId: string;
    requestId: string;
}
export interface ConfigureContactFieldMemoryInput extends ArchiveContactFieldInput {
    agentMayRemember: boolean;
    agentHint?: string | null;
}
export interface ConfiguredContactFieldMemory extends CreatedContactField {
    changed: boolean;
}
export class ContactFieldRequestError extends Error {
    constructor() { super('Use the documented contact-field input and observed configuration version.'); this.name = 'ContactFieldRequestError'; }
}
export function normalizeContactFieldAgentHint(value: string | null): string | null {
    if (value === null)
        return null;
    const hint = value.replace(/\s+/g, ' ').trim();
    if (hint.length > CONTACT_FIELD_AGENT_HINT_MAX_LENGTH || /\p{Cc}/u.test(hint))
        throw new ContactFieldRequestError();
    return hint || null;
}
export function contactFieldMemoryPolicyError() {
    return { field: 'request.agentMayRemember', reason: 'agent_memory_forbidden' } as const;
}
export function parseContactFieldMemoryPolicyError(value: unknown) {
    const expected = contactFieldMemoryPolicyError();
    return Array.isArray(value) && value.some((item: unknown) => item !== null && typeof item === 'object'
        && 'field' in item && 'reason' in item && item.field === expected.field && item.reason === expected.reason) ? expected : null;
}
export function parseContactFieldCreationQuery(route: string) {
    const params = new URL(route, 'https://api.insidedm.io').searchParams;
    if ([...params].length !== 1 || params.get('view') !== 'creation')
        throw new ContactFieldRequestError();
}
export function parseContactFieldArchiveQuery(route: string) {
    const params = new URL(route, 'https://api.insidedm.io').searchParams;
    if ([...params].length !== 1 || params.get('view') !== 'archive')
        throw new ContactFieldRequestError();
}
export function parseContactFieldMemoryQuery(route: string) {
    const params = new URL(route, 'https://api.insidedm.io').searchParams;
    if ([...params].length !== 1 || params.get('view') !== 'memory')
        throw new ContactFieldRequestError();
}
export function parseContactFieldMemory(raw: string | Uint8Array): ConfigureContactFieldMemoryInput {
    try {
        const input = decodeContract(CONTACT_FIELD_SCHEMAS.ConfigureContactFieldMemoryInput!, parseBoundedJson(raw, 1024), { schemas: CONTACT_FIELD_SCHEMAS }) as ConfigureContactFieldMemoryInput;
        return { expectedVersion: input.expectedVersion, agentMayRemember: input.agentMayRemember,
            ...(Object.hasOwn(input, 'agentHint') ? { agentHint: normalizeContactFieldAgentHint(input.agentHint!) } : {}) };
    }
    catch {
        throw new ContactFieldRequestError();
    }
}
export function parseConfiguredContactFieldMemory(value: unknown): ConfiguredContactFieldMemory {
    return decodeContract(CONTACT_FIELD_SCHEMAS.ConfiguredContactFieldMemory!, value, { schemas: CONTACT_FIELD_SCHEMAS }) as ConfiguredContactFieldMemory;
}
export function parseContactFieldArchive(raw: string | Uint8Array): ArchiveContactFieldInput {
    try {
        return decodeContract(CONTACT_FIELD_SCHEMAS.ArchiveContactFieldInput!, parseBoundedJson(raw, 1024), { schemas: CONTACT_FIELD_SCHEMAS }) as ArchiveContactFieldInput;
    }
    catch {
        throw new ContactFieldRequestError();
    }
}
export function parseArchivedContactField(value: unknown): ArchivedContactField {
    return decodeContract(CONTACT_FIELD_SCHEMAS.ArchivedContactField!, value, { schemas: CONTACT_FIELD_SCHEMAS }) as ArchivedContactField;
}
export function parseContactFieldCreation(raw: string | Uint8Array): Required<CreateContactFieldInput> {
    try {
        const input = decodeContract(CONTACT_FIELD_SCHEMAS.CreateContactFieldInput!, parseBoundedJson(raw, 4096), { schemas: CONTACT_FIELD_SCHEMAS }) as CreateContactFieldInput;
        if (!input.label.trim() || /\p{Cc}/u.test(input.label))
            throw new ContactFieldRequestError();
        return { label: input.label.trim(), key: input.key ?? null, type: input.type ?? 'text' };
    }
    catch {
        throw new ContactFieldRequestError();
    }
}
export function parseCreatedContactField(value: unknown): CreatedContactField {
    const result = decodeContract(CONTACT_FIELD_SCHEMAS.CreatedContactField!, value, { schemas: CONTACT_FIELD_SCHEMAS }) as CreatedContactField;
    if (result.definition.agentMayRemember || result.definition.agentHint !== null)
        throw new ContactFieldRequestError();
    return result;
}
