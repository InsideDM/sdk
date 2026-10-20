// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
export const FLOW_PUBLICATION_OPERATIONS = [{
        id: 'requestFlowPublication', name: 'flows.deployments.requestPublication', audience: 'conversations', method: 'POST',
        path: '/api/v1/automation-governance/{businessId}/recipes/{recipeId}/release-requests', pathTemplate: '/api/v1/automation-governance/:businessId/recipes/:recipeId/release-requests',
        principalKinds: ['business_key', 'delegation'], requiredScopes: ['flows.deploy'], humanPermissions: ['flows.edit'], idempotency: 'required', scope: 'workspace',
    }, {
        id: 'getFlowPublicationRequest', name: 'flows.deployments.getPublicationRequest', audience: 'conversations', method: 'GET',
        path: '/api/v1/automation-governance/{businessId}/recipes/{recipeId}/release-requests/{releaseRequestId}', pathTemplate: '/api/v1/automation-governance/:businessId/recipes/:recipeId/release-requests/:releaseRequestId',
        principalKinds: ['business_key', 'delegation'], requiredScopes: ['flows.deploy'], humanPermissions: ['flows.edit'], idempotency: 'none', scope: 'workspace',
    }] as const;
export interface ManagedPublicationInput {
    kind: 'managed_deployment';
    expectedDeploymentRevision: number;
    expectedDraftRevision: number;
    expectedPublishedVersionId: string | null;
    note?: string;
}
export interface ManagedPublicationRequest {
    businessId: string;
    recipeId: string;
    id: string;
    deploymentRevision: number;
    draftRevision: number;
    status: 'pending' | 'pending_evidence' | 'approved' | 'rejected' | 'published' | 'superseded' | 'dismissed';
    requestedAt: string;
    publishedVersionId: string | null;
}
export class FlowPublicationRequestError extends Error {
    constructor() { super('The managed publication request is invalid.'); this.name = 'FlowPublicationRequestError'; }
}
function fail(): never { throw new FlowPublicationRequestError(); }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0 && v <= 2147483647;
export const isFlowPublicationId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
function exact(v: Record<string, unknown>, keys: string[], optional: string[] = []) { if (keys.some(k => !Object.hasOwn(v, k)) || Object.keys(v).some(k => ![...keys, ...optional].includes(k)))
    fail(); }
export function parseManagedPublicationInput(raw: string | Uint8Array): ManagedPublicationInput {
    const v = parseBoundedJson(raw, 2048);
    if (!record(v))
        fail();
    exact(v, ['kind', 'expectedDeploymentRevision', 'expectedDraftRevision', 'expectedPublishedVersionId'], ['note']);
    if (v.kind !== 'managed_deployment' || !integer(v.expectedDeploymentRevision) || !integer(v.expectedDraftRevision) || v.expectedPublishedVersionId !== null && !isFlowPublicationId(v.expectedPublishedVersionId)
        || v.note !== undefined && (typeof v.note !== 'string' || v.note.length > 500 || /[\x00-\x1f\x7f]/.test(v.note)))
        fail();
    return { kind: 'managed_deployment', expectedDeploymentRevision: v.expectedDeploymentRevision, expectedDraftRevision: v.expectedDraftRevision,
        expectedPublishedVersionId: v.expectedPublishedVersionId as string | null, ...(v.note === undefined ? {} : { note: v.note as string }) };
}
export function parseManagedPublicationRequest(v: unknown): ManagedPublicationRequest {
    if (!record(v))
        fail();
    exact(v, ['businessId', 'recipeId', 'id', 'deploymentRevision', 'draftRevision', 'status', 'requestedAt', 'publishedVersionId']);
    if (!isFlowPublicationId(v.businessId) || !isFlowPublicationId(v.recipeId) || !isFlowPublicationId(v.id) || !integer(v.deploymentRevision) || !integer(v.draftRevision)
        || !['pending', 'pending_evidence', 'approved', 'rejected', 'published', 'superseded', 'dismissed'].includes(String(v.status))
        || typeof v.requestedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v.requestedAt) || !Number.isFinite(Date.parse(v.requestedAt)) || new Date(v.requestedAt).toISOString() !== v.requestedAt
        || (v.status === 'published' ? !isFlowPublicationId(v.publishedVersionId) : v.publishedVersionId !== null))
        fail();
    return v as unknown as ManagedPublicationRequest;
}
export function parseManagedPublicationQuery(route: string): void {
    if (typeof route !== 'string' || route.length > 2048)
        fail();
    const q = new URLSearchParams(route.split('?')[1] ?? '');
    if ([...q].length !== 1 || q.get('view') !== 'managed')
        fail();
}
