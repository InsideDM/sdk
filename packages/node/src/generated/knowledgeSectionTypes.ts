// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export interface KnowledgeSectionContent {
    id: string;
    businessId: string;
    documentId: string;
    documentVersion: number;
    stableKey: string;
    parentKey: string | null;
    title: string;
    ordinal: number;
    generatedMd: string;
    manualOverrideMd: string | null;
    overrideStale: boolean;
    overrideOrphaned: boolean;
    effectiveHash: string | null;
    updatedAt: string;
}
export interface KnowledgeSectionParams {
    limit?: number;
    cursor?: string;
}
export interface KnowledgeSectionContentPage {
    businessId: string;
    data: KnowledgeSectionContent[];
    page: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}
