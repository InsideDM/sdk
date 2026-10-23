// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import type { FlowDefinitionV1 } from './nativeFlowTypes.js';
export type FlowDraftId = string;
export type FlowDraftRevision = number;
export type FlowDraftUnavailableReason = 'missing_draft' | 'unsupported_draft_format' | 'invalid_draft' | 'draft_identity_mismatch' | 'draft_fingerprint_mismatch';
interface FlowDraftMetadata {
    businessId: FlowDraftId;
    recipeId: FlowDraftId;
    deploymentRevision: FlowDraftRevision;
    sideEffects: false;
}
export interface AvailableFlowDraft extends FlowDraftMetadata {
    revision: FlowDraftRevision;
    fingerprint: string;
    state: 'available';
    reasons: [
    ];
    definition: FlowDefinitionV1;
}
export interface UnavailableFlowDraft extends FlowDraftMetadata {
    revision: FlowDraftRevision | null;
    fingerprint: string | null;
    state: 'unavailable';
    reasons: FlowDraftUnavailableReason[];
    definition: null;
}
export type FlowDraftSnapshot = AvailableFlowDraft | UnavailableFlowDraft;
export interface ManagedFlowDraftSaveInput {
    kind: 'managed_draft';
    expectedDeploymentRevision: FlowDraftRevision;
    expectedDraftRevision: FlowDraftRevision;
    definition: FlowDefinitionV1;
}
export interface ManagedFlowDraftSaveReceipt {
    kind: 'managed_draft';
    businessId: FlowDraftId;
    recipeId: FlowDraftId;
    deploymentRevision: FlowDraftRevision;
    draftRevision: FlowDraftRevision;
    fingerprint: string;
    status: 'draft_updated' | 'unchanged';
    sideEffects: false;
}
