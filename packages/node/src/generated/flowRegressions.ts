// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
import { isFlowPublicationId } from './flowPublicationRequests.js';
import type { FlowRegressionSuites, FlowRegressionRun, ManagedFlowRegressionInput, ManagedFlowRegressionSuiteInput, FlowRegressionSuite, FlowRegressionConfiguration, FlowRegressionCatalog } from './flowRegressionTypes.js';
import { parseFlowRegressionCases } from './flowRegressionFixtures.js';
const prefix = '/api/v1/automation-governance';
export const FLOW_REGRESSION_OPERATIONS = [{
        id: 'listFlowRegressionSuites', name: 'flows.regressions.listSuites', audience: 'conversations', method: 'GET',
        path: `${prefix}/{businessId}/recipes/{recipeId}/regression-suites`,
        pathTemplate: `${prefix}/:businessId/recipes/:recipeId/regression-suites`,
        principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.test'],
        humanPermissions: ['flows.test'], idempotency: 'none', scope: 'workspace',
    }, {
        id: 'runFlowRegression', name: 'flows.regressions.run', audience: 'conversations', method: 'POST',
        path: `${prefix}/{businessId}/recipes/{recipeId}/regression-runs`,
        pathTemplate: `${prefix}/:businessId/recipes/:recipeId/regression-runs`,
        principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.test'],
        humanPermissions: ['flows.test'], userExecution: 'direct', bodyLimit: 1024,
        idempotency: 'required', scope: 'workspace',
    }, {
        id: 'getFlowRegressionRun', name: 'flows.regressions.get', audience: 'conversations', method: 'GET',
        path: `${prefix}/{businessId}/recipes/{recipeId}/regression-runs/{runId}`,
        pathTemplate: `${prefix}/:businessId/recipes/:recipeId/regression-runs/:runId`,
        principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.test'],
        humanPermissions: ['flows.test'], idempotency: 'none', scope: 'workspace',
    }, {
        id: 'saveFlowRegressionSuite', name: 'flows.regressions.saveSuite', audience: 'conversations', method: 'POST',
        path: `${prefix}/{businessId}/recipes/{recipeId}/regression-suites`,
        pathTemplate: `${prefix}/:businessId/recipes/:recipeId/regression-suites`,
        principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.test'],
        humanPermissions: ['flows.test'], userExecution: 'direct', bodyLimit: 65536,
        idempotency: 'required', scope: 'workspace',
    }] as const;
export class FlowRegressionError extends Error {
    constructor() { super('The release-bound regression request or observation is invalid.'); this.name = 'FlowRegressionError'; }
}
function fail(): never { throw new FlowRegressionError(); }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min = 0): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= 2147483647;
function exact(v: Record<string, unknown>, keys: string[]) { if (Object.keys(v).length !== keys.length || keys.some(k => !Object.hasOwn(v, k)))
    fail(); }
const timestamp = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
export function parseFlowRegressionQuery(route: string): {
    view: 'managed';
    releaseRequestId: string;
} {
    const query = new URL(route, 'https://api.insidedm.io').searchParams;
    if ([...query].length !== 2 || query.get('view') !== 'managed' || !isFlowPublicationId(query.get('releaseRequestId')))
        fail();
    return { view: 'managed', releaseRequestId: query.get('releaseRequestId')! };
}
export function parseFlowRegressionCatalogQuery(route: string): {
    view: 'managed';
    releaseRequestId: string;
} | {
    view: 'configuration';
    suiteId?: string;
} {
    const q = new URL(route, 'https://api.insidedm.io').searchParams;
    if (q.get('view') === 'managed')
        return parseFlowRegressionQuery(route);
    if (q.get('view') !== 'configuration' || q.getAll('view').length !== 1 || [...q.keys()].some(key => !['view', 'suiteId'].includes(key))
        || q.has('suiteId') && (q.getAll('suiteId').length !== 1 || !isFlowPublicationId(q.get('suiteId'))))
        fail();
    return { view: 'configuration', ...(q.has('suiteId') ? { suiteId: q.get('suiteId')! } : {}) };
}
export function parseManagedFlowRegressionSuiteInput(raw: string | Uint8Array): ManagedFlowRegressionSuiteInput {
    const v = parseBoundedJson(raw, 65536);
    if (!record(v))
        fail();
    exact(v, ['kind', 'suiteId', 'expectedRevision', 'name', 'required', 'status', 'cases']);
    if (v.kind !== 'managed_deployment' || (v.suiteId === null ? v.expectedRevision !== null : !isFlowPublicationId(v.suiteId) || !integer(v.expectedRevision, 1)))
        fail();
    if (typeof v.name !== 'string' || !v.name.trim() || v.name.length > 120 || /[\x00-\x1f\x7f]/.test(v.name) || typeof v.required !== 'boolean' || !['active', 'archived'].includes(String(v.status)))
        fail();
    return { ...v, name: v.name.trim(), cases: parseFlowRegressionCases(v.cases) } as unknown as ManagedFlowRegressionSuiteInput;
}
export function parseFlowRegressionSuite(v: unknown): FlowRegressionSuite {
    if (!record(v))
        fail();
    exact(v, ['businessId', 'recipeId', 'id', 'revision', 'name', 'required', 'status', 'cases']);
    if (![v.businessId, v.recipeId, v.id].every(isFlowPublicationId) || !integer(v.revision, 1))
        fail();
    if (typeof v.name !== 'string' || !v.name.trim() || v.name.length > 120 || /[\x00-\x1f\x7f]/.test(v.name) || typeof v.required !== 'boolean' || !['active', 'archived'].includes(String(v.status)))
        fail();
    return { ...v, cases: parseFlowRegressionCases(v.cases) } as unknown as FlowRegressionSuite;
}
export function parseFlowRegressionCatalog(v: unknown): FlowRegressionCatalog {
    if (!record(v))
        fail();
    if (Object.hasOwn(v, 'releaseRequestId'))
        return parseFlowRegressionSuites(v);
    if (Object.hasOwn(v, 'id'))
        return parseFlowRegressionSuite(v);
    exact(v, ['businessId', 'recipeId', 'draft', 'suites']);
    if (![v.businessId, v.recipeId].every(isFlowPublicationId) || !Array.isArray(v.suites) || v.suites.length > 100 || !record(v.draft))
        fail();
    const draft = v.draft;
    exact(draft, ['revision', 'fingerprint', 'state', 'reasons', 'paths', 'sideEffects']);
    if (draft.revision !== null && !integer(draft.revision, 1) || draft.fingerprint !== null && (typeof draft.fingerprint !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(draft.fingerprint))
        || !['available', 'unavailable'].includes(String(draft.state)) || draft.sideEffects !== false || !Array.isArray(draft.reasons) || draft.reasons.length > 20
        || draft.reasons.some(reason => typeof reason !== 'string' || !/^[A-Za-z0-9_.:-]{1,160}$/.test(reason)) || new Set(draft.reasons).size !== draft.reasons.length
        || !Array.isArray(draft.paths) || draft.paths.length > 100)
        fail();
    const paths = new Set<string>();
    for (const path of draft.paths) {
        if (!record(path))
            fail();
        exact(path, ['id', 'outcomeId']);
        if (typeof path.id !== 'string' || !path.id || path.id.length > 20000 || /[\x00-\x1f\x7f]/.test(path.id) || paths.has(path.id) || typeof path.outcomeId !== 'string' || !path.outcomeId || path.outcomeId.length > 200 || /[\x00-\x1f\x7f]/.test(path.outcomeId))
            fail();
        paths.add(path.id);
    }
    if (draft.state === 'available' && (draft.revision === null || draft.fingerprint === null || draft.paths.length === 0 || draft.reasons.length !== 0)
        || draft.state === 'unavailable' && (draft.paths.length !== 0 || draft.reasons.length === 0))
        fail();
    const seen = new Set<string>();
    for (const suite of v.suites) {
        if (!record(suite))
            fail();
        exact(suite, ['id', 'revision', 'name', 'required', 'status', 'caseCount']);
        if (!isFlowPublicationId(suite.id) || seen.has(suite.id) || !integer(suite.revision, 1) || typeof suite.name !== 'string' || !suite.name.trim() || suite.name.length > 120 || typeof suite.required !== 'boolean'
            || !['active', 'archived'].includes(String(suite.status)) || !integer(suite.caseCount) || suite.caseCount > 100)
            fail();
        seen.add(suite.id);
    }
    return v as unknown as FlowRegressionConfiguration;
}
export function parseManagedFlowRegressionInput(raw: string | Uint8Array): ManagedFlowRegressionInput {
    const v = parseBoundedJson(raw, 1024);
    if (!record(v))
        fail();
    exact(v, ['kind', 'releaseRequestId', 'suiteId', 'expectedSuiteRevision']);
    if (v.kind !== 'managed_deployment' || !isFlowPublicationId(v.releaseRequestId) || !isFlowPublicationId(v.suiteId) || !integer(v.expectedSuiteRevision, 1))
        fail();
    return v as unknown as ManagedFlowRegressionInput;
}
export function parseFlowRegressionSuites(v: unknown): FlowRegressionSuites {
    if (!record(v))
        fail();
    exact(v, ['businessId', 'recipeId', 'releaseRequestId', 'suites']);
    if (!isFlowPublicationId(v.businessId) || !isFlowPublicationId(v.recipeId) || !isFlowPublicationId(v.releaseRequestId) || !Array.isArray(v.suites) || v.suites.length > 100)
        fail();
    const seen = new Set<string>();
    for (const suite of v.suites) {
        if (!record(suite))
            fail();
        exact(suite, ['id', 'name', 'revision', 'current', 'caseCount', 'evidence']);
        if (!isFlowPublicationId(suite.id) || seen.has(suite.id) || typeof suite.name !== 'string' || !suite.name.trim() || suite.name.length > 120
            || !integer(suite.revision, 1) || typeof suite.current !== 'boolean' || (suite.current ? !integer(suite.caseCount) || suite.caseCount > 100 : suite.caseCount !== null)
            || !['passed', 'missing', 'stale', 'invalid'].includes(String(suite.evidence)))
            fail();
        seen.add(suite.id);
    }
    return v as unknown as FlowRegressionSuites;
}
export function parseFlowRegressionRun(v: unknown): FlowRegressionRun {
    if (!record(v))
        fail();
    exact(v, ['businessId', 'recipeId', 'releaseRequestId', 'id', 'suiteId', 'suiteRevision', 'status', 'counts', 'startedAt', 'completedAt', 'errorCode', 'sideEffects']);
    if (!['businessId', 'recipeId', 'releaseRequestId', 'id', 'suiteId'].every(key => isFlowPublicationId(v[key]))
        || !integer(v.suiteRevision, 1) || !['running', 'passed', 'failed', 'error'].includes(String(v.status))
        || !timestamp(v.startedAt) || v.completedAt !== null && !timestamp(v.completedAt) || !record(v.counts) || v.sideEffects !== false
        || v.errorCode !== (v.status === 'error' ? 'evaluation_failed' : null))
        fail();
    exact(v.counts, ['total', 'passed', 'failed', 'skipped']);
    if (Object.values(v.counts).some(value => !integer(value) || value > 100))
        fail();
    const counts = v.counts as FlowRegressionRun['counts'];
    if (counts.total !== counts.passed + counts.failed + counts.skipped || (v.status === 'running') !== (v.completedAt === null)
        || v.status === 'passed' && (counts.total < 1 || counts.failed !== 0 || counts.skipped !== 0))
        fail();
    return v as unknown as FlowRegressionRun;
}
