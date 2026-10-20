// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { DEVELOPER_EVENT_TYPES, type DeveloperSubscriptionEventType } from './vocabulary.js';
import { parseBoundedJson } from './boundedJson.js';
export const PARTNER_SUBSCRIPTION_DIAGNOSTIC_OPERATIONS = [
    { id: 'getPlatformSubscriptionHealth', name: 'platform.subscriptions.getHealth', method: 'GET', pathTemplate: '/api/v1/platform/subscriptions/:subscriptionId/businesses/:businessId/health', idempotency: 'none' },
    { id: 'listPlatformSubscriptionDeliveries', name: 'platform.subscriptions.deliveries.list', method: 'GET', pathTemplate: '/api/v1/platform/subscriptions/:subscriptionId/businesses/:businessId/deliveries', idempotency: 'none' },
    { id: 'getPlatformSubscriptionDelivery', name: 'platform.subscriptions.deliveries.get', method: 'GET', pathTemplate: '/api/v1/platform/subscriptions/:subscriptionId/businesses/:businessId/deliveries/:deliveryId', idempotency: 'none' },
    { id: 'replayPlatformSubscriptionDelivery', name: 'platform.subscriptions.deliveries.replay', method: 'POST', pathTemplate: '/api/v1/platform/subscriptions/:subscriptionId/businesses/:businessId/deliveries/:deliveryId/replay', idempotency: 'required' },
    { id: 'recoverPlatformSubscriptionReceiver', name: 'platform.subscriptions.recover', method: 'POST', pathTemplate: '/api/v1/platform/subscriptions/:subscriptionId/businesses/:businessId/recover', idempotency: 'required' },
] as const;
export const PARTNER_DELIVERY_STATUSES = ['pending', 'processing', 'retrying', 'delivered', 'failed', 'cancelled'] as const;
export const PARTNER_DELIVERY_REPLAY_REASONS = ['receiver_recovered', 'receiver_configuration_fixed', 'transient_failure_resolved', 'support_directed'] as const;
export type PartnerDeliveryStatus = typeof PARTNER_DELIVERY_STATUSES[number];
export type PartnerDeliveryReplayReason = typeof PARTNER_DELIVERY_REPLAY_REASONS[number];
export interface PartnerDeliveryListParams {
    limit?: number;
    cursor?: string;
    from?: string;
    to?: string;
    status?: PartnerDeliveryStatus;
    eventType?: DeveloperSubscriptionEventType;
}
export interface ReplayPartnerDeliveryInput {
    reason: PartnerDeliveryReplayReason;
}
export interface RecoverPartnerReceiverInput {
    expectedRevision: string;
}
export interface PartnerDeliveryAttempt {
    at: string;
    outcome: 'delivered' | 'retry' | 'failed' | 'skipped';
    statusCode: number | null;
    error: string | null;
}
export interface PartnerWebhookDelivery {
    id: string;
    deliveryId: string;
    eventId: string;
    eventType: DeveloperSubscriptionEventType;
    resource: {
        type: 'contact' | 'conversation' | 'message' | 'order' | 'shipment' | 'operation';
        id: string;
    } | null;
    kind: 'automatic' | 'manual_replay';
    status: PartnerDeliveryStatus;
    attemptCount: number;
    nextAttemptAt: string | null;
    lastAttemptAt: string | null;
    deliveredAt: string | null;
    lastHttpStatus: number | null;
    lastError: string | null;
    createdAt: string;
    replayOf: string | null;
    replayableUntil: string;
    replayCount: number;
    replayPending: boolean;
    replayable: boolean;
}
export interface PartnerWebhookDeliveryDetail extends PartnerWebhookDelivery {
    attempts: PartnerDeliveryAttempt[];
}
export interface PartnerDeliveryContext {
    applicationId: string;
    subscriptionId: string;
    businessId: string;
}
export interface PartnerDeliveryPage extends PartnerDeliveryContext {
    deliveries: PartnerWebhookDelivery[];
    nextCursor: string | null;
}
export interface PartnerDeliveryResult extends PartnerDeliveryContext {
    delivery: PartnerWebhookDelivery;
}
export interface PartnerDeliveryDetailResult extends PartnerDeliveryContext {
    delivery: PartnerWebhookDeliveryDetail;
}
export interface PartnerReceiverHealth extends PartnerDeliveryContext {
    installationId: string;
    authorityVersion: number;
    configurationStatus: 'pending' | 'active' | 'paused' | 'disabled';
    receiverStatus: 'awaiting_event' | 'active' | 'paused' | 'disconnected';
    revision: string | null;
    pausedReason: 'user_requested' | 'receiver_gone' | 'consecutive_delivery_failures' | null;
    health: 'unknown' | 'healthy' | 'warning' | 'failing';
    consecutiveFailures: number;
    failureCount: number;
    lastDelivery: {
        ok: boolean;
        statusCode: number | null;
        error: string | null;
        at: string;
    } | null;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    asOf: string;
}
export class PartnerSubscriptionDiagnosticsError extends Error {
    constructor() { super('The application delivery request or response is invalid.'); this.name = 'PartnerSubscriptionDiagnosticsError'; }
}
function fail(): never { throw new PartnerSubscriptionDiagnosticsError(); }
function parsePartnerSubscriptionId(value: unknown): string {
    if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value))
        fail();
    return value;
}
function closed(value: unknown, fields: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        fail();
    const v = value as Record<string, unknown>;
    if (Object.keys(v).some(key => !fields.includes(key)) || fields.some(key => !optional.includes(key) && !Object.hasOwn(v, key)))
        fail();
    return v;
}
function choice<T extends string>(value: unknown, values: readonly T[]): T { if (typeof value !== 'string' || !values.includes(value as T))
    fail(); return value as T; }
function count(value: unknown, max = 2147483647, min = 0): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    fail(); return value; }
function bool(value: unknown): boolean { if (typeof value !== 'boolean')
    fail(); return value; }
function instant(value: unknown, nullable = false): string | null {
    if (nullable && value === null)
        return null;
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)
        fail();
    return value;
}
function code(value: unknown): string | null { if (value === null)
    return null; if (typeof value !== 'string' || !/^(?:HTTP [1-5]\d\d|[a-z][a-z0-9_]{0,63})$/.test(value))
    fail(); return value; }
function status(value: unknown) { return value === null ? null : count(value, 599, 100); }
function event(value: unknown): DeveloperSubscriptionEventType {
    if (typeof value !== 'string' || value === 'endpoint.test' || !(DEVELOPER_EVENT_TYPES as readonly string[]).includes(value))
        fail();
    return value as DeveloperSubscriptionEventType;
}
function cursor(value: unknown): string { if (typeof value !== 'string' || value.length > 2048 || !/^[-A-Za-z0-9_]+\.[-A-Za-z0-9_]{43}$/.test(value))
    fail(); return value; }
function context(v: Record<string, unknown>): PartnerDeliveryContext { return { applicationId: parsePartnerSubscriptionId(v.applicationId), subscriptionId: parsePartnerSubscriptionId(v.subscriptionId), businessId: parsePartnerSubscriptionId(v.businessId) }; }
export function parsePartnerDeliveryListParams(value: unknown): PartnerDeliveryListParams {
    const fields = ['limit', 'cursor', 'from', 'to', 'status', 'eventType'], v = closed(value, fields, fields);
    const parsed = { ...(v.limit !== undefined ? { limit: count(v.limit, 100, 1) } : {}), ...(v.cursor !== undefined ? { cursor: cursor(v.cursor) } : {}),
        ...(v.from !== undefined ? { from: instant(v.from)! } : {}), ...(v.to !== undefined ? { to: instant(v.to)! } : {}),
        ...(v.status !== undefined ? { status: choice(v.status, PARTNER_DELIVERY_STATUSES) } : {}), ...(v.eventType !== undefined ? { eventType: event(v.eventType) } : {}) };
    if (parsed.from !== undefined && parsed.to !== undefined) {
        const span = Date.parse(parsed.to) - Date.parse(parsed.from);
        if (span <= 0 || span > 30 * 86400000)
            fail();
    }
    return parsed;
}
export function parsePartnerDeliverySearch(raw: string): PartnerDeliveryListParams {
    if (typeof raw !== 'string' || raw.length > 8192)
        fail();
    const search = new URLSearchParams(raw), v: Record<string, unknown> = {};
    for (const [key, value] of search) {
        if (Object.hasOwn(v, key))
            fail();
        v[key] = key === 'limit' && /^[1-9]\d{0,2}$/.test(value) ? Number(value) : value;
    }
    return parsePartnerDeliveryListParams(v);
}
export function partnerDeliverySearch(value: PartnerDeliveryListParams): string {
    const parsed = parsePartnerDeliveryListParams(value), search = new URLSearchParams();
    for (const key of ['limit', 'cursor', 'from', 'to', 'status', 'eventType'] as const)
        if (parsed[key] !== undefined)
            search.set(key, String(parsed[key]));
    return search.toString();
}
export function parseReplayPartnerDelivery(raw: string | Uint8Array): ReplayPartnerDeliveryInput {
    const v = closed(parseBoundedJson(raw, 1024), ['reason']);
    return { reason: choice(v.reason, PARTNER_DELIVERY_REPLAY_REASONS) };
}
function healthRevision(value: unknown): string { if (typeof value !== 'string' || !/^rh1_[a-f0-9]{64}$/.test(value))
    fail(); return value; }
export function parseRecoverPartnerReceiver(raw: string | Uint8Array): RecoverPartnerReceiverInput {
    const v = closed(parseBoundedJson(raw, 1024), ['expectedRevision']);
    return { expectedRevision: healthRevision(v.expectedRevision) };
}
export const PARTNER_WEBHOOK_DELIVERY_FIELDS = ['id', 'deliveryId', 'eventId', 'eventType', 'resource', 'kind', 'status', 'attemptCount', 'nextAttemptAt', 'lastAttemptAt', 'deliveredAt', 'lastHttpStatus', 'lastError', 'createdAt', 'replayOf', 'replayableUntil', 'replayCount', 'replayPending', 'replayable'] as const;
const DELIVERY_FIELDS = PARTNER_WEBHOOK_DELIVERY_FIELDS;
export function parsePartnerWebhookDelivery(value: unknown): PartnerWebhookDelivery {
    const v = closed(value, DELIVERY_FIELDS);
    let resource: PartnerWebhookDelivery['resource'] = null;
    if (v.resource !== null) {
        const r = closed(v.resource, ['type', 'id']);
        resource = { type: choice(r.type, ['contact', 'conversation', 'message', 'order', 'shipment', 'operation']), id: parsePartnerSubscriptionId(r.id) };
    }
    if (typeof v.deliveryId !== 'string' || !/^developer-webhook:[a-f0-9]{64}(?::replay:(?:[1-9]|1\d|2[0-4]))?$/.test(v.deliveryId)
        || typeof v.eventId !== 'string' || !/^evt_[a-f0-9]{32}$/.test(v.eventId))
        fail();
    const result: PartnerWebhookDelivery = { id: parsePartnerSubscriptionId(v.id), deliveryId: v.deliveryId, eventId: v.eventId, eventType: event(v.eventType), resource,
        kind: choice(v.kind, ['automatic', 'manual_replay']), status: choice(v.status, PARTNER_DELIVERY_STATUSES), attemptCount: count(v.attemptCount),
        nextAttemptAt: instant(v.nextAttemptAt, true), lastAttemptAt: instant(v.lastAttemptAt, true), deliveredAt: instant(v.deliveredAt, true), lastHttpStatus: status(v.lastHttpStatus), lastError: code(v.lastError), createdAt: instant(v.createdAt)!,
        replayOf: v.replayOf === null ? null : parsePartnerSubscriptionId(v.replayOf), replayableUntil: instant(v.replayableUntil)!, replayCount: count(v.replayCount, 24), replayPending: bool(v.replayPending), replayable: bool(v.replayable) };
    if (result.replayable && (result.kind !== 'automatic' || !['failed', 'delivered'].includes(result.status) || result.replayCount >= 24 || result.replayPending))
        fail();
    const expected = result.eventType === 'message.created' || result.eventType === 'message.delivery_changed' ? 'message' : result.eventType.slice(0, -'.changed'.length);
    if (result.resource !== null && result.resource.type !== expected || result.kind === 'manual_replay' && result.replayOf === null || result.kind === 'automatic' && result.replayOf !== null)
        fail();
    return result;
}
export function parsePartnerWebhookDeliveryDetail(value: unknown): PartnerWebhookDeliveryDetail {
    const v = closed(value, [...DELIVERY_FIELDS, 'attempts']);
    if (!Array.isArray(v.attempts) || v.attempts.length > 64)
        fail();
    const { attempts: raw, ...rest } = v, delivery = parsePartnerWebhookDelivery(rest);
    return { ...delivery, attempts: (raw as unknown[]).map(item => { const a = closed(item, ['at', 'outcome', 'statusCode', 'error']); return { at: instant(a.at)!, outcome: choice(a.outcome, ['delivered', 'retry', 'failed', 'skipped']), statusCode: status(a.statusCode), error: code(a.error) }; }) };
}
export function parsePartnerDeliveryPage(value: unknown): PartnerDeliveryPage {
    const v = closed(value, ['applicationId', 'subscriptionId', 'businessId', 'deliveries', 'nextCursor']);
    if (!Array.isArray(v.deliveries) || v.deliveries.length > 100)
        fail();
    const deliveries = v.deliveries.map(parsePartnerWebhookDelivery);
    if (new Set(deliveries.map(row => row.id)).size !== deliveries.length)
        fail();
    if (v.nextCursor !== null && deliveries.length === 0)
        fail();
    return { ...context(v), deliveries, nextCursor: v.nextCursor === null ? null : cursor(v.nextCursor) };
}
export function parsePartnerDeliveryResult(value: unknown, detail = false): PartnerDeliveryResult | PartnerDeliveryDetailResult {
    const v = closed(value, ['applicationId', 'subscriptionId', 'businessId', 'delivery']);
    return { ...context(v), delivery: detail ? parsePartnerWebhookDeliveryDetail(v.delivery) : parsePartnerWebhookDelivery(v.delivery) };
}
export function parsePartnerReceiverHealth(value: unknown): PartnerReceiverHealth {
    const v = closed(value, ['applicationId', 'subscriptionId', 'businessId', 'installationId', 'authorityVersion', 'configurationStatus', 'receiverStatus', 'revision', 'pausedReason', 'health', 'consecutiveFailures', 'failureCount', 'lastDelivery', 'lastSuccessAt', 'lastFailureAt', 'asOf']);
    let lastDelivery: PartnerReceiverHealth['lastDelivery'] = null;
    if (v.lastDelivery !== null) {
        const last = closed(v.lastDelivery, ['ok', 'statusCode', 'error', 'at']);
        lastDelivery = { ok: bool(last.ok), statusCode: status(last.statusCode), error: code(last.error), at: instant(last.at)! };
    }
    const result = { ...context(v), installationId: parsePartnerSubscriptionId(v.installationId), authorityVersion: count(v.authorityVersion, 2147483647, 1),
        configurationStatus: choice(v.configurationStatus, ['pending', 'active', 'paused', 'disabled']), receiverStatus: choice(v.receiverStatus, ['awaiting_event', 'active', 'paused', 'disconnected']),
        revision: v.revision === null ? null : healthRevision(v.revision),
        pausedReason: v.pausedReason === null ? null : choice(v.pausedReason, ['user_requested', 'receiver_gone', 'consecutive_delivery_failures']), health: choice(v.health, ['unknown', 'healthy', 'warning', 'failing']),
        consecutiveFailures: count(v.consecutiveFailures), failureCount: count(v.failureCount), lastDelivery, lastSuccessAt: instant(v.lastSuccessAt, true), lastFailureAt: instant(v.lastFailureAt, true), asOf: instant(v.asOf)! };
    if (result.pausedReason !== null && result.receiverStatus !== 'paused' || result.receiverStatus === 'awaiting_event' && (result.revision !== null || lastDelivery !== null || result.consecutiveFailures !== 0 || result.health !== 'unknown')
        || result.receiverStatus !== 'awaiting_event' && result.revision === null)
        fail();
    return result;
}
