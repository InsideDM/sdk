// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export interface SoftwareUsageQuery {
    from: string;
    to: string;
}
export interface SoftwareUsageSummary {
    businessId: string;
    attribution: 'business';
    period: SoftwareUsageQuery;
    timeBasis: 'dispatch_admitted_at';
    source: 'retained_ai_dispatch_observation_receipts';
    meterVersion: '1';
    asOf: string;
    finality: 'provisional';
    ai: {
        calls: number;
        inputTokens: number;
        outputTokens: number;
    };
}
export interface SoftwareLimits {
    businessId: string;
    source: 'current_plan_in_force';
    asOf: string;
    plan: {
        code: string;
        versionId: string;
        entitlementProfileVersion: string;
    };
    limits: {
        agentSlots: number | 'all';
        seats: number;
        conversations: {
            quantity: number;
            period: 'month';
            enforcement: 'soft';
        };
        includedAi: {
            amountMinor: string;
            currency: 'INR';
            unit: 'paise';
            period: 'month';
        };
    };
}
export type SoftwareUsageView = {
    view: 'software_usage';
    query: SoftwareUsageQuery;
} | {
    view: 'software_limits';
};
export const GET_SOFTWARE_USAGE_OPERATION = {
    id: 'getSoftwareUsage', name: 'usage.get', audience: 'conversations', method: 'GET',
    path: '/api/v1/dashboard/{businessId}/billing/v2',
    pathTemplate: '/api/v1/dashboard/:businessId/billing/v2',
    principalKinds: ['business_key', 'delegation'], requiredScopes: ['usage.read'],
    humanPermissions: ['billing.view'], scope: 'workspace', idempotency: 'none',
} as const;
export const SOFTWARE_USAGE_MAX_PERIOD_DAYS = 31;
export const SOFTWARE_USAGE_MAX_HISTORY_DAYS = 365;
const DAY_MS = 86400000;
export class SoftwareUsageRequestError extends Error {
    constructor() { super('Use a supported software usage or limits view; usage needs an explicit UTC interval of at most 31 days within the past year.'); this.name = 'SoftwareUsageRequestError'; }
}
function instant(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))
        throw new SoftwareUsageRequestError();
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z'))
        throw new SoftwareUsageRequestError();
    return date.toISOString();
}
export function captureSoftwareUsageQuery(input: SoftwareUsageQuery): SoftwareUsageQuery {
    if (!input || Object.keys(input).length !== 2 || !Object.hasOwn(input, 'from') || !Object.hasOwn(input, 'to'))
        throw new SoftwareUsageRequestError();
    const from = instant(input.from), to = instant(input.to), span = Date.parse(to) - Date.parse(from);
    if (span <= 0 || span > SOFTWARE_USAGE_MAX_PERIOD_DAYS * DAY_MS)
        throw new SoftwareUsageRequestError();
    return { from, to };
}
export function validateSoftwareUsageHistory(query: SoftwareUsageQuery, now: Date): void {
    const time = now.getTime();
    if (!Number.isFinite(time) || Date.parse(query.from) < time - SOFTWARE_USAGE_MAX_HISTORY_DAYS * DAY_MS || Date.parse(query.to) > time)
        throw new SoftwareUsageRequestError();
}
export function parseSoftwareUsageQuery(route: string): SoftwareUsageQuery {
    const at = route.indexOf('?'), params = new URLSearchParams(at < 0 ? '' : route.slice(at + 1));
    if ([...params].length !== 3 || params.get('view') !== 'software_usage'
        || [...params.keys()].some(key => !['view', 'from', 'to'].includes(key) || params.getAll(key).length !== 1))
        throw new SoftwareUsageRequestError();
    return captureSoftwareUsageQuery({ from: params.get('from')!, to: params.get('to')! });
}
export function parseSoftwareUsageView(route: string): SoftwareUsageView {
    const at = route.indexOf('?'), params = new URLSearchParams(at < 0 ? '' : route.slice(at + 1));
    if (params.get('view') === 'software_limits') {
        if ([...params].length !== 1)
            throw new SoftwareUsageRequestError();
        return { view: 'software_limits' };
    }
    return { view: 'software_usage', query: parseSoftwareUsageQuery(route) };
}
export function parseSoftwareLimits(input: unknown): SoftwareLimits {
    const record = (value: unknown): Record<string, unknown> => {
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new SoftwareUsageRequestError();
        return value as Record<string, unknown>;
    };
    const root = record(input), plan = record(root.plan), limits = record(root.limits), conversations = record(limits.conversations), ai = record(limits.includedAi);
    const positive = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 1;
    if (typeof root.businessId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(root.businessId)
        || root.source !== 'current_plan_in_force' || typeof plan.code !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(plan.code)
        || [plan.versionId, plan.entitlementProfileVersion].some(value => typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value))
        || limits.agentSlots !== 'all' && !positive(limits.agentSlots) || !positive(limits.seats) || !positive(conversations.quantity)
        || conversations.period !== 'month' || conversations.enforcement !== 'soft' || ai.currency !== 'INR' || ai.unit !== 'paise' || ai.period !== 'month'
        || typeof ai.amountMinor !== 'string' || !/^(?:0|[1-9]\d{0,14})$/.test(ai.amountMinor))
        throw new SoftwareUsageRequestError();
    return { businessId: root.businessId, source: 'current_plan_in_force', asOf: instant(root.asOf),
        plan: { code: plan.code, versionId: plan.versionId as string, entitlementProfileVersion: plan.entitlementProfileVersion as string },
        limits: { agentSlots: limits.agentSlots as number | 'all', seats: limits.seats as number,
            conversations: { quantity: conversations.quantity as number, period: 'month', enforcement: 'soft' },
            includedAi: { amountMinor: ai.amountMinor, currency: 'INR', unit: 'paise', period: 'month' } } };
}
export function parseSoftwareUsageSummary(input: unknown): SoftwareUsageSummary {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new SoftwareUsageRequestError();
    const value = input as Record<string, unknown>, ai = value.ai as Record<string, unknown> | null;
    if (typeof value.businessId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.businessId)
        || value.attribution !== 'business' || value.timeBasis !== 'dispatch_admitted_at' || value.source !== 'retained_ai_dispatch_observation_receipts'
        || value.meterVersion !== '1' || value.finality !== 'provisional' || !ai || typeof ai !== 'object' || Array.isArray(ai)
        || ![ai.calls, ai.inputTokens, ai.outputTokens].every(n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0)
        || !Number.isSafeInteger(Number(ai.inputTokens) + Number(ai.outputTokens)))
        throw new SoftwareUsageRequestError();
    const period = captureSoftwareUsageQuery(value.period as SoftwareUsageQuery), asOf = instant(value.asOf);
    if (Date.parse(period.to) > Date.parse(asOf))
        throw new SoftwareUsageRequestError();
    return { businessId: value.businessId, attribution: 'business', period, timeBasis: 'dispatch_admitted_at',
        source: 'retained_ai_dispatch_observation_receipts', meterVersion: '1', asOf, finality: 'provisional',
        ai: { calls: ai.calls as number, inputTokens: ai.inputTokens as number, outputTokens: ai.outputTokens as number } };
}
