// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
export const CONSENT_PURPOSES = ['marketing', 'utility', 'service', 'loyalty', 'ad_measurement'] as const;
export type ConsentPurpose = typeof CONSENT_PURPOSES[number];
export interface WithdrawConsentInput {
    to: {
        phone: string;
    };
    purpose: ConsentPurpose;
}
export interface RecordMarketingOptInInput {
    messageId: string;
}
export interface MarketingOptInRegistration {
    contactId: string;
    identityId: string;
    channel: 'whatsapp' | 'instagram';
    purpose: 'marketing';
    status: 'granted' | 'withdrawn' | 'unknown';
    changedAt: string;
}
export interface ConsentWithdrawal {
    channel: 'whatsapp';
    purpose: ConsentPurpose;
    status: 'granted' | 'withdrawn' | 'unknown';
    changedAt: string;
}
export interface ContactConsentState {
    contactId: string;
    identities: Array<{
        identityId: string;
        channel: 'whatsapp' | 'instagram';
        handle: string;
        purposes: Array<{
            purpose: ConsentPurpose;
            status: 'granted' | 'withdrawn' | 'unknown';
            changedAt: string | null;
        }>;
    }>;
}
export const GET_CONSENT_STATE_OPERATION = {
    id: 'getConsentState', name: 'consents.get', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/contacts/consent-history', pathTemplate: '/api/v1/dashboard/:businessId/contacts/consent-history',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['consents.read'], humanPermissions: ['contacts.view'], idempotency: 'none', scope: 'workspace',
} as const;
export const WITHDRAW_CONSENT_OPERATION = {
    id: 'withdrawConsent', name: 'consents.withdraw', audience: 'conversations', method: 'POST',
    path: '/api/v1/dashboard/{businessId}/consents/withdraw', pathTemplate: '/api/v1/dashboard/:businessId/consents/withdraw',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['consents.write'], humanPermissions: ['contacts.edit'], userExecution: 'direct', idempotency: 'required', scope: 'workspace',
} as const;
export const RECORD_MARKETING_OPT_IN_OPERATION = {
    id: 'recordMarketingOptIn', name: 'consents.recordMarketingOptIn', audience: 'conversations', method: 'POST',
    path: '/api/v1/dashboard/{businessId}/consents/marketing-opt-in', pathTemplate: '/api/v1/dashboard/:businessId/consents/marketing-opt-in',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['consents.write'], humanPermissions: ['contacts.edit'], userExecution: 'direct', idempotency: 'required', scope: 'workspace',
} as const;
export class ConsentRequestError extends Error {
    constructor() { super('Provide a valid contact consent request.'); this.name = 'ConsentRequestError'; }
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function parseMarketingOptIn(raw: string | Uint8Array): RecordMarketingOptInInput {
    try {
        const input = parseBoundedJson(raw, 1024);
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1
            || typeof input.messageId !== 'string' || !uuid.test(input.messageId))
            throw new ConsentRequestError();
        return { messageId: input.messageId };
    }
    catch {
        throw new ConsentRequestError();
    }
}
export function parseMarketingOptInResponse(input: unknown): MarketingOptInRegistration {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new ConsentRequestError();
    const value = input as Record<string, unknown>;
    if (typeof value.contactId !== 'string' || !uuid.test(value.contactId) || typeof value.identityId !== 'string' || !uuid.test(value.identityId)
        || value.channel !== 'whatsapp' && value.channel !== 'instagram' || value.purpose !== 'marketing'
        || !['granted', 'withdrawn', 'unknown'].includes(String(value.status)) || typeof value.changedAt !== 'string'
        || value.changedAt.length > 64 || !Number.isFinite(Date.parse(value.changedAt)))
        throw new ConsentRequestError();
    return { contactId: value.contactId, identityId: value.identityId, channel: value.channel, purpose: 'marketing',
        status: value.status as MarketingOptInRegistration['status'], changedAt: value.changedAt };
}
export function parseConsentStateQuery(route: string): {
    contactId: string;
    view: 'messaging';
} {
    const at = route.indexOf('?'), params = new URLSearchParams(at < 0 ? '' : route.slice(at + 1));
    const contactId = params.get('contactId');
    if ([...params].length !== 2 || params.get('view') !== 'messaging' || !contactId || !uuid.test(contactId))
        throw new ConsentRequestError();
    return { contactId, view: 'messaging' };
}
export function parseContactConsentState(input: unknown): ContactConsentState {
    const record = (value: unknown): Record<string, unknown> => {
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new ConsentRequestError();
        return value as Record<string, unknown>;
    };
    const value = record(input);
    if (typeof value.contactId !== 'string' || !uuid.test(value.contactId) || !Array.isArray(value.identities) || value.identities.length > 100)
        throw new ConsentRequestError();
    const seen = new Set<string>();
    return { contactId: value.contactId, identities: value.identities.map(raw => {
            const row = record(raw);
            if (typeof row.identityId !== 'string' || !uuid.test(row.identityId) || seen.has(row.identityId)
                || row.channel !== 'whatsapp' && row.channel !== 'instagram' || typeof row.handle !== 'string' || !row.handle || row.handle.length > 256
                || !Array.isArray(row.purposes) || row.purposes.length !== CONSENT_PURPOSES.length)
                throw new ConsentRequestError();
            seen.add(row.identityId);
            const purposes = row.purposes.map(raw => {
                const decision = record(raw);
                if (!(CONSENT_PURPOSES as readonly unknown[]).includes(decision.purpose) || !['granted', 'withdrawn', 'unknown'].includes(String(decision.status))
                    || decision.changedAt !== null && (typeof decision.changedAt !== 'string' || decision.changedAt.length > 64 || !Number.isFinite(Date.parse(decision.changedAt)))
                    || decision.status !== 'unknown' && decision.changedAt === null)
                    throw new ConsentRequestError();
                return { purpose: decision.purpose as ConsentPurpose, status: decision.status as ConsentWithdrawal['status'], changedAt: decision.changedAt as string | null };
            });
            if (new Set(purposes.map(row => row.purpose)).size !== CONSENT_PURPOSES.length)
                throw new ConsentRequestError();
            return { identityId: row.identityId, channel: row.channel, handle: row.handle, purposes };
        }) };
}
export function parseConsentWithdrawal(raw: string | Uint8Array): WithdrawConsentInput {
    try {
        const input = parseBoundedJson(raw, 1024);
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 2
            || typeof input.purpose !== 'string' || !(CONSENT_PURPOSES as readonly string[]).includes(input.purpose)
            || !input.to || typeof input.to !== 'object' || Array.isArray(input.to) || Object.keys(input.to).length !== 1
            || typeof input.to.phone !== 'string' || !/^\+[1-9]\d{7,14}$/.test(input.to.phone))
            throw new ConsentRequestError();
        return { to: { phone: input.to.phone }, purpose: input.purpose as ConsentPurpose };
    }
    catch {
        throw new ConsentRequestError();
    }
}
export function parseConsentWithdrawalResponse(input: unknown): ConsentWithdrawal {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new ConsentRequestError();
    const value = input as Record<string, unknown>;
    if (value.channel !== 'whatsapp' || !(CONSENT_PURPOSES as readonly unknown[]).includes(value.purpose)
        || !['granted', 'withdrawn', 'unknown'].includes(String(value.status)) || typeof value.changedAt !== 'string'
        || value.changedAt.length > 64 || !Number.isFinite(Date.parse(value.changedAt)))
        throw new ConsentRequestError();
    return { channel: 'whatsapp', purpose: value.purpose as ConsentPurpose, status: value.status as ConsentWithdrawal['status'], changedAt: value.changedAt };
}
