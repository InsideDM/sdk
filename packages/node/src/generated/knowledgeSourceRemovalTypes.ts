// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export interface RemoveKnowledgeSourceInput {
    expectedVersion: number;
}
export interface KnowledgeSourceRemovalReceipt {
    businessId: string;
    sourceId: string;
    documentVersion: number;
    sectionsDropped: number;
    sectionsHidden: number;
    sectionsRequiringRefresh: number;
    auditId: string;
    requestId: string;
}
