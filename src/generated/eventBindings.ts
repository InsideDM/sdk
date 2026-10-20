// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export const LIST_EVENT_BINDINGS_OPERATION = {
    id: 'listEventBindings', name: 'events.bindings.list', audience: 'conversations', method: 'GET',
    path: '/api/v1/flows/{businessId}/recipes', pathTemplate: '/api/v1/flows/:businessId/recipes',
    principalKinds: ['business_key', 'delegation'], requiredScopes: ['events.write'], humanPermissions: ['flows.publish'], idempotency: 'none', scope: 'workspace',
} as const;
export interface EventBindingParams {
    limit?: number;
    cursor?: string;
}
export interface EventBindingQuery {
    limit: number;
    cursor?: string;
}
export interface PublicEventBinding {
    id: string;
    name: string;
    channel: 'whatsapp' | 'instagram';
    purpose: 'marketing' | 'transactional';
    publishedVersionId: string;
    endpointConfigured: boolean;
    fields: Array<{
        pointer: string;
        type: 'string' | 'number' | 'boolean' | 'datetime' | 'json' | 'string_list';
        required: boolean;
    }>;
}
export interface EventBindingPage {
    businessId: string;
    data: PublicEventBinding[];
    page: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}
export class EventBindingRequestError extends Error {
    constructor() { super('Invalid event binding catalog request or response.'); this.name = 'EventBindingRequestError'; }
}
function fail(): never { throw new EventBindingRequestError(); }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
function exact(v: Record<string, unknown>, keys: string[]) { if (keys.some(k => !Object.hasOwn(v, k)) || Object.keys(v).some(k => !keys.includes(k)))
    fail(); }
function cursor(v: unknown): v is string { return typeof v === 'string' && v.length > 0 && v.length <= 2048 && /^[A-Za-z0-9_.-]+$/.test(v); }
export function parseEventBindingQuery(route: string): EventBindingQuery {
    const mark = route.indexOf('?');
    if (mark < 0)
        fail();
    const q = new URLSearchParams(route.slice(mark + 1));
    if (q.get('view') !== 'event_bindings' || [...q.keys()].some(k => !['view', 'limit', 'cursor'].includes(k)) || ['view', 'limit', 'cursor'].some(k => q.getAll(k).length > 1))
        fail();
    const size = q.get('limit'), next = q.get('cursor');
    if (size !== null && (!/^[1-9]\d{0,2}$/.test(size) || Number(size) > 100) || next !== null && !cursor(next))
        fail();
    return { limit: size === null ? 25 : Number(size), ...(next === null ? {} : { cursor: next }) };
}
export function parseEventBindingPage(value: unknown): EventBindingPage {
    if (!record(value))
        fail();
    exact(value, ['businessId', 'data', 'page']);
    if (!uuid(value.businessId) || !Array.isArray(value.data) || value.data.length > 100 || !record(value.page))
        fail();
    exact(value.page, ['hasMore', 'nextCursor']);
    if (typeof value.page.hasMore !== 'boolean' || value.page.nextCursor !== null && !cursor(value.page.nextCursor) || value.page.hasMore !== (value.page.nextCursor !== null))
        fail();
    const ids = new Set<string>();
    for (const item of value.data) {
        if (!record(item))
            fail();
        exact(item, ['id', 'name', 'channel', 'purpose', 'publishedVersionId', 'endpointConfigured', 'fields']);
        if (!uuid(item.id) || ids.has(item.id) || !uuid(item.publishedVersionId) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 100
            || !['whatsapp', 'instagram'].includes(String(item.channel)) || !['marketing', 'transactional'].includes(String(item.purpose))
            || typeof item.endpointConfigured !== 'boolean' || !Array.isArray(item.fields) || item.fields.length > 100)
            fail();
        ids.add(item.id);
        const pointers = new Set<string>();
        for (const field of item.fields) {
            if (!record(field))
                fail();
            exact(field, ['pointer', 'type', 'required']);
            if (typeof field.pointer !== 'string' || field.pointer.length > 512 || field.pointer !== '' && !/^\/(?:[^~]|~[01])*$/.test(field.pointer)
                || field.pointer.split('/').some(part => ['__proto__', 'prototype', 'constructor'].includes(part.replace(/~1/g, '/').replace(/~0/g, '~')))
                || pointers.has(field.pointer + '\0' + field.type) || !['string', 'number', 'boolean', 'datetime', 'json', 'string_list'].includes(String(field.type)) || typeof field.required !== 'boolean')
                fail();
            pointers.add(field.pointer + '\0' + field.type);
        }
    }
    return value as unknown as EventBindingPage;
}
