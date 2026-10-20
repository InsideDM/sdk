// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
export type ContactAttributeValue = string | number | boolean | null;
export interface UpdateContactAttributesInput {
    attributes: Record<string, ContactAttributeValue>;
}
export interface UpdatedContactAttributes {
    contactId: string;
    attributes: Record<string, ContactAttributeValue>;
    revision: string;
}
export interface UpdateContactAttributesResponse {
    data: UpdatedContactAttributes;
}
export const CONTACT_ATTRIBUTES_BODY_LIMIT = 64 * 1024;
export const UPDATE_CONTACT_ATTRIBUTES_OPERATION = {
    id: 'updateContactAttributes', audience: 'conversations', method: 'PATCH',
    path: '/api/v1/dashboard/{businessId}/contacts/{contactId}/attributes',
    pathTemplate: '/api/v1/dashboard/:businessId/contacts/:contactId/attributes',
    principalKinds: ['business_key', 'delegation'], requiredScopes: ['contacts.write'], humanPermissions: ['contacts.edit'],
    idempotency: 'required', scope: 'workspace',
} as const;
export class ContactAttributeRequestError extends Error {
    constructor() { super('Provide a nonempty attributes object containing valid custom-field values.'); this.name = 'ContactAttributeRequestError'; }
}
export function parseContactAttributeUpdate(raw: string | Uint8Array): UpdateContactAttributesInput {
    const refuse = (): never => { throw new ContactAttributeRequestError(); };
    try {
        const parsed: unknown = parseBoundedJson(raw, CONTACT_ATTRIBUTES_BODY_LIMIT);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).length !== 1 || !Object.hasOwn(parsed, 'attributes'))
            return refuse();
        const attributes: unknown = (parsed as Record<string, unknown>).attributes;
        if (attributes === null || typeof attributes !== 'object' || Array.isArray(attributes))
            return refuse();
        const entries = Object.entries(attributes);
        if (entries.length < 1 || entries.length > 500)
            return refuse();
        for (const [name, value] of entries) {
            if (!/^[a-z][a-z0-9_]{0,63}$/.test(name))
                return refuse();
            if (value !== null && typeof value !== 'string' && typeof value !== 'boolean' && !(typeof value === 'number' && Number.isFinite(value)))
                return refuse();
        }
        return { attributes: Object.fromEntries(entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) as Record<string, ContactAttributeValue> };
    }
    catch {
        return refuse();
    }
}
