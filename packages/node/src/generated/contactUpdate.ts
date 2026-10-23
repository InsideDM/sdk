// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
import { parseContactReference } from './contactCreation.js';
export interface UpdateContactInput {
    displayName: string | null;
}
export interface UpdatedContact {
    contactId: string;
    displayName: string | null;
    revision: string;
}
export interface UpdateContactResponse {
    data: UpdatedContact;
}
export const UPDATE_CONTACT_OPERATION = {
    id: 'updateContact', name: 'contacts.update', audience: 'conversations', method: 'PATCH',
    path: '/api/v1/dashboard/{businessId}/contacts/{contactId}',
    pathTemplate: '/api/v1/dashboard/:businessId/contacts/:contactId',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['contacts.write'], humanPermissions: ['contacts.edit'],
    userExecution: 'direct',
    idempotency: 'required', scope: 'workspace',
} as const;
export class ContactUpdateRequestError extends Error {
    constructor() { super('Provide displayName containing 1–256 characters, or null to clear it.'); this.name = 'ContactUpdateRequestError'; }
}
export function parseContactUpdate(raw: string | Uint8Array): UpdateContactInput {
    try {
        const value = parseBoundedJson(raw, 4096);
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 1
            || !Object.hasOwn(value, 'displayName'))
            throw new ContactUpdateRequestError();
        if (value.displayName === null)
            return { displayName: null };
        if (typeof value.displayName !== 'string' || value.displayName.length > 256
            || /[\u0000-\u001f\u007f]/.test(value.displayName) || !value.displayName.trim())
            throw new ContactUpdateRequestError();
        return { displayName: value.displayName.trim() };
    }
    catch {
        throw new ContactUpdateRequestError();
    }
}
export function parseUpdatedContact(input: unknown): UpdatedContact {
    const reference = parseContactReference(input);
    const value = input as Record<string, unknown>;
    const { displayName } = parseContactUpdate(JSON.stringify({ displayName: value.displayName }));
    if (displayName !== value.displayName)
        throw new ContactUpdateRequestError();
    return { ...reference, displayName };
}
