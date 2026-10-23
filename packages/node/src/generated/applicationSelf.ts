// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseMachinePublicScopes, type MachinePublicScope } from './vocabulary.js';
import { parsePartnerPlatformScopes, type PartnerPlatformScope } from './partnerScopes.js';
export const GET_APPLICATION_SELF_OPERATION = { id: 'getApplicationSelf', name: 'platform.self.get', audience: 'accounts', method: 'GET',
    path: '/api/v1/platform/self', pathTemplate: '/api/v1/platform/self', principalKinds: ['app'], requiredScopes: [], allowAnyLiveApplication: true, scope: 'portfolio', idempotency: 'none' } as const;
export interface PublicApplicationSelf {
    application: {
        id: string;
        name: string;
        status: 'active';
    };
    partner: {
        id: string;
        name: string;
    };
    scopes: PartnerPlatformScope[];
    maximumBusinessScopes: MachinePublicScope[];
    returnUrls: string[];
    credentialExpiresAt: string;
}
export class ApplicationSelfError extends Error {
    constructor() { super('The application configuration response is invalid.'); this.name = 'ApplicationSelfError'; }
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const name = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 512;
function exact(value: Record<string, unknown>, fields: readonly string[]) { if (Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key)))
    throw new ApplicationSelfError(); }
export function parseApplicationSelf(value: unknown): PublicApplicationSelf {
    if (!record(value) || !record(value.application) || !record(value.partner))
        throw new ApplicationSelfError();
    exact(value, ['application', 'partner', 'scopes', 'maximumBusinessScopes', 'returnUrls', 'credentialExpiresAt']);
    exact(value.application, ['id', 'name', 'status']);
    exact(value.partner, ['id', 'name']);
    const scopes = Array.isArray(value.scopes) && value.scopes.length === 0 ? [] : parsePartnerPlatformScopes(value.scopes), maximum = parseMachinePublicScopes(value.maximumBusinessScopes);
    if (!uuid(value.application.id) || !name(value.application.name) || value.application.status !== 'active' || !uuid(value.partner.id) || !name(value.partner.name)
        || !scopes || !Array.isArray(maximum) || !maximum.length || !Array.isArray(value.returnUrls) || value.returnUrls.length > 20 || new Set(value.returnUrls).size !== value.returnUrls.length
        || typeof value.credentialExpiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.credentialExpiresAt)
        || !Number.isFinite(Date.parse(value.credentialExpiresAt)) || new Date(value.credentialExpiresAt).toISOString() !== value.credentialExpiresAt)
        throw new ApplicationSelfError();
    const returnUrls = value.returnUrls.map(raw => {
        try {
            if (typeof raw !== 'string' || raw.length > 2048)
                throw new Error();
            const url = new URL(raw);
            if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.href !== raw)
                throw new Error();
            return raw;
        }
        catch {
            throw new ApplicationSelfError();
        }
    });
    return { application: { id: value.application.id, name: value.application.name, status: 'active' }, partner: { id: value.partner.id, name: value.partner.name },
        scopes, maximumBusinessScopes: maximum, returnUrls, credentialExpiresAt: value.credentialExpiresAt };
}
