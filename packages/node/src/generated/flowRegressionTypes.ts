// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import type { JsonValue } from './boundedJson.js';
export type FlowRegressionId = string;
export type FlowRegressionRevision = number;
export type FlowRegressionCount = number;
export type FlowRegressionTimestamp = string;
export interface FlowRegressionSuites {
    businessId: FlowRegressionId;
    recipeId: FlowRegressionId;
    releaseRequestId: FlowRegressionId;
    suites: Array<{
        id: FlowRegressionId;
        name: string;
        revision: FlowRegressionRevision;
        current: boolean;
        caseCount: FlowRegressionCount | null;
        evidence: 'passed' | 'missing' | 'stale' | 'invalid';
    }>;
}
export interface RunFlowRegressionInput {
    releaseRequestId: FlowRegressionId;
    suiteId: FlowRegressionId;
    expectedSuiteRevision: FlowRegressionRevision;
}
export interface ManagedFlowRegressionInput extends RunFlowRegressionInput {
    kind: 'managed_deployment';
}
export interface FlowRegressionRun {
    businessId: FlowRegressionId;
    recipeId: FlowRegressionId;
    releaseRequestId: FlowRegressionId;
    id: FlowRegressionId;
    suiteId: FlowRegressionId;
    suiteRevision: FlowRegressionRevision;
    status: 'running' | 'passed' | 'failed' | 'error';
    counts: {
        total: FlowRegressionCount;
        passed: FlowRegressionCount;
        failed: FlowRegressionCount;
        skipped: FlowRegressionCount;
    };
    startedAt: FlowRegressionTimestamp;
    completedAt: FlowRegressionTimestamp | null;
    errorCode: 'evaluation_failed' | null;
    sideEffects: false;
}
export interface FlowRegressionCase {
    id: string;
    name: string;
    bindings: Record<string, JsonValue>;
    expectedPathId: string;
    expectedOutcomeId: string;
    expectedSpecialistNode?: string | null;
    forbiddenActionTypes?: string[];
}
export interface SaveFlowRegressionSuiteInput {
    suiteId: FlowRegressionId | null;
    expectedRevision: FlowRegressionRevision | null;
    name: string;
    required: boolean;
    status: 'active' | 'archived';
    cases: FlowRegressionCase[];
}
export interface ManagedFlowRegressionSuiteInput extends SaveFlowRegressionSuiteInput {
    kind: 'managed_deployment';
}
export interface FlowRegressionSuite {
    businessId: FlowRegressionId;
    recipeId: FlowRegressionId;
    id: FlowRegressionId;
    revision: FlowRegressionRevision;
    name: string;
    required: boolean;
    status: 'active' | 'archived';
    cases: FlowRegressionCase[];
}
export interface FlowRegressionConfiguration {
    businessId: FlowRegressionId;
    recipeId: FlowRegressionId;
    draft: {
        revision: FlowRegressionRevision | null;
        fingerprint: string | null;
        state: 'available' | 'unavailable';
        reasons: string[];
        paths: Array<{
            id: string;
            outcomeId: string;
        }>;
        sideEffects: false;
    };
    suites: Array<{
        id: FlowRegressionId;
        revision: FlowRegressionRevision;
        name: string;
        required: boolean;
        status: 'active' | 'archived';
        caseCount: FlowRegressionCount;
    }>;
}
export type FlowRegressionCatalog = FlowRegressionSuites | FlowRegressionConfiguration | FlowRegressionSuite;
