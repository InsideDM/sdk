// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson, type JsonValue } from './boundedJson.js';
import { MESSAGE_OWNER_OPERATIONS } from './messageOperations.js';
import type { PublicFieldError } from './problem.js';
export interface PublishEventInput {
    id: string;
    binding: string;
    subject: {
        contactId: string;
    };
    type?: 'flow.triggered';
    occurredAt?: string;
    properties?: Record<string, JsonValue>;
}
export interface PublishEventRequest {
    id: string;
    binding: string;
    type: 'flow.triggered';
    occurredAt: string | null;
    subject: {
        contactId: string;
    };
    properties: Record<string, JsonValue>;
}
export const PUBLISH_EVENT_OPERATION = {
    id: 'publishEvent', name: 'events.publish', audience: 'conversations', method: 'POST',
    path: '/api/v1/flows/{businessId}/events', pathTemplate: '/api/v1/flows/:businessId/events',
    principalKinds: ['business_key', 'delegation'], requiredScopes: ['events.write'], humanPermissions: ['flows.publish'],
    idempotency: 'required', scope: 'workspace',
} as const;
export const ASYNC_OWNER_OPERATIONS = [...MESSAGE_OWNER_OPERATIONS, PUBLISH_EVENT_OPERATION] as const;
export class EventPublishRequestError extends Error {
    constructor() { super('Provide one stable event ID, a published flow and a known contact.'); this.name = 'EventPublishRequestError'; }
}
const EVENT_FIELDS: Readonly<Record<string, string>> = {
    event_too_old: 'occurredAt', event_in_future: 'occurredAt', flow_not_available: 'binding',
    flow_not_event_compatible: 'binding', event_properties_invalid: 'properties', subject_unavailable: 'subject.contactId',
};
export function eventRequestFieldError(reason: string): PublicFieldError | null {
    return Object.hasOwn(EVENT_FIELDS, reason) ? { field: EVENT_FIELDS[reason]!, reason } : null;
}
export function safeEventRequestErrors(input: unknown): PublicFieldError[] | null {
    if (!Array.isArray(input) || input.length < 1 || input.length > 8)
        return null;
    const errors: PublicFieldError[] = [];
    for (const item of input as unknown[]) {
        if (!item || typeof item !== 'object' || Array.isArray(item))
            return null;
        const value = item as Record<string, unknown>, expected = typeof value.reason === 'string' ? eventRequestFieldError(value.reason) : null;
        if (!expected || Object.keys(value).length !== 2 || expected.field !== value.field)
            return null;
        errors.push(expected);
    }
    return errors;
}
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function captureEventPublish(input: unknown): PublishEventRequest {
    const snapshot = (value: unknown, depth: number): JsonValue => {
        if (depth > 9)
            throw new EventPublishRequestError();
        if (value === null || typeof value === 'string' || typeof value === 'boolean')
            return value;
        if (typeof value === 'number' && Number.isFinite(value))
            return value;
        if (Array.isArray(value)) {
            if (value.length > 100 || Object.getPrototypeOf(value) !== Array.prototype
                || Reflect.ownKeys(value).length !== value.length + 1)
                throw new EventPublishRequestError();
            return Array.from({ length: value.length }, (_, index) => {
                const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
                if (!descriptor || !descriptor.enumerable || !('value' in descriptor))
                    throw new EventPublishRequestError();
                return snapshot(descriptor.value, depth + 1);
            });
        }
        if (value && typeof value === 'object' && [null, Object.prototype].includes(Object.getPrototypeOf(value))) {
            const descriptors = Object.getOwnPropertyDescriptors(value);
            if (Object.keys(descriptors).length > 100 || Object.getOwnPropertySymbols(value).length)
                throw new EventPublishRequestError();
            const result: Record<string, JsonValue> = Object.create(null);
            for (const [key, descriptor] of Object.entries(descriptors)) {
                if (!descriptor.enumerable || !('value' in descriptor))
                    throw new EventPublishRequestError();
                result[key] = snapshot(descriptor.value, depth + 1);
            }
            return result;
        }
        throw new EventPublishRequestError();
    };
    return parseEventPublish(JSON.stringify(snapshot(input, 0)));
}
export function parseEventPublish(raw: string | Uint8Array): PublishEventRequest {
    try {
        const value = parseBoundedJson(raw, 32 * 1024);
        if (!value || typeof value !== 'object' || Array.isArray(value)
            || Object.keys(value).some(key => !['id', 'binding', 'type', 'occurredAt', 'subject', 'properties'].includes(key))
            || typeof value.id !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(value.id)
            || typeof value.binding !== 'string' || !UUID.test(value.binding)
            || value.type !== undefined && value.type !== 'flow.triggered'
            || !value.subject || typeof value.subject !== 'object' || Array.isArray(value.subject)
            || Object.keys(value.subject).length !== 1 || typeof value.subject.contactId !== 'string' || !UUID.test(value.subject.contactId)
            || value.occurredAt !== undefined && (typeof value.occurredAt !== 'string' || value.occurredAt.length !== 24
                || !Number.isFinite(Date.parse(value.occurredAt)) || new Date(value.occurredAt).toISOString() !== value.occurredAt)
            || value.properties !== undefined && (!value.properties || typeof value.properties !== 'object' || Array.isArray(value.properties)))
            throw new EventPublishRequestError();
        const properties = value.properties ?? {};
        const bounded = (input: JsonValue, depth: number): void => {
            if (depth > 6)
                throw new EventPublishRequestError();
            if (input && typeof input === 'object') {
                if (Object.keys(input).length > 100)
                    throw new EventPublishRequestError();
                for (const key of Object.keys(input)) {
                    if (['__proto__', 'constructor', 'prototype'].includes(key))
                        throw new EventPublishRequestError();
                    bounded(Array.isArray(input) ? input[Number(key)]! : input[key]!, depth + 1);
                }
            }
        };
        bounded(properties, 0);
        return { id: value.id, binding: value.binding, type: 'flow.triggered', occurredAt: value.occurredAt ?? null,
            subject: { contactId: value.subject.contactId }, properties: properties as Record<string, JsonValue> };
    }
    catch {
        throw new EventPublishRequestError();
    }
}
