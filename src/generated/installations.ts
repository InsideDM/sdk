// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
import { parsePublicScopes, type PublicScope } from './vocabulary.js';
export const INSTALLATION_OPERATIONS = [
    { id: 'getInstallation', name: 'platform.installations.get', audience: 'accounts', method: 'GET', pathTemplate: '/api/v1/platform/installations/:installationId', principalKinds: ['app'], requiredScopes: ['platform.businesses.read'], scope: 'portfolio', idempotency: 'none' },
    { id: 'revokeInstallation', name: 'platform.installations.revoke', audience: 'accounts', method: 'POST', pathTemplate: '/api/v1/platform/installations/:installationId/revoke', principalKinds: ['app'], requiredScopes: ['platform.installations.manage'], scope: 'portfolio', idempotency: 'required' },
] as const;
export type InstallationRevocationReason = 'requested' | 'security' | 'service_ended';
export interface RevokeInstallationInput {
    expectedRevision: string;
    reason: InstallationRevocationReason;
}
export interface PublicInstallation {
    id: string;
    businessId: string;
    applicationId: string;
    status: 'active' | 'revoked' | 'suspended';
    scopes: PublicScope[];
    authorityVersion: string;
    revision: string;
}
export class PublicInstallationError extends Error {
    constructor() { super('The application installation request or response is invalid.'); this.name = 'PublicInstallationError'; }
}
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const revision = (value: unknown): value is string => typeof value === 'string' && /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 2147483647;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function exact(value: Record<string, unknown>, fields: readonly string[]) { if (Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key)))
    throw new PublicInstallationError(); }
export function parseInstallationId(value: unknown): string { if (!uuid(value))
    throw new PublicInstallationError(); return value; }
export function parseInstallationRevoke(raw: string | Uint8Array): RevokeInstallationInput {
    const value = parseBoundedJson(raw, 2048);
    if (!record(value))
        throw new PublicInstallationError();
    exact(value, ['expectedRevision', 'reason']);
    if (!revision(value.expectedRevision) || !['requested', 'security', 'service_ended'].includes(String(value.reason)))
        throw new PublicInstallationError();
    return { expectedRevision: value.expectedRevision, reason: value.reason as InstallationRevocationReason };
}
export function parsePublicInstallation(value: unknown): PublicInstallation {
    if (!record(value))
        throw new PublicInstallationError();
    exact(value, ['id', 'businessId', 'applicationId', 'status', 'scopes', 'authorityVersion', 'revision']);
    const scopes = parsePublicScopes(value.scopes);
    if (!uuid(value.id) || !uuid(value.businessId) || !uuid(value.applicationId) || !['active', 'revoked', 'suspended'].includes(String(value.status))
        || !revision(value.revision) || !revision(value.authorityVersion) || !Array.isArray(scopes) || !scopes.length)
        throw new PublicInstallationError();
    return { id: value.id, businessId: value.businessId, applicationId: value.applicationId, status: value.status as PublicInstallation['status'], scopes, authorityVersion: value.authorityVersion, revision: value.revision };
}
