// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export type FlowGovernanceId = string;
export type FlowGovernanceRevision = number;
export interface FlowGovernanceConfiguration {
    businessId: FlowGovernanceId;
    recipeId: FlowGovernanceId;
    revision: FlowGovernanceRevision;
    approvalMode: 'none' | 'single_reviewer';
    regressionMode: 'off' | 'required';
    currentReleaseRequestId: FlowGovernanceId | null;
}
