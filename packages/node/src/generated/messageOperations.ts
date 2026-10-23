// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
import { isIdempotencyKey } from './idempotency.js';
import { MESSAGE_SEND_OPERATION, MessageSendRequestError } from './messageSend.js';
import type { PublicFieldError } from './problem.js';
export interface MessagePreview {
    eligible: boolean;
    reasonCode: string | null;
    channel: 'whatsapp' | 'instagram';
    transport: 'session' | 'template';
    wouldCreateRecipient: boolean;
}
const base = { audience: 'conversations', principalKinds: ['business_key', 'delegation'], scope: 'workspace' } as const;
export const MESSAGE_PREVIEW_OPERATION = { ...base, principalKinds: ['business_key', 'delegation', 'user_delegation'], userExecution: 'direct', id: 'previewMessage', name: 'messages.preview', method: 'POST',
    path: '/api/v1/inbox/{businessId}/messages/preview', pathTemplate: '/api/v1/inbox/:businessId/messages/preview',
    requiredScopes: ['messages.send'], humanPermissions: ['campaigns.send'], idempotency: 'none' } as const;
export const GET_OPERATION = { ...base, principalKinds: ['business_key', 'delegation', 'user_delegation'], id: 'getOperation', name: 'operations.get', method: 'GET',
    path: '/api/v1/inbox/{businessId}/operations/{operationId}', pathTemplate: '/api/v1/inbox/:businessId/operations/:operationId',
    requiredScopes: ['operations.read'], humanPermissions: ['inbox.view'], idempotency: 'none' } as const;
export const LOOKUP_OPERATION = { ...base, principalKinds: ['business_key', 'delegation', 'user_delegation'], userExecution: 'direct', id: 'lookupOperation', name: 'operations.lookup', method: 'POST',
    path: '/api/v1/inbox/{businessId}/operations/by-idempotency-key', pathTemplate: '/api/v1/inbox/:businessId/operations/by-idempotency-key',
    requiredScopes: ['operations.read'], humanPermissions: ['inbox.view'], idempotency: 'none' } as const;
export const CANCEL_OPERATION = { ...base, principalKinds: ['business_key', 'delegation', 'user_delegation'], userExecution: 'direct', id: 'cancelOperation', name: 'operations.cancel', method: 'POST',
    path: '/api/v1/inbox/{businessId}/operations/{operationId}/cancel', pathTemplate: '/api/v1/inbox/:businessId/operations/:operationId/cancel',
    requiredScopes: ['operations.read'], humanPermissions: ['campaigns.send', 'inbox.view'], idempotency: 'required' } as const;
export function parseOperationCancellation(raw: string | Uint8Array): {
    expectedRevision: string;
} {
    const input = parseBoundedJson(raw, 1024);
    if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).length !== 1
        || typeof input.expectedRevision !== 'string' || !/^op1_[A-Za-z0-9_-]{43}$/.test(input.expectedRevision)) {
        throw new MessageSendRequestError();
    }
    return { expectedRevision: input.expectedRevision };
}
export interface OperationLookupInput {
    idempotencyKey: string;
    kind?: 'messages.send' | 'events.publish';
}
export function parseOperationLookup(raw: string | Uint8Array): OperationLookupInput {
    const input = parseBoundedJson(raw, 1024);
    if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(key => !['idempotencyKey', 'kind'].includes(key)) || !isIdempotencyKey(input.idempotencyKey)
        || input.kind !== undefined && input.kind !== 'messages.send' && input.kind !== 'events.publish')
        throw new MessageSendRequestError();
    return { idempotencyKey: input.idempotencyKey, ...(input.kind === undefined ? {} : { kind: input.kind }) };
}
export const MESSAGE_OWNER_OPERATIONS = [MESSAGE_SEND_OPERATION, MESSAGE_PREVIEW_OPERATION, GET_OPERATION, LOOKUP_OPERATION, CANCEL_OPERATION] as const;
const MESSAGE_FAILURE_FIELDS: Readonly<Record<string, string>> = {
    expiry_invalid: 'expiresAt', recipient_unavailable: 'to', recipient_ambiguous: 'to', recipient_changed: 'to',
    sender_ambiguous: 'to', sender_recipient_mismatch: 'to', channel_not_ready: 'to', blocked: 'to',
    template_not_approved: 'content.template', template_unsupported: 'content.template', template_alias_unconfigured: 'content.template',
    sender_template_mismatch: 'content.template', template_changed: 'content.template', template_locale_mismatch: 'content.locale',
    template_variables_invalid: 'content.variables', purpose_binding_required: 'purposeBinding', purpose_binding_invalid: 'purposeBinding',
    configuration_invalid: 'purposeBinding', source_unavailable: 'request', grant_inactive: 'request',
};
export function messageRequestFieldError(reason: string): PublicFieldError | null {
    return Object.hasOwn(MESSAGE_FAILURE_FIELDS, reason) ? { field: MESSAGE_FAILURE_FIELDS[reason]!, reason } : null;
}
export function safeMessageRequestErrors(value: unknown): PublicFieldError[] | null {
    if (!Array.isArray(value) || value.length < 1 || value.length > 8)
        return null;
    const result: PublicFieldError[] = [];
    for (const raw of value as unknown[]) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
            return null;
        const item = raw as Record<string, unknown>;
        if (Object.keys(item).length !== 2 || typeof item.reason !== 'string')
            return null;
        const safe = messageRequestFieldError(item.reason);
        if (!safe || safe.field !== item.field)
            return null;
        result.push(safe);
    }
    return result;
}
