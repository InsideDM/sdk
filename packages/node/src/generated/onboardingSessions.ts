// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
export const ONBOARDING_SESSION_OPERATIONS = [
    { id: 'createOnboardingSession', name: 'platform.onboarding.create', audience: 'accounts', method: 'POST', pathTemplate: '/api/v1/platform/onboarding-sessions', principalKinds: ['app'], requiredScopes: ['platform.onboarding.create'], scope: 'portfolio', idempotency: 'required' },
    { id: 'getOnboardingSession', name: 'platform.onboarding.get', audience: 'accounts', method: 'GET', pathTemplate: '/api/v1/platform/onboarding-sessions/:sessionId', principalKinds: ['app'], requiredScopes: ['platform.onboarding.create'], scope: 'portfolio', idempotency: 'none' },
] as const;
export interface CreateOnboardingSessionInput {
    businessId: string;
    provider: 'whatsapp';
    returnUrl: string;
}
export interface PublicOnboardingSession {
    id: string;
    businessId: string;
    applicationId: string;
    installationId: string;
    provider: 'whatsapp';
    purpose: 'connect';
    status: 'created' | 'authorized' | 'processing' | 'action_required' | 'completed' | 'cancelled' | 'failed' | 'expired' | 'unavailable';
    revision: string;
    expiresAt: string;
    finishExpiresAt: string | null;
    connection: {
        id: string;
        status: 'pending' | 'active' | 'paused' | 'degraded' | 'expired' | 'revoked' | 'disconnected' | 'removing';
    } | null;
}
export interface CreatedOnboardingSession extends PublicOnboardingSession {
    url: string | null;
}
export class OnboardingSessionRequestError extends Error {
    constructor() { super('The provider setup request or response is invalid.'); this.name = 'OnboardingSessionRequestError'; }
}
function fail(): never { throw new OnboardingSessionRequestError(); }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const revision = (v: unknown): v is string => typeof v === 'string' && /^[1-9]\d{0,9}$/.test(v) && Number(v) <= 2147483647;
const instant = (v: unknown): v is string => { if (typeof v !== 'string')
    return false; try {
    return new Date(v).toISOString() === v;
}
catch {
    return false;
} };
function exact(v: Record<string, unknown>, keys: readonly string[]): void { if (Object.keys(v).length !== keys.length || keys.some(key => !Object.hasOwn(v, key)))
    fail(); }
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
export function parseOnboardingSessionId(v: unknown): string { return uuid(v) ? v : fail(); }
export function parseCreateOnboardingSession(raw: string | Uint8Array): CreateOnboardingSessionInput {
    const v = parseBoundedJson(raw, 4096);
    if (!record(v))
        fail();
    exact(v, ['businessId', 'provider', 'returnUrl']);
    if (!uuid(v.businessId) || v.provider !== 'whatsapp')
        fail();
    return { businessId: v.businessId, provider: 'whatsapp', returnUrl: https(v.returnUrl) };
}
function session(v: unknown, link: boolean): PublicOnboardingSession | CreatedOnboardingSession {
    if (!record(v))
        fail();
    exact(v, ['id', 'businessId', 'applicationId', 'installationId', 'provider', 'purpose', 'status', 'revision', 'expiresAt', 'finishExpiresAt', 'connection', ...(link ? ['url'] : [])]);
    if (!uuid(v.id) || !uuid(v.businessId) || !uuid(v.applicationId) || !uuid(v.installationId) || v.provider !== 'whatsapp' || v.purpose !== 'connect'
        || !['created', 'authorized', 'processing', 'action_required', 'completed', 'cancelled', 'failed', 'expired', 'unavailable'].includes(String(v.status)) || !revision(v.revision) || !instant(v.expiresAt)
        || v.finishExpiresAt !== null && (!instant(v.finishExpiresAt) || Date.parse(v.finishExpiresAt) < Date.parse(v.expiresAt) || Date.parse(v.finishExpiresAt) > Date.parse(v.expiresAt) + 600000)
        || ['created', 'authorized'].includes(String(v.status)) && v.finishExpiresAt !== null || ['processing', 'action_required', 'completed'].includes(String(v.status)) && v.finishExpiresAt === null)
        fail();
    let connection: PublicOnboardingSession['connection'] = null;
    if (v.connection !== null) {
        if (!record(v.connection))
            fail();
        exact(v.connection, ['id', 'status']);
        if (!uuid(v.connection.id) || !['pending', 'active', 'paused', 'degraded', 'expired', 'revoked', 'disconnected', 'removing'].includes(String(v.connection.status)))
            fail();
        connection = { id: v.connection.id, status: v.connection.status as NonNullable<PublicOnboardingSession['connection']>['status'] };
    }
    const data: PublicOnboardingSession = { id: v.id, businessId: v.businessId, applicationId: v.applicationId, installationId: v.installationId, provider: 'whatsapp', purpose: 'connect',
        status: v.status as PublicOnboardingSession['status'], revision: v.revision, expiresAt: v.expiresAt, finishExpiresAt: v.finishExpiresAt as string | null, connection };
    if (!link)
        return data;
    if (!['created', 'authorized'].includes(data.status)) {
        if (v.url !== null)
            fail();
        return { ...data, url: null };
    }
    if (typeof v.url !== 'string' || v.url.length > 4096)
        fail();
    try {
        const u = new URL(v.url), fragment = new URLSearchParams(u.hash.slice(1));
        if (u.protocol !== 'https:' || u.username || u.password || u.pathname !== '/integrations/connect' || u.search || u.href !== v.url || fragment.size !== 3
            || fragment.getAll('session').length !== 1 || fragment.get('session') !== data.id || fragment.getAll('business').length !== 1 || fragment.get('business') !== data.businessId
            || fragment.getAll('token').length !== 1 || !/^[-A-Za-z0-9_]{42}[AEIMQUYcgkosw048]$/.test(fragment.get('token') ?? ''))
            fail();
    }
    catch {
        fail();
    }
    return { ...data, url: v.url };
}
export function parseOnboardingSession(v: unknown): PublicOnboardingSession { return session(v, false); }
export function parseCreatedOnboardingSession(v: unknown): CreatedOnboardingSession { return session(v, true) as CreatedOnboardingSession; }
