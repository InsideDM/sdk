// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export type FlowDeploymentCatalogId = string;
export type FlowDeploymentCatalogRevision = number;
export interface FlowDeploymentSummary {
    recipeId: FlowDeploymentCatalogId;
    name: string;
    revision: FlowDeploymentCatalogRevision;
    flowStatus: 'draft' | 'shadow' | 'active' | 'paused' | 'retired';
}
export interface FlowDeploymentCatalog {
    businessId: FlowDeploymentCatalogId;
    deployments: FlowDeploymentSummary[];
    page: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}
