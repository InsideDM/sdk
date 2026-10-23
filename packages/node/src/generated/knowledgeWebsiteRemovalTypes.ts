// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export interface RemoveWebsiteKnowledgeInput {
    url: string;
}
export interface WebsiteKnowledgeRemovalReceipt {
    businessId: string;
    url: string;
    sourceId: string | null;
    outcome: 'removed' | 'already_removed';
    documentVersion: number;
    sectionsDropped: number;
    sectionsHidden: number;
    sectionsRequiringRefresh: number;
    cancelledImports: number;
    auditId: string;
    requestId: string;
}
