// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export type FlowSimulationId = string;
export type FlowSimulationRevision = number;
export type FlowSimulationCode = string;
export type FlowSimulationVariable = string;
export interface SimulateFlowDraftInput {
    expectedRevision: FlowSimulationRevision;
    variables?: Record<string, FlowSimulationVariable>;
    pathId?: string;
}
export interface ManagedFlowSimulationInput extends SimulateFlowDraftInput {
    kind: 'managed_draft';
}
export interface FlowDraftSimulation {
    businessId: FlowSimulationId;
    recipeId: FlowSimulationId;
    draftRevision: FlowSimulationRevision;
    graphFingerprint: string;
    status: 'passed' | 'blocked';
    selectedPath: {
        id: string;
        outcomeId: string;
        outcomeKind: 'success' | 'handoff' | 'stopped' | 'failed';
    } | null;
    issues: Array<{
        code: FlowSimulationCode;
        nodeId: string | null;
    }>;
    issueCount: number;
    readiness: Array<{
        nodeId: string | null;
        actionType: string | null;
        ready: boolean;
        blockedReasons: FlowSimulationCode[];
        reviewReasons: FlowSimulationCode[];
    }>;
    coverageRecorded: boolean;
    sideEffects: false;
}
