// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
import { parseFlowTemplateImport, type FlowTemplateBinding } from './flowTemplateDeployments.js';
import { parseBlueprintKey } from './partnerBlueprints.js';
export const BLUEPRINT_UPDATE_OPERATIONS = [{
        id: 'previewBlueprintUpdate', name: 'flows.deployments.previewUpdate', audience: 'conversations', method: 'POST',
        path: '/api/v1/flows/{businessId}/recipes/{recipeId}/graph/deployment-preview', pathTemplate: '/api/v1/flows/:businessId/recipes/:recipeId/graph/deployment-preview',
        principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.deploy'], humanPermissions: ['flows.edit'], idempotency: 'none', scope: 'workspace', userExecution: 'direct',
    }, {
        id: 'saveFlowDraft', name: 'flows.drafts.save', audience: 'conversations', method: 'PUT',
        path: '/api/v1/flows/{businessId}/recipes/{recipeId}/graph', pathTemplate: '/api/v1/flows/:businessId/recipes/:recipeId/graph',
        principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['flows.deploy'], humanPermissions: ['flows.edit'], idempotency: 'required', scope: 'workspace', userExecution: 'direct', bodyLimit: 528384,
    }] as const;
export interface BlueprintUpdateTarget {
    applicationId: string;
    key: string;
    version: number;
    digest: string;
}
export interface PreviewBlueprintUpdateInput {
    target: BlueprintUpdateTarget;
    bindings?: Record<string, FlowTemplateBinding>;
}
export interface ApplyBlueprintUpdateInput extends PreviewBlueprintUpdateInput {
    kind: 'blueprint_update';
    expectedDeploymentRevision: number;
    expectedDraftRevision: number;
}
export const BLUEPRINT_UPDATE_REASONS = ['draft_changed', 'draft_missing', 'draft_unavailable', 'source_unavailable', 'source_changed', 'override_incompatible', 'binding_slots_changed', 'binding_required', 'binding_unavailable', 'binding_revision_conflict', 'target_invalid'] as const;
export type BlueprintUpdateReason = typeof BLUEPRINT_UPDATE_REASONS[number];
export interface BlueprintUpdatePreview {
    businessId: string;
    recipeId: string;
    deploymentRevision: number;
    draftRevision: number | null;
    from: BlueprintUpdateTarget;
    target: BlueprintUpdateTarget;
    state: 'ready' | 'unchanged' | 'action_required';
    reasons: BlueprintUpdateReason[];
    bindings: Record<string, FlowTemplateBinding>;
    changes: null | {
        nameChanged: boolean;
        templateChanged: boolean;
        parameters: Array<{
            key: string;
            previous: string | number | null;
            next: string | number | null;
            clientOverridePreserved: boolean;
        }>;
        addedDependencySlots: string[];
        removedDependencySlots: string[];
        preservedOverrideKeys: string[];
    };
}
export interface BlueprintUpdateReceipt {
    businessId: string;
    recipeId: string;
    deploymentRevision: number;
    draftRevision: number;
    status: 'draft_updated' | 'unchanged';
    target: BlueprintUpdateTarget;
}
export class BlueprintUpdateRequestError extends Error {
    constructor() { super('The blueprint update request or response is invalid.'); this.name = 'BlueprintUpdateRequestError'; }
}
function fail(): never { throw new BlueprintUpdateRequestError(); }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0 && v <= 2147483647;
const uuid = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
function exact(v: Record<string, unknown>, required: string[], optional: string[] = []) { if (required.some(k => !Object.hasOwn(v, k)) || Object.keys(v).some(k => ![...required, ...optional].includes(k)))
    fail(); }
function target(v: unknown): BlueprintUpdateTarget {
    if (!record(v))
        fail();
    exact(v, ['applicationId', 'key', 'version', 'digest']);
    try {
        parseBlueprintKey(v.key);
        parseFlowTemplateImport(JSON.stringify({ version: String(v.version), blueprint: { applicationId: v.applicationId, digest: v.digest } }));
    }
    catch {
        return fail();
    }
    if (!integer(v.version))
        fail();
    return { applicationId: v.applicationId as string, key: v.key as string, version: v.version, digest: v.digest as string };
}
function bindings(v: unknown): Record<string, FlowTemplateBinding> { try {
    return parseFlowTemplateImport(JSON.stringify({ version: '1', bindings: v })).bindings ?? fail();
}
catch {
    return fail();
} }
function list(v: unknown, max: number): string[] { if (!Array.isArray(v) || v.length > max || new Set(v).size !== v.length)
    fail(); try {
    return v.map(parseBlueprintKey);
}
catch {
    return fail();
} }
function input(raw: string | Uint8Array, write: boolean) {
    const v = parseBoundedJson(raw, 16384);
    if (!record(v))
        fail();
    exact(v, write ? ['kind', 'target', 'expectedDeploymentRevision', 'expectedDraftRevision'] : ['target'], ['bindings']);
    if (write && (v.kind !== 'blueprint_update' || !integer(v.expectedDeploymentRevision) || !integer(v.expectedDraftRevision)))
        fail();
    return { target: target(v.target), ...(v.bindings === undefined ? {} : { bindings: bindings(v.bindings) }), ...(write ? { kind: 'blueprint_update' as const, expectedDeploymentRevision: v.expectedDeploymentRevision as number, expectedDraftRevision: v.expectedDraftRevision as number } : {}) };
}
export function parsePreviewBlueprintUpdate(raw: string | Uint8Array): PreviewBlueprintUpdateInput { return input(raw, false); }
export function parseApplyBlueprintUpdate(raw: string | Uint8Array): ApplyBlueprintUpdateInput { return input(raw, true) as ApplyBlueprintUpdateInput; }
export function parseBlueprintUpdatePreview(v: unknown): BlueprintUpdatePreview {
    if (!record(v))
        fail();
    exact(v, ['businessId', 'recipeId', 'deploymentRevision', 'draftRevision', 'from', 'target', 'state', 'reasons', 'bindings', 'changes']);
    if (!uuid(v.businessId) || !uuid(v.recipeId) || !integer(v.deploymentRevision) || v.draftRevision !== null && !integer(v.draftRevision)
        || !['ready', 'unchanged', 'action_required'].includes(String(v.state)) || !Array.isArray(v.reasons) || v.reasons.length > BLUEPRINT_UPDATE_REASONS.length || new Set(v.reasons).size !== v.reasons.length || v.reasons.some(reason => !BLUEPRINT_UPDATE_REASONS.includes(reason)))
        fail();
    const from = target(v.from), to = target(v.target);
    if (from.applicationId !== to.applicationId || from.key !== to.key)
        fail();
    if (v.state === 'action_required' ? !v.reasons.length : v.reasons.length > 0 || v.draftRevision === null || v.changes === null)
        fail();
    if (v.changes !== null) {
        if (!record(v.changes))
            fail();
        const changes = v.changes;
        exact(changes, ['nameChanged', 'templateChanged', 'parameters', 'addedDependencySlots', 'removedDependencySlots', 'preservedOverrideKeys']);
        if (typeof changes.nameChanged !== 'boolean' || typeof changes.templateChanged !== 'boolean' || !Array.isArray(changes.parameters) || changes.parameters.length > 40)
            fail();
        const keys = new Set<string>();
        for (const change of changes.parameters) {
            if (!record(change))
                fail();
            exact(change, ['key', 'previous', 'next', 'clientOverridePreserved']);
            let key: string;
            try {
                key = parseBlueprintKey(change.key);
            }
            catch {
                return fail();
            }
            if (keys.has(key) || typeof change.clientOverridePreserved !== 'boolean')
                fail();
            keys.add(key);
            for (const value of [change.previous, change.next])
                if (value !== null && (typeof value === 'string' ? value.length > 1000 || /[\x00-\x1f\x7f]/.test(value) : typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 2147483647))
                    fail();
            if (change.previous === null && change.next === null)
                fail();
        }
        const added = list(changes.addedDependencySlots, 20), removed = list(changes.removedDependencySlots, 20);
        if (added.some(id => removed.includes(id)))
            fail();
        list(changes.preservedOverrideKeys, 20);
    }
    return { ...v, from, target: to, bindings: bindings(v.bindings) } as unknown as BlueprintUpdatePreview;
}
export function parseBlueprintUpdateReceipt(v: unknown): BlueprintUpdateReceipt {
    if (!record(v))
        fail();
    exact(v, ['businessId', 'recipeId', 'deploymentRevision', 'draftRevision', 'status', 'target']);
    if (!uuid(v.businessId) || !uuid(v.recipeId) || !integer(v.deploymentRevision) || !integer(v.draftRevision) || !['draft_updated', 'unchanged'].includes(String(v.status)))
        fail();
    return { ...v, target: target(v.target) } as unknown as BlueprintUpdateReceipt;
}
