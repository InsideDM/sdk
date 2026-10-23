// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export interface ImportWebsiteKnowledgeInput {
    url: string;
    maxPages?: number;
}
export interface WebsiteKnowledgeImportReceipt {
    businessId: string;
    ingestionRunId: string;
    url: string;
    maxPages: number;
    status: 'accepted';
    auditId: string;
    requestId: string;
}
