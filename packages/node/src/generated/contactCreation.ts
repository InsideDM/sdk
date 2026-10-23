// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
export interface CreateContactRequest {
    channel: 'whatsapp';
    name: string;
    phone: string;
}
export interface ContactReference {
    contactId: string;
    revision: string;
}
export interface CreateContactResponse {
    data: ContactReference;
}
export const CREATE_CONTACT_OPERATION = {
    id: 'createContact', name: 'contacts.create', audience: 'conversations', method: 'POST',
    path: '/api/v1/dashboard/{businessId}/contacts', pathTemplate: '/api/v1/dashboard/:businessId/contacts',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['contacts.write'], humanPermissions: ['contacts.edit'],
    userExecution: 'direct',
    idempotency: 'required', scope: 'workspace',
} as const;
export class ContactCreationRequestError extends Error {
    constructor() { super('Provide a contact name and one E.164 WhatsApp phone number.'); this.name = 'ContactCreationRequestError'; }
}
export function parseContactCreationQuery(route: string): void {
    const at = route.indexOf('?'), params = new URLSearchParams(at < 0 ? '' : route.slice(at + 1));
    if ([...params].length !== 1 || params.get('view') !== 'reference')
        throw new ContactCreationRequestError();
}
export function parseContactCreation(raw: string | Uint8Array): CreateContactRequest {
    try {
        const value = parseBoundedJson(raw, 4096);
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 3
            || value.channel !== 'whatsapp' || typeof value.name !== 'string' || value.name.length > 256
            || !value.name.trim() || /[\u0000-\u001f\u007f]/.test(value.name)
            || typeof value.phone !== 'string' || !/^\+[1-9]\d{7,14}$/.test(value.phone))
            throw new ContactCreationRequestError();
        return { channel: 'whatsapp', name: value.name.trim(), phone: value.phone };
    }
    catch {
        throw new ContactCreationRequestError();
    }
}
export function parseContactReference(input: unknown): ContactReference {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new ContactCreationRequestError();
    const value = input as Record<string, unknown>;
    if (typeof value.contactId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.contactId)
        || typeof value.revision !== 'string' || !/^\d+$/.test(value.revision))
        throw new ContactCreationRequestError();
    return { contactId: value.contactId, revision: value.revision };
}
