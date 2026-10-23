// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
export interface ReplaceContactTagsInput {
    tags: string[];
}
export interface ReplacedContactTags {
    contactId: string;
    tags: string[];
    revision: string;
}
export interface ReplaceContactTagsResponse {
    data: ReplacedContactTags;
}
export const CONTACT_TAGS_BODY_LIMIT = 64 * 1024;
export const REPLACE_CONTACT_TAGS_OPERATION = {
    id: 'replaceContactTags', name: 'contacts.tags.replace', audience: 'conversations', method: 'PATCH',
    path: '/api/v1/dashboard/{businessId}/contacts/{contactId}/tags',
    pathTemplate: '/api/v1/dashboard/:businessId/contacts/:contactId/tags',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['contacts.write'], humanPermissions: ['contacts.edit'],
    userExecution: 'direct',
    idempotency: 'required', scope: 'workspace',
} as const;
export class ContactTagsRequestError extends Error {
    constructor() { super('Provide at most 50 tags, each containing 1–256 characters. An empty list clears the tags.'); this.name = 'ContactTagsRequestError'; }
}
export function parseContactTagsReplacement(raw: string | Uint8Array): ReplaceContactTagsInput {
    try {
        const value = parseBoundedJson(raw, CONTACT_TAGS_BODY_LIMIT);
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 1
            || !Array.isArray(value.tags) || value.tags.length > 50)
            throw new ContactTagsRequestError();
        const tags = value.tags.map(tag => {
            if (typeof tag !== 'string' || tag.length > 256 || /[\u0000-\u001f\u007f]/.test(tag))
                throw new ContactTagsRequestError();
            const normalized = tag.trim().toLowerCase();
            if (!normalized || normalized.length > 256)
                throw new ContactTagsRequestError();
            return normalized;
        });
        return { tags: [...new Set(tags)].sort() };
    }
    catch {
        throw new ContactTagsRequestError();
    }
}
export function parseContactTagsResponse(input: unknown): ReplacedContactTags {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new ContactTagsRequestError();
    const value = input as Record<string, unknown>;
    if (typeof value.contactId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.contactId)
        || typeof value.revision !== 'string' || !/^\d+$/.test(value.revision))
        throw new ContactTagsRequestError();
    const { tags } = parseContactTagsReplacement(JSON.stringify({ tags: value.tags }));
    if (JSON.stringify(tags) !== JSON.stringify(value.tags))
        throw new ContactTagsRequestError();
    return { contactId: value.contactId, tags, revision: value.revision };
}
