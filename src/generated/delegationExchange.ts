// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
import { parsePublicScopes, type PublicScope } from './vocabulary.js';
export const CREATE_BUSINESS_DELEGATION_OPERATION = { id: 'createBusinessDelegation', name: 'platform.delegations.create', audience: 'accounts', method: 'POST',
    path: '/api/v1/platform/delegations', pathTemplate: '/api/v1/platform/delegations', principalKinds: ['app'],
    requiredScopes: ['platform.delegations.create'], scope: 'portfolio', idempotency: 'none' } as const;
export interface DelegationExchangeInput {
    businessId: string;
    scopes?: PublicScope[];
}
export interface BusinessDelegation {
    token: string;
    businessId: string;
    applicationId: string;
    installationId: string;
    authorityVersion: string;
    scopes: PublicScope[];
    expiresAt: string;
}
export class DelegationExchangeError extends Error {
    constructor() { super('The business delegation request or response is invalid.'); this.name = 'DelegationExchangeError'; }
}
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
export function parseDelegationExchange(raw: string | Uint8Array): DelegationExchangeInput {
    const value = parseBoundedJson(raw, 2048);
    if (!record(value) || Object.keys(value).some(key => !['businessId', 'scopes'].includes(key)) || typeof value.businessId !== 'string' || !UUID.test(value.businessId))
        throw new DelegationExchangeError();
    const scopes = value.scopes === undefined ? null : parsePublicScopes(value.scopes);
    if (value.scopes !== undefined && (!Array.isArray(scopes) || !scopes.length))
        throw new DelegationExchangeError();
    return { businessId: value.businessId, ...(Array.isArray(scopes) ? { scopes } : {}) };
}
export function parseBusinessDelegation(value: unknown): BusinessDelegation {
    const fields = ['token', 'businessId', 'applicationId', 'installationId', 'authorityVersion', 'scopes', 'expiresAt'];
    if (!record(value) || Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key)))
        throw new DelegationExchangeError();
    const scopes = parsePublicScopes(value.scopes);
    if (typeof value.token !== 'string' || !/^idmd_[A-Za-z0-9_-]{16}_[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value.token)
        || ['businessId', 'applicationId', 'installationId'].some(key => typeof value[key] !== 'string' || !UUID.test(value[key] as string))
        || typeof value.authorityVersion !== 'string' || !/^[1-9]\d{0,9}$/.test(value.authorityVersion) || Number(value.authorityVersion) > 2147483647
        || !Array.isArray(scopes) || !scopes.length || typeof value.expiresAt !== 'string'
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expiresAt) || !Number.isFinite(Date.parse(value.expiresAt))
        || new Date(value.expiresAt).toISOString() !== value.expiresAt)
        throw new DelegationExchangeError();
    return { token: value.token, businessId: value.businessId as string, applicationId: value.applicationId as string, installationId: value.installationId as string,
        authorityVersion: value.authorityVersion, scopes, expiresAt: value.expiresAt };
}
