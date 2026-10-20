// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export const GET_PARTNER_API_USAGE_OPERATION = { id: 'getPartnerApiUsage', name: 'platform.usage.get', audience: 'accounts', method: 'GET',
    pathTemplate: '/api/v1/platform/businesses/:businessId/usage', principalKinds: ['app'], requiredScopes: ['platform.usage.read'], scope: 'portfolio', idempotency: 'none' } as const;
export const API_USAGE_MAX_DAY_RANGE_DAYS = 31;
export const API_USAGE_MAX_MINUTE_RANGE_MS = 86400000;
export interface PartnerUsageQuery {
    granularity?: 'day' | 'minute';
    from?: string;
    to?: string;
}
export interface PublicPartnerApiUsage {
    businessId: string;
    applicationId: string;
    installation: {
        id: string;
        status: 'active' | 'revoked' | 'suspended';
    };
    meter: 'api_requests';
    unit: 'requests';
    basis: 'telemetry';
    timeZone: 'UTC';
    granularity: 'day' | 'minute';
    from: string;
    to: string;
    totalAdmitted: number;
    totalRefused: number;
    points: Array<{
        bucketStart: string;
        admitted: number;
        refused: number;
    }>;
    freshness: {
        source: 'batched_public_api_counters';
        observedAt: string;
        retainedSince: string;
        latestRecordedMinute: string | null;
    };
}
export class PartnerUsageRequestError extends Error {
    constructor() { super('The application usage request or response is invalid.'); this.name = 'PartnerUsageRequestError'; }
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
function exact(value: Record<string, unknown>, fields: readonly string[]) { if (Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key)))
    throw new PartnerUsageRequestError(); }
export function normalizeUsageInstant(value: unknown): string {
    if (typeof value !== 'string' || value.length > 40)
        throw new PartnerUsageRequestError();
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2}))?$/.exec(value);
    if (!match)
        throw new PartnerUsageRequestError();
    const datePart = value.slice(0, 10), calendar = new Date(datePart + 'T00:00:00.000Z');
    if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== datePart || match[4] !== undefined && (+match[4] > 23 || +match[5]! > 59 || +match[6]! > 59))
        throw new PartnerUsageRequestError();
    const parsed = new Date(match[4] === undefined ? datePart + 'T00:00:00.000Z' : value);
    if (!Number.isFinite(parsed.getTime()))
        throw new PartnerUsageRequestError();
    const normalized = parsed.toISOString();
    if (!/^\d{4}-/.test(normalized))
        throw new PartnerUsageRequestError();
    return normalized;
}
export function capturePartnerUsageQuery(value: unknown): PartnerUsageQuery {
    if (!record(value) || Object.keys(value).some(key => !['from', 'to', 'granularity'].includes(key))
        || value.granularity !== undefined && (typeof value.granularity !== 'string' || !['day', 'minute'].includes(value.granularity)))
        throw new PartnerUsageRequestError();
    const granularity = value.granularity as PartnerUsageQuery['granularity'], from = value.from === undefined ? undefined : normalizeUsageInstant(value.from), to = value.to === undefined ? undefined : normalizeUsageInstant(value.to);
    const unit = granularity === 'minute' ? 60000 : 86400000, max = granularity === 'minute' ? API_USAGE_MAX_MINUTE_RANGE_MS : API_USAGE_MAX_DAY_RANGE_DAYS * unit;
    if (from !== undefined && Date.parse(from) % unit !== 0 || to !== undefined && Date.parse(to) % unit !== 0 || from !== undefined && to !== undefined && (Date.parse(to) <= Date.parse(from) || Date.parse(to) - Date.parse(from) > max))
        throw new PartnerUsageRequestError();
    return { ...(granularity !== undefined ? { granularity } : {}), ...(from !== undefined ? { from } : {}), ...(to !== undefined ? { to } : {}) };
}
export function parsePartnerUsageQuery(query: URLSearchParams): PartnerUsageQuery {
    if ([...query.keys()].some(key => !['from', 'to', 'granularity'].includes(key)) || ['from', 'to', 'granularity'].some(key => query.getAll(key).length > 1))
        throw new PartnerUsageRequestError();
    return capturePartnerUsageQuery(Object.fromEntries(query));
}
export function parsePartnerApiUsage(value: unknown): PublicPartnerApiUsage {
    if (!record(value) || !record(value.installation) || !record(value.freshness) || !Array.isArray(value.points) || value.points.length > 1440)
        throw new PartnerUsageRequestError();
    exact(value, ['businessId', 'applicationId', 'installation', 'meter', 'unit', 'basis', 'timeZone', 'granularity', 'from', 'to', 'totalAdmitted', 'totalRefused', 'points', 'freshness']);
    exact(value.installation, ['id', 'status']);
    exact(value.freshness, ['source', 'observedAt', 'retainedSince', 'latestRecordedMinute']);
    if (!uuid(value.businessId) || !uuid(value.applicationId) || !uuid(value.installation.id) || !['active', 'revoked', 'suspended'].includes(String(value.installation.status))
        || value.meter !== 'api_requests' || value.unit !== 'requests' || value.basis !== 'telemetry' || value.timeZone !== 'UTC' || !['day', 'minute'].includes(String(value.granularity))
        || !count(value.totalAdmitted) || !count(value.totalRefused) || value.freshness.source !== 'batched_public_api_counters')
        throw new PartnerUsageRequestError();
    const granularity = value.granularity as 'day' | 'minute', query = capturePartnerUsageQuery({ granularity, from: value.from, to: value.to });
    if (query.from === undefined || query.to === undefined || query.from !== value.from || query.to !== value.to)
        throw new PartnerUsageRequestError();
    const observedAt = normalizeUsageInstant(value.freshness.observedAt), retainedSince = normalizeUsageInstant(value.freshness.retainedSince);
    const unit = granularity === 'day' ? 86400000 : 60000, from = Date.parse(query.from), to = Date.parse(query.to);
    if (to > Math.floor(Date.parse(observedAt) / unit) * unit || from < Date.parse(retainedSince) || value.points.length !== (to - from) / unit)
        throw new PartnerUsageRequestError();
    let admitted = 0, refused = 0;
    const points = value.points.map((point, index) => {
        if (!record(point))
            throw new PartnerUsageRequestError();
        exact(point, ['bucketStart', 'admitted', 'refused']);
        const at = normalizeUsageInstant(point.bucketStart);
        if (Date.parse(at) !== from + index * unit || !count(point.admitted) || !count(point.refused))
            throw new PartnerUsageRequestError();
        admitted += point.admitted;
        refused += point.refused;
        return { bucketStart: at, admitted: point.admitted, refused: point.refused };
    });
    if (admitted !== value.totalAdmitted || refused !== value.totalRefused)
        throw new PartnerUsageRequestError();
    const latest = value.freshness.latestRecordedMinute === null ? null : normalizeUsageInstant(value.freshness.latestRecordedMinute);
    if (latest !== null && (Date.parse(latest) < from || Date.parse(latest) >= to || Date.parse(latest) % 60000 !== 0))
        throw new PartnerUsageRequestError();
    return { businessId: value.businessId, applicationId: value.applicationId, installation: { id: value.installation.id, status: value.installation.status as 'active' | 'revoked' | 'suspended' },
        meter: 'api_requests', unit: 'requests', basis: 'telemetry', timeZone: 'UTC', granularity, from: query.from, to: query.to, totalAdmitted: admitted, totalRefused: refused, points,
        freshness: { source: 'batched_public_api_counters', observedAt, retainedSince, latestRecordedMinute: latest } };
}
