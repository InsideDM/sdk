// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import type { PublicFlowRun } from './flowRunProgress.js';
export interface FlowRunListParams {
    flowId?: string;
    status?: PublicFlowRun['status'];
    limit?: number;
    cursor?: string;
}
export interface FlowRunPage {
    businessId: string;
    data: PublicFlowRun[];
    page: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}
