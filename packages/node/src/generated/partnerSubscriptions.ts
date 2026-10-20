// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { DEVELOPER_EVENT_TYPES, type DeveloperSubscriptionEventType, type PublicScope } from './vocabulary.js';
import { parseBoundedJson } from './boundedJson.js';
import { PARTNER_SUBSCRIPTION_DIAGNOSTIC_OPERATIONS, parseReplayPartnerDelivery, parseRecoverPartnerReceiver } from './partnerSubscriptionDiagnostics.js';
export const PARTNER_SUBSCRIPTION_OPERATIONS = ([
    { id: 'createPlatformSubscription', name: 'platform.subscriptions.create', method: 'POST', pathTemplate: '/api/v1/platform/subscriptions', idempotency: 'required' },
    { id: 'listPlatformSubscriptions', name: 'platform.subscriptions.list', method: 'GET', pathTemplate: '/api/v1/platform/subscriptions', idempotency: 'none' },
    { id: 'getPlatformSubscription', name: 'platform.subscriptions.get', method: 'GET', pathTemplate: '/api/v1/platform/subscriptions/:subscriptionId', idempotency: 'none' },
    { id: 'updatePlatformSubscription', name: 'platform.subscriptions.update', method: 'PATCH', pathTemplate: '/api/v1/platform/subscriptions/:subscriptionId', idempotency: 'none' },
    { id: 'verifyPlatformSubscription', name: 'platform.subscriptions.verify', method: 'POST', pathTemplate: '/api/v1/platform/subscriptions/:subscriptionId/verify', idempotency: 'none' },
    { id: 'activatePlatformSubscription', name: 'platform.subscriptions.activate', method: 'POST', pathTemplate: '/api/v1/platform/subscriptions/:subscriptionId/activate', idempotency: 'none' },
    { id: 'pausePlatformSubscription', name: 'platform.subscriptions.pause', method: 'POST', pathTemplate: '/api/v1/platform/subscriptions/:subscriptionId/pause', idempotency: 'none' },
    { id: 'disablePlatformSubscription', name: 'platform.subscriptions.disable', method: 'POST', pathTemplate: '/api/v1/platform/subscriptions/:subscriptionId/disable', idempotency: 'none' },
    { id: 'rotatePlatformSubscriptionSecret', name: 'platform.subscriptions.rotateSecret', method: 'POST', pathTemplate: '/api/v1/platform/subscriptions/:subscriptionId/rotate-secret', idempotency: 'required' },
    ...PARTNER_SUBSCRIPTION_DIAGNOSTIC_OPERATIONS,
] as const).map(operation => ({ ...operation, audience: 'conversations' as const, principalKinds: ['app'] as const, requiredScopes: ['platform.subscriptions.manage'] as const, scope: 'portfolio' as const }));
export const SUBSCRIPTION_EVENT_SCOPES: Readonly<Record<DeveloperSubscriptionEventType, PublicScope>> = {
    'contact.changed': 'contacts.read', 'conversation.changed': 'conversations.read', 'message.created': 'messages.read',
    'message.delivery_changed': 'messages.read', 'order.changed': 'orders.read', 'shipment.changed': 'shipments.read', 'operation.changed': 'operations.read',
};
export type PartnerSubscriptionStatus = 'pending' | 'active' | 'paused' | 'disabled' | 'unavailable';
export interface PartnerSubscription {
    id: string;
    applicationId: string;
    name: string;
    url: string;
    events: DeveloperSubscriptionEventType[];
    status: PartnerSubscriptionStatus;
    revision: string;
    targetGeneration: number;
    secretGeneration: number;
    secretPrefix: string;
    secretOverlapUntil: string | null;
    ready: boolean;
    readinessValidUntil: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface CreatePartnerSubscription {
    name: string;
    url: string;
    events: DeveloperSubscriptionEventType[];
}
export interface UpdatePartnerSubscription {
    expectedRevision: string;
    name?: string;
    url?: string;
    events?: DeveloperSubscriptionEventType[];
}
export interface PartnerSubscriptionDecision {
    expectedRevision: string;
}
export interface RotatePartnerSubscriptionSecret extends PartnerSubscriptionDecision {
    mode: 'immediate' | 'overlap_24h';
}
export interface PartnerSubscriptionSecret {
    subscription: PartnerSubscription;
    signingSecret: string | null;
}
export class PartnerSubscriptionRequestError extends Error {
    constructor() { super('The subscription request is invalid.'); this.name = 'PartnerSubscriptionRequestError'; }
}
function fail(): never { throw new PartnerSubscriptionRequestError(); }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function closed(value: unknown, allowed: readonly string[], required: readonly string[]): Record<string, unknown> {
    if (!record(value) || Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key)))
        fail();
    return value;
}
function label(value: unknown): string {
    if (typeof value !== 'string' || value !== value.trim() || !value.length || value.length > 120 || /[\x00-\x1f\x7f]/.test(value))
        fail();
    return value;
}
function url(value: unknown): string {
    if (typeof value !== 'string' || value.length > 2048)
        fail();
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash || parsed.href !== value)
            fail();
        return value;
    }
    catch {
        return fail();
    }
}
function events(value: unknown): DeveloperSubscriptionEventType[] {
    if (!Array.isArray(value) || !value.length || value.length > Object.keys(SUBSCRIPTION_EVENT_SCOPES).length || new Set(value).size !== value.length
        || value.some(event => typeof event !== 'string' || !Object.hasOwn(SUBSCRIPTION_EVENT_SCOPES, event)))
        fail();
    return DEVELOPER_EVENT_TYPES.filter((event): event is DeveloperSubscriptionEventType => event !== 'endpoint.test' && value.includes(event));
}
function revision(value: unknown): string {
    if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value) || Number(value) > 2147483647)
        fail();
    return value;
}
export function parsePartnerSubscriptionId(value: unknown): string {
    if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value))
        fail();
    return value;
}
export function parseCreatePartnerSubscription(raw: string | Uint8Array): CreatePartnerSubscription {
    const v = closed(parseBoundedJson(raw, 4096), ['name', 'url', 'events'], ['name', 'url', 'events']);
    return { name: label(v.name), url: url(v.url), events: events(v.events) };
}
export function parseUpdatePartnerSubscription(raw: string | Uint8Array): UpdatePartnerSubscription {
    const v = closed(parseBoundedJson(raw, 4096), ['expectedRevision', 'name', 'url', 'events'], ['expectedRevision']);
    if (Object.keys(v).length < 2)
        fail();
    return { expectedRevision: revision(v.expectedRevision), ...(Object.hasOwn(v, 'name') ? { name: label(v.name) } : {}),
        ...(Object.hasOwn(v, 'url') ? { url: url(v.url) } : {}), ...(Object.hasOwn(v, 'events') ? { events: events(v.events) } : {}) };
}
export function parsePartnerSubscriptionDecision(raw: string | Uint8Array): PartnerSubscriptionDecision {
    const v = closed(parseBoundedJson(raw, 1024), ['expectedRevision'], ['expectedRevision']);
    return { expectedRevision: revision(v.expectedRevision) };
}
export function parseRotatePartnerSubscriptionSecret(raw: string | Uint8Array): RotatePartnerSubscriptionSecret {
    const v = closed(parseBoundedJson(raw, 1024), ['expectedRevision', 'mode'], ['expectedRevision', 'mode']);
    if (v.mode !== 'immediate' && v.mode !== 'overlap_24h')
        fail();
    return { expectedRevision: revision(v.expectedRevision), mode: v.mode };
}
export function parsePartnerSubscription(value: unknown): PartnerSubscription {
    const v = closed(value, ['id', 'applicationId', 'name', 'url', 'events', 'status', 'revision', 'targetGeneration', 'secretGeneration', 'secretPrefix', 'secretOverlapUntil', 'ready', 'readinessValidUntil', 'createdAt', 'updatedAt'], ['id', 'applicationId', 'name', 'url', 'events', 'status', 'revision', 'targetGeneration', 'secretGeneration', 'secretPrefix', 'secretOverlapUntil', 'ready', 'readinessValidUntil', 'createdAt', 'updatedAt']);
    if (!['pending', 'active', 'paused', 'disabled', 'unavailable'].includes(String(v.status)) || typeof v.ready !== 'boolean'
        || typeof v.secretPrefix !== 'string' || !/^whsec_[A-Za-z0-9_-]{8}$/.test(v.secretPrefix))
        fail();
    const generation = (value: unknown) => { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 2147483647)
        fail(); return value; };
    const instant = (value: unknown, nullable = false): string | null => {
        if (nullable && value === null)
            return null;
        if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)
            fail();
        return value;
    };
    if (v.ready && (v.status === 'disabled' || v.status === 'unavailable' || v.readinessValidUntil === null))
        fail();
    return { id: parsePartnerSubscriptionId(v.id), applicationId: parsePartnerSubscriptionId(v.applicationId), name: label(v.name), url: url(v.url), events: events(v.events),
        status: v.status as PartnerSubscriptionStatus, revision: revision(v.revision), targetGeneration: generation(v.targetGeneration), secretGeneration: generation(v.secretGeneration),
        secretPrefix: v.secretPrefix, secretOverlapUntil: instant(v.secretOverlapUntil, true), ready: v.ready, readinessValidUntil: instant(v.readinessValidUntil, true),
        createdAt: instant(v.createdAt)!, updatedAt: instant(v.updatedAt)! };
}
export function parsePartnerSubscriptionSecret(value: unknown): PartnerSubscriptionSecret {
    const v = closed(value, ['subscription', 'signingSecret'], ['subscription', 'signingSecret']), subscription = parsePartnerSubscription(v.subscription);
    if (v.signingSecret !== null && (typeof v.signingSecret !== 'string' || !/^whsec_[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(v.signingSecret)
        || !v.signingSecret.startsWith(subscription.secretPrefix) || subscription.status === 'disabled' || subscription.status === 'unavailable'))
        fail();
    return { subscription, signingSecret: v.signingSecret as string | null };
}
export function parsePartnerSubscriptionList(value: unknown): PartnerSubscription[] {
    if (!Array.isArray(value) || value.length > 5)
        fail();
    const result = value.map(parsePartnerSubscription);
    if (new Set(result.map(item => item.id)).size !== result.length || result.some(item => item.status === 'disabled'))
        fail();
    return result;
}
export function parsePartnerSubscriptionOperationBody(operation: typeof PARTNER_SUBSCRIPTION_OPERATIONS[number]['id'], raw: string | Uint8Array | null) {
    if (['listPlatformSubscriptions', 'getPlatformSubscription', 'getPlatformSubscriptionHealth', 'listPlatformSubscriptionDeliveries', 'getPlatformSubscriptionDelivery'].includes(operation)) {
        if (raw !== null)
            fail();
        return null;
    }
    if (raw === null)
        fail();
    if (operation === 'createPlatformSubscription')
        return parseCreatePartnerSubscription(raw);
    if (operation === 'updatePlatformSubscription')
        return parseUpdatePartnerSubscription(raw);
    if (operation === 'rotatePlatformSubscriptionSecret')
        return parseRotatePartnerSubscriptionSecret(raw);
    if (operation === 'replayPlatformSubscriptionDelivery')
        return parseReplayPartnerDelivery(raw);
    if (operation === 'recoverPlatformSubscriptionReceiver')
        return parseRecoverPartnerReceiver(raw);
    if (['verifyPlatformSubscription', 'activatePlatformSubscription', 'pausePlatformSubscription', 'disablePlatformSubscription'].includes(operation))
        return parsePartnerSubscriptionDecision(raw);
    return fail();
}
