// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
import { parseMachinePublicScopes, type MachinePublicScope } from './vocabulary.js';
export const INSTALLATION_REQUEST_OPERATIONS = [
    { id: 'createInstallationRequest', name: 'platform.installationRequests.create', audience: 'accounts', method: 'POST', path: '/api/v1/platform/installation-requests', pathTemplate: '/api/v1/platform/installation-requests', principalKinds: ['app'], requiredScopes: ['platform.businesses.link'], scope: 'portfolio', idempotency: 'required' },
    { id: 'getInstallationRequest', name: 'platform.installationRequests.get', audience: 'accounts', method: 'GET', pathTemplate: '/api/v1/platform/installation-requests/:requestId', principalKinds: ['app'], requiredScopes: ['platform.businesses.link'], scope: 'portfolio', idempotency: 'none' },
] as const;
export interface CreateInstallationRequestInput {
    scopes: MachinePublicScope[];
    returnUrl: string;
}
export interface PublicInstallationRequest {
    id: string;
    applicationId: string;
    status: 'pending' | 'approved' | 'cancelled' | 'expired' | 'unavailable';
    scopes: MachinePublicScope[];
    expiresAt: string;
    result: {
        businessId: string;
        installationId: string;
    } | null;
}
export interface CreatedInstallationRequest extends PublicInstallationRequest {
    authorizationUrl: string | null;
}
export class InstallationRequestError extends Error {
    constructor() { super('The application access request or response is invalid.'); this.name = 'InstallationRequestError'; }
}
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function exact(value: Record<string, unknown>, fields: readonly string[]) { if (Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key)))
    throw new InstallationRequestError(); }
function scopesOf(value: unknown): MachinePublicScope[] { const parsed = parseMachinePublicScopes(value); if (!Array.isArray(parsed) || !parsed.length)
    throw new InstallationRequestError(); return parsed; }
function https(value: unknown, max: number): URL {
    try {
        if (typeof value !== 'string' || value.length > max)
            throw new Error();
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || url.href !== value)
            throw new Error();
        return url;
    }
    catch {
        throw new InstallationRequestError();
    }
}
export function parseCreateInstallationRequest(raw: string | Uint8Array): CreateInstallationRequestInput {
    const value = parseBoundedJson(raw, 4096);
    if (!record(value))
        throw new InstallationRequestError();
    exact(value, ['scopes', 'returnUrl']);
    const returnUrl = https(value.returnUrl, 2048);
    if (returnUrl.hash)
        throw new InstallationRequestError();
    return { scopes: scopesOf(value.scopes), returnUrl: returnUrl.href };
}
export function parseInstallationRequestId(value: unknown): string { if (!uuid(value))
    throw new InstallationRequestError(); return value; }
export function parseInstallationRequest(value: unknown): PublicInstallationRequest {
    if (!record(value))
        throw new InstallationRequestError();
    exact(value, ['id', 'applicationId', 'status', 'scopes', 'expiresAt', 'result']);
    if (!uuid(value.id) || !uuid(value.applicationId) || !['pending', 'approved', 'cancelled', 'expired', 'unavailable'].includes(String(value.status))
        || typeof value.expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expiresAt)
        || !Number.isFinite(Date.parse(value.expiresAt)) || new Date(value.expiresAt).toISOString() !== value.expiresAt)
        throw new InstallationRequestError();
    let result: PublicInstallationRequest['result'] = null;
    if (value.status === 'approved') {
        if (!record(value.result))
            throw new InstallationRequestError();
        exact(value.result, ['businessId', 'installationId']);
        if (!uuid(value.result.businessId) || !uuid(value.result.installationId))
            throw new InstallationRequestError();
        result = { businessId: value.result.businessId, installationId: value.result.installationId };
    }
    else if (value.result !== null)
        throw new InstallationRequestError();
    return { id: value.id, applicationId: value.applicationId, status: value.status as PublicInstallationRequest['status'], scopes: scopesOf(value.scopes), expiresAt: value.expiresAt, result };
}
export function parseCreatedInstallationRequest(value: unknown): CreatedInstallationRequest {
    if (!record(value))
        throw new InstallationRequestError();
    const { authorizationUrl, ...rest } = value, request = parseInstallationRequest(rest);
    if (request.status !== 'pending') {
        if (authorizationUrl !== null)
            throw new InstallationRequestError();
        return { ...request, authorizationUrl: null };
    }
    const url = https(authorizationUrl, 2304), fragment = new URLSearchParams(url.hash.slice(1));
    if (url.pathname !== '/integrations/authorize' || url.search || [...fragment].length !== 2 || fragment.getAll('request').length !== 1
        || fragment.get('request') !== request.id || fragment.getAll('token').length !== 1 || !/^[-A-Za-z0-9_]{42}[AEIMQUYcgkosw048]$/.test(fragment.get('token') ?? ''))
        throw new InstallationRequestError();
    return { ...request, authorizationUrl: url.href };
}
