// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
export const BUSINESS_CREATION_OPERATIONS = [
    { id: 'createPlatformBusiness', name: 'platform.businesses.create', audience: 'accounts', method: 'POST', pathTemplate: '/api/v1/platform/businesses', principalKinds: ['app'], requiredScopes: ['platform.businesses.create'], scope: 'portfolio', idempotency: 'required' },
    { id: 'getBusinessCreation', name: 'platform.businessCreations.get', audience: 'accounts', method: 'GET', pathTemplate: '/api/v1/platform/business-creations/:creationId', principalKinds: ['app'], requiredScopes: ['platform.businesses.create'], scope: 'portfolio', idempotency: 'none' },
    { id: 'renewBusinessClaimLink', name: 'platform.businessCreations.renewClaimLink', audience: 'accounts', method: 'POST', pathTemplate: '/api/v1/platform/business-creations/:creationId/claim-link', principalKinds: ['app'], requiredScopes: ['platform.businesses.create'], scope: 'portfolio', idempotency: 'required' },
] as const;
export interface CreatePlatformBusinessInput {
    externalId: string;
    name: string;
    timeZone?: string;
    returnUrl: string;
}
export interface RenewBusinessClaimLinkInput {
    expectedRevision: string;
}
export interface PublicBusinessCreation {
    id: string;
    applicationId: string;
    businessId: string;
    externalId: string;
    status: 'needs_owner_claim' | 'owner_claimed' | 'expired' | 'unavailable';
    revision: string;
    claimExpiresAt: string;
}
export interface BusinessCreationLink extends PublicBusinessCreation {
    claimUrl: string | null;
}
export class BusinessCreationRequestError extends Error {
    constructor() { super('The business creation request or response is invalid.'); this.name = 'BusinessCreationRequestError'; }
}
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const revision = (v: unknown): v is string => typeof v === 'string' && /^[1-9]\d{0,9}$/.test(v) && Number(v) <= 2147483647;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const external = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
const label = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 120 && v === v.trim() && !/[\x00-\x1f\x7f]/.test(v);
function fail(): never { throw new BusinessCreationRequestError(); }
function exact(v: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) {
    if (required.some(k => !Object.hasOwn(v, k)) || Object.keys(v).some(k => !required.includes(k) && !optional.includes(k)))
        fail();
}
function https(v: unknown): string {
    if (typeof v !== 'string' || v.length > 2048)
        fail();
    try {
        const u = new URL(v);
        if (u.protocol !== 'https:' || u.username || u.password || u.hash || u.href !== v)
            fail();
        return v;
    }
    catch {
        return fail();
    }
}
function instant(v: unknown): v is string { if (typeof v !== 'string')
    return false; try {
    return new Date(v).toISOString() === v;
}
catch {
    return false;
} }
export function parseBusinessCreationId(v: unknown): string { return uuid(v) ? v : fail(); }
export function parseCreatePlatformBusiness(raw: string | Uint8Array): CreatePlatformBusinessInput {
    const v = parseBoundedJson(raw, 4096);
    if (!record(v))
        fail();
    exact(v, ['externalId', 'name', 'returnUrl'], ['timeZone']);
    if (!external(v.externalId) || !label(v.name))
        fail();
    const returnUrl = https(v.returnUrl);
    if (Object.hasOwn(v, 'timeZone')) {
        if (typeof v.timeZone !== 'string' || !v.timeZone.length || v.timeZone.length > 100 || v.timeZone !== v.timeZone.trim())
            fail();
        try {
            new Intl.DateTimeFormat('en', { timeZone: v.timeZone });
        }
        catch {
            fail();
        }
        return { externalId: v.externalId, name: v.name, timeZone: v.timeZone, returnUrl };
    }
    return { externalId: v.externalId, name: v.name, returnUrl };
}
export function parseRenewBusinessClaimLink(raw: string | Uint8Array): RenewBusinessClaimLinkInput {
    const v = parseBoundedJson(raw, 1024);
    if (!record(v))
        fail();
    exact(v, ['expectedRevision']);
    if (!revision(v.expectedRevision) || Number(v.expectedRevision) === 2147483647)
        fail();
    return { expectedRevision: v.expectedRevision };
}
function creation(v: unknown, link: boolean): PublicBusinessCreation | BusinessCreationLink {
    if (!record(v))
        fail();
    exact(v, ['id', 'applicationId', 'businessId', 'externalId', 'status', 'revision', 'claimExpiresAt', ...(link ? ['claimUrl'] : [])]);
    if (!uuid(v.id) || !uuid(v.applicationId) || !uuid(v.businessId) || !external(v.externalId) || !['needs_owner_claim', 'owner_claimed', 'expired', 'unavailable'].includes(String(v.status))
        || !revision(v.revision) || !instant(v.claimExpiresAt))
        fail();
    const data: PublicBusinessCreation = { id: v.id, applicationId: v.applicationId, businessId: v.businessId, externalId: v.externalId, status: v.status as PublicBusinessCreation['status'], revision: v.revision, claimExpiresAt: v.claimExpiresAt };
    if (!link)
        return data;
    if (v.status !== 'needs_owner_claim') {
        if (v.claimUrl !== null)
            fail();
        return { ...data, claimUrl: null };
    }
    if (typeof v.claimUrl !== 'string' || v.claimUrl.length > 4096)
        fail();
    try {
        const u = new URL(v.claimUrl), fragment = new URLSearchParams(u.hash.slice(1)), token = fragment.get('token');
        if (u.protocol !== 'https:' || u.username || u.password || u.pathname !== '/integrations/claim' || u.search || u.href !== v.claimUrl
            || fragment.size !== 2 || fragment.getAll('creation').length !== 1 || fragment.get('creation') !== v.id || fragment.getAll('token').length !== 1
            || typeof token !== 'string' || !/^[-A-Za-z0-9_]{42}[AEIMQUYcgkosw048]$/.test(token))
            fail();
    }
    catch {
        fail();
    }
    return { ...data, claimUrl: v.claimUrl };
}
export function parseBusinessCreation(v: unknown): PublicBusinessCreation { return creation(v, false); }
export function parseBusinessCreationLink(v: unknown): BusinessCreationLink { return creation(v, true) as BusinessCreationLink; }
