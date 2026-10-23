// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
export const FLOW_PUBLICATION_OPERATIONS = [{
        id: 'requestFlowPublication', name: 'flows.deployments.requestPublication', audience: 'conversations', method: 'POST',
        path: '/api/v1/automation-governance/{businessId}/recipes/{recipeId}/release-requests', pathTemplate: '/api/v1/automation-governance/:businessId/recipes/:recipeId/release-requests',
        principalKinds: ['business_key', 'delegation', 'user_delegation'], userExecution: 'direct', bodyLimit: 2048, requiredScopes: ['flows.deploy'], humanPermissions: ['flows.edit'], idempotency: 'required', scope: 'workspace',
    }, {
        id: 'getFlowPublicationRequest', name: 'flows.deployments.getPublicationRequest', audience: 'conversations', method: 'GET',
        path: '/api/v1/automation-governance/{businessId}/recipes/{recipeId}/release-requests/{releaseRequestId}', pathTemplate: '/api/v1/automation-governance/:businessId/recipes/:recipeId/release-requests/:releaseRequestId',
        principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.deploy'], humanPermissions: ['flows.edit'], idempotency: 'none', scope: 'workspace',
    }, {
        id: 'withdrawFlowPublication', name: 'flows.deployments.withdrawPublication', audience: 'conversations', method: 'POST',
        path: '/api/v1/automation-governance/{businessId}/recipes/{recipeId}/release-requests/{releaseRequestId}/withdraw', pathTemplate: '/api/v1/automation-governance/:businessId/recipes/:recipeId/release-requests/:releaseRequestId/withdraw',
        principalKinds: ['business_key', 'delegation', 'user_delegation'], userExecution: 'direct', bodyLimit: 1024, requiredScopes: ['flows.deploy'], humanPermissions: ['flows.edit'], idempotency: 'required', scope: 'workspace',
    }] as const;
export interface WithdrawFlowPublicationInput {
    expectedDecisionRevision: number;
}
export interface ManagedPublicationWithdrawal extends WithdrawFlowPublicationInput {
    kind: 'managed_deployment';
}
export interface ManagedPublicationInput {
    kind: 'managed_deployment';
    expectedDeploymentRevision: number;
    expectedDraftRevision: number;
    expectedPublishedVersionId: string | null;
    note?: string;
}
export const FLOW_PUBLICATION_BLOCKERS = ['draft_changed', 'policy_changed', 'published_version_changed', 'candidate_invalid', 'runtime_changed',
    'prerequisites_changed', 'path_failed', 'regression_evidence_missing', 'regression_evidence_stale', 'regression_evidence_invalid', 'review_required'] as const;
export type FlowPublicationBlocker = typeof FLOW_PUBLICATION_BLOCKERS[number];
export interface FlowPublicationChecks {
    state: 'awaiting_review' | 'awaiting_evidence' | 'ready_to_publish' | 'blocked' | 'terminal';
    checkedAt: string;
    blockingReasons: FlowPublicationBlocker[];
    evidence: {
        required: boolean;
        missingSuites: number;
        staleSuites: number;
        invalidSuites: number;
    };
}
export interface ManagedPublicationRequest {
    businessId: string;
    recipeId: string;
    id: string;
    deploymentRevision: number;
    draftRevision: number;
    decisionRevision: number;
    status: 'pending' | 'pending_evidence' | 'approved' | 'rejected' | 'published' | 'superseded' | 'dismissed';
    requestedAt: string;
    publishedVersionId: string | null;
    reviewUrl: string | null;
    checks: FlowPublicationChecks | null;
}
export function flowPublicationReviewUrl(businessId: string, recipeId: string, releaseRequestId: string): string {
    if (![businessId, recipeId, releaseRequestId].every(isFlowPublicationId))
        fail();
    return 'https://insidedm.io/approve/flows?' + new URLSearchParams({ business: businessId, flow: recipeId, release: releaseRequestId });
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
export function parseManagedPublicationWithdrawal(raw: string | Uint8Array): ManagedPublicationWithdrawal {
    const v = parseBoundedJson(raw, 1024);
    if (!record(v))
        fail();
    exact(v, ['kind', 'expectedDecisionRevision']);
    if (v.kind !== 'managed_deployment' || v.expectedDecisionRevision !== 0 && v.expectedDecisionRevision !== 1)
        fail();
    return { kind: 'managed_deployment', expectedDecisionRevision: v.expectedDecisionRevision };
}
export function parseManagedPublicationRequest(v: unknown): ManagedPublicationRequest {
    if (!record(v))
        fail();
    exact(v, ['businessId', 'recipeId', 'id', 'deploymentRevision', 'draftRevision', 'decisionRevision', 'status', 'requestedAt', 'publishedVersionId', 'reviewUrl', 'checks']);
    if (!isFlowPublicationId(v.businessId) || !isFlowPublicationId(v.recipeId) || !isFlowPublicationId(v.id) || !integer(v.deploymentRevision) || !integer(v.draftRevision)
        || !['pending', 'pending_evidence', 'approved', 'rejected', 'published', 'superseded', 'dismissed'].includes(String(v.status))
        || typeof v.requestedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v.requestedAt) || !Number.isFinite(Date.parse(v.requestedAt)) || new Date(v.requestedAt).toISOString() !== v.requestedAt
        || (v.status === 'published' ? !isFlowPublicationId(v.publishedVersionId) : v.publishedVersionId !== null))
        fail();
    if (v.decisionRevision !== (['pending', 'pending_evidence'].includes(String(v.status)) ? 0 : v.status === 'superseded' ? 2 : 1))
        fail();
    const reviewable = ['pending', 'pending_evidence', 'approved'].includes(String(v.status));
    if (v.reviewUrl !== (reviewable ? flowPublicationReviewUrl(v.businessId, v.recipeId, v.id) : null))
        fail();
    if (v.checks !== null) {
        const checks = v.checks;
        if (!record(checks))
            fail();
        exact(checks, ['state', 'checkedAt', 'blockingReasons', 'evidence']);
        if (!['awaiting_review', 'awaiting_evidence', 'ready_to_publish', 'blocked', 'terminal'].includes(String(checks.state))
            || typeof checks.checkedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(checks.checkedAt)
            || !Number.isFinite(Date.parse(checks.checkedAt)) || new Date(checks.checkedAt).toISOString() !== checks.checkedAt
            || !Array.isArray(checks.blockingReasons) || checks.blockingReasons.length > FLOW_PUBLICATION_BLOCKERS.length
            || new Set(checks.blockingReasons).size !== checks.blockingReasons.length || checks.blockingReasons.some(code => !FLOW_PUBLICATION_BLOCKERS.includes(code))
            || !record(checks.evidence))
            fail();
        const evidence = checks.evidence;
        exact(evidence, ['required', 'missingSuites', 'staleSuites', 'invalidSuites']);
        if (typeof evidence.required !== 'boolean' || ['missingSuites', 'staleSuites', 'invalidSuites'].some(key => !Number.isSafeInteger(evidence[key]) || Number(evidence[key]) < 0 || Number(evidence[key]) > 1000))
            fail();
        if ((checks.state === 'terminal') === reviewable || checks.state === 'ready_to_publish' && (v.status !== 'approved' || checks.blockingReasons.length !== 0
            || checks.evidence.missingSuites !== 0 || checks.evidence.staleSuites !== 0 || checks.evidence.invalidSuites !== 0))
            fail();
    }
    return v as unknown as ManagedPublicationRequest;
}
export function parseManagedPublicationQuery(route: string): void {
    if (typeof route !== 'string' || route.length > 2048)
        fail();
    const q = new URLSearchParams(route.split('?')[1] ?? '');
    if ([...q].length !== 1 || q.get('view') !== 'managed')
        fail();
}
