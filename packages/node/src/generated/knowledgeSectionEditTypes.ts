// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export interface SetKnowledgeSectionOverrideInput {
    expectedVersion: number;
    overrideMd: string | null;
}
export interface AcknowledgeKnowledgeSectionOverrideInput {
    expectedVersion: number;
}
export interface KnowledgeSectionEditReceipt {
    businessId: string;
    documentId: string;
    sectionId: string;
    stableKey: string;
    action: 'set_override' | 'clear_override' | 'acknowledge_override';
    documentVersion: number;
    auditId: string;
    requestId: string;
}
