// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { ANALYTICS_CHANNELS, ANALYTICS_RANGES, type BusinessAnalyticsQuery } from './analyticsTypes.js';
import { decodeContract } from './contractCodec.js';
import { ANALYTICS_SCHEMAS } from './analyticsSchemas.js';
import type { BusinessAnalyticsReport } from './analyticsTypes.js';
export function parseBusinessAnalyticsReport(input: unknown): BusinessAnalyticsReport {
    return decodeContract({ $ref: '#/components/schemas/BusinessAnalyticsReport' }, input, { schemas: ANALYTICS_SCHEMAS }) as BusinessAnalyticsReport;
}
export const GET_BUSINESS_ANALYTICS_OPERATION = {
    id: 'getBusinessAnalytics', name: 'analytics.get', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/analytics', pathTemplate: '/api/v1/dashboard/:businessId/analytics',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['analytics.read'],
    humanPermissions: ['analytics.view'], idempotency: 'none', scope: 'workspace',
} as const;
export class AnalyticsQueryError extends Error {
    constructor() { super('Choose a supported channel and calendar range; custom ranges require valid start and end dates.'); }
}
export function parseBusinessAnalyticsQuery(route: string): BusinessAnalyticsQuery {
    const params = new URL(route, 'https://api.insidedm.io').searchParams;
    if ([...params.keys()].some(key => !['channel', 'range', 'start', 'end'].includes(key))
        || [...params.keys()].some(key => params.getAll(key).length !== 1))
        throw new AnalyticsQueryError();
    const channel = params.get('channel') ?? 'all', range = params.get('range') ?? 'month';
    if (!(ANALYTICS_CHANNELS as readonly string[]).includes(channel) || !(ANALYTICS_RANGES as readonly string[]).includes(range)) {
        throw new AnalyticsQueryError();
    }
    const start = params.get('start'), end = params.get('end');
    try {
        if (range === 'custom') {
            decodeContract({ type: 'string', format: 'date' }, start);
            decodeContract({ type: 'string', format: 'date' }, end);
            if (start! > end!)
                throw new AnalyticsQueryError();
        }
        else if (start !== null || end !== null)
            throw new AnalyticsQueryError();
    }
    catch {
        throw new AnalyticsQueryError();
    }
    return { channel: channel as BusinessAnalyticsQuery['channel'], range: range as BusinessAnalyticsQuery['range'],
        ...(start === null ? {} : { start }), ...(end === null ? {} : { end }) };
}
