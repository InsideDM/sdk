// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
import { isFlowPublicationId } from './flowPublicationRequests.js';
import type { ManagedFlowSimulationInput, FlowDraftSimulation } from './flowSimulationTypes.js';
export const SIMULATE_FLOW_DRAFT_OPERATION = {
    id: 'simulateFlowDraft', name: 'flows.simulate', audience: 'conversations', method: 'POST',
    path: '/api/v1/flows/{businessId}/recipes/{recipeId}/graph/simulate', pathTemplate: '/api/v1/flows/:businessId/recipes/:recipeId/graph/simulate',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.test'], humanPermissions: ['flows.test'],
    userExecution: 'direct', idempotency: 'none', bodyLimit: 65536, scope: 'workspace',
} as const;
export class FlowSimulationError extends Error {
    constructor() { super('The native flow simulation request or result is invalid.'); this.name = 'FlowSimulationError'; }
}
function fail(): never { throw new FlowSimulationError(); }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function exact(v: Record<string, unknown>, required: string[], optional: string[] = []) { if (required.some(k => !Object.hasOwn(v, k)) || Object.keys(v).some(k => ![...required, ...optional].includes(k)))
    fail(); }
const revision = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0 && v <= 2147483647;
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max && !/[\x00-\x1f\x7f]/.test(v);
const codes = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 30 && new Set(v).size === v.length && v.every(c => typeof c === 'string' && /^[A-Za-z0-9_.:-]{1,160}$/.test(c));
export function parseManagedFlowSimulationInput(raw: string | Uint8Array): ManagedFlowSimulationInput {
    const v = parseBoundedJson(raw, 65536);
    if (!record(v))
        fail();
    exact(v, ['kind', 'expectedRevision'], ['variables', 'pathId']);
    if (v.kind !== 'managed_draft' || !revision(v.expectedRevision) || v.pathId !== undefined && !text(v.pathId, 20000))
        fail();
    if (v.variables !== undefined && (!record(v.variables) || Object.keys(v.variables).length > 50
        || Object.entries(v.variables).some(([key, value]) => !text(key, 200) || typeof value !== 'string' || value.length > 4000)))
        fail();
    return v as unknown as ManagedFlowSimulationInput;
}
export function parseFlowDraftSimulation(v: unknown): FlowDraftSimulation {
    if (!record(v))
        fail();
    exact(v, ['businessId', 'recipeId', 'draftRevision', 'graphFingerprint', 'status', 'selectedPath', 'issues', 'issueCount', 'readiness', 'coverageRecorded', 'sideEffects']);
    if (!isFlowPublicationId(v.businessId) || !isFlowPublicationId(v.recipeId) || !revision(v.draftRevision) || typeof v.graphFingerprint !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(v.graphFingerprint)
        || !['passed', 'blocked'].includes(String(v.status)) || typeof v.coverageRecorded !== 'boolean' || v.sideEffects !== false
        || !Array.isArray(v.issues) || v.issues.length > 100 || typeof v.issueCount !== 'number' || !Number.isSafeInteger(v.issueCount) || v.issueCount < v.issues.length || v.issueCount > 1000000 || !Array.isArray(v.readiness) || v.readiness.length > 100)
        fail();
    if (v.selectedPath !== null) {
        const selected = v.selectedPath;
        if (!record(selected))
            fail();
        exact(selected, ['id', 'outcomeId', 'outcomeKind']);
        if (!text(selected.id, 20000) || !text(selected.outcomeId, 200) || !['success', 'handoff', 'stopped', 'failed'].includes(String(selected.outcomeKind)))
            fail();
    }
    for (const issue of v.issues) {
        if (!record(issue))
            fail();
        exact(issue, ['code', 'nodeId']);
        if (!codes([issue.code]) || issue.nodeId !== null && !text(issue.nodeId, 200))
            fail();
    }
    for (const step of v.readiness) {
        if (!record(step))
            fail();
        exact(step, ['nodeId', 'actionType', 'ready', 'blockedReasons', 'reviewReasons']);
        if (step.nodeId !== null && !text(step.nodeId, 200) || step.actionType !== null && !text(step.actionType, 100) || typeof step.ready !== 'boolean' || !codes(step.blockedReasons) || !codes(step.reviewReasons))
            fail();
    }
    if (v.coverageRecorded !== (v.status === 'passed') || v.status === 'passed' && (v.selectedPath === null || v.issueCount > 0 || v.readiness.some(step => step.ready !== true)))
        fail();
    return v as unknown as FlowDraftSimulation;
}
