// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export const PUBLIC_OPERATION_STATES = [
    'accepted', 'queued', 'running', 'waiting', 'succeeded', 'failed', 'cancelled',
    'expired', 'requires_reconciliation', 'unknown',
] as const;
export type PublicOperationState = (typeof PUBLIC_OPERATION_STATES)[number];
export const PUBLIC_OPERATION_EFFECTS = ['none', 'partial', 'submitted', 'unknown'] as const;
export type PublicOperationEffects = (typeof PUBLIC_OPERATION_EFFECTS)[number];
export interface PublicOperation {
    id: string;
    kind: string;
    state: PublicOperationState;
    revision: string;
    resource: {
        type: string;
        id: string;
    } | null;
    phase: string | null;
    effects: PublicOperationEffects;
    reasonCode: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
}
export function isTerminalOperationState(state: PublicOperationState): boolean {
    return state === 'succeeded' || state === 'failed' || state === 'cancelled' || state === 'expired';
}
