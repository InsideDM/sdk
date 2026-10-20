// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parsePublicInstallation, type PublicInstallation } from './installations.js';
export const PARTNER_PORTFOLIO_OPERATIONS = [
    { id: 'listPlatformBusinesses', name: 'platform.businesses.list', audience: 'accounts', method: 'GET', path: '/api/v1/platform/businesses', pathTemplate: '/api/v1/platform/businesses', principalKinds: ['app'], requiredScopes: ['platform.businesses.read'], scope: 'portfolio', idempotency: 'none' },
    { id: 'getPlatformBusiness', name: 'platform.businesses.get', audience: 'accounts', method: 'GET', pathTemplate: '/api/v1/platform/businesses/:businessId', principalKinds: ['app'], requiredScopes: ['platform.businesses.read'], scope: 'portfolio', idempotency: 'none' },
] as const;
export interface PartnerBusinessListParams {
    limit?: number;
    cursor?: string;
}
export interface PublicPartnerBusiness {
    id: string;
    name: string;
    status: 'active' | 'suspended';
    timeZone: string;
    installation: PublicInstallation;
}
export interface PartnerBusinessPage {
    data: PublicPartnerBusiness[];
    page: {
        nextCursor: string | null;
    };
}
export class PartnerPortfolioRequestError extends Error {
    constructor() { super('The application portfolio request or response is invalid.'); this.name = 'PartnerPortfolioRequestError'; }
}
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function exact(value: Record<string, unknown>, fields: readonly string[]) { if (Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key)))
    throw new PartnerPortfolioRequestError(); }
export function parsePortfolioBusinessId(value: unknown): string { if (!uuid(value))
    throw new PartnerPortfolioRequestError(); return value; }
export function parsePartnerBusinessQuery(query: URLSearchParams): PartnerBusinessListParams {
    if ([...query.keys()].some(key => !['limit', 'cursor'].includes(key)) || query.getAll('limit').length > 1 || query.getAll('cursor').length > 1)
        throw new PartnerPortfolioRequestError();
    const limit = query.get('limit'), cursor = query.get('cursor');
    if (limit !== null && (!/^[1-9]\d?$/.test(limit) || Number(limit) > 50) || cursor !== null && (cursor.length < 1 || cursor.length > 2048 || !/^[\x21-\x7e]+$/.test(cursor)))
        throw new PartnerPortfolioRequestError();
    return { ...(limit !== null ? { limit: Number(limit) } : {}), ...(cursor !== null ? { cursor } : {}) };
}
export function parsePartnerBusiness(value: unknown): PublicPartnerBusiness {
    if (!record(value))
        throw new PartnerPortfolioRequestError();
    exact(value, ['id', 'name', 'status', 'timeZone', 'installation']);
    if (!uuid(value.id) || typeof value.name !== 'string' || value.name.trim().length < 1 || value.name.length > 512 || !['active', 'suspended'].includes(String(value.status))
        || typeof value.timeZone !== 'string' || value.timeZone.trim().length < 1 || value.timeZone.length > 128)
        throw new PartnerPortfolioRequestError();
    const installation = parsePublicInstallation(value.installation);
    if (installation.businessId !== value.id || installation.status !== 'active')
        throw new PartnerPortfolioRequestError();
    return { id: value.id, name: value.name, status: value.status as PublicPartnerBusiness['status'], timeZone: value.timeZone, installation };
}
export function parsePartnerBusinessPage(value: unknown): PartnerBusinessPage {
    if (!record(value) || !Array.isArray(value.data) || value.data.length > 50 || !record(value.page))
        throw new PartnerPortfolioRequestError();
    exact(value, ['data', 'page']);
    exact(value.page, ['nextCursor']);
    const nextCursor = value.page.nextCursor;
    if (nextCursor !== null && (typeof nextCursor !== 'string' || nextCursor.length < 1 || nextCursor.length > 2048 || !/^[\x21-\x7e]+$/.test(nextCursor)))
        throw new PartnerPortfolioRequestError();
    const data = value.data.map(parsePartnerBusiness);
    if (new Set(data.map(row => row.id)).size !== data.length || data.some(row => row.installation.applicationId !== data[0]!.installation.applicationId))
        throw new PartnerPortfolioRequestError();
    return { data, page: { nextCursor } };
}
