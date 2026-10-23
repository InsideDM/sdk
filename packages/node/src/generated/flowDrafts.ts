// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as FLOW_DRAFT_SCHEMAS } from './schemas.js';
import type { FlowDraftSnapshot, ManagedFlowDraftSaveInput, ManagedFlowDraftSaveReceipt } from './flowDraftTypes.js';
import { parseBoundedJson } from './boundedJson.js';
import { parseApplyBlueprintUpdate, parseBlueprintUpdateReceipt, type ApplyBlueprintUpdateInput, type BlueprintUpdateReceipt } from './flowBlueprintUpdates.js';
export class FlowDraftRequestError extends Error {
    constructor() { super('The flow draft request or result is invalid.'); this.name = 'FlowDraftRequestError'; }
}
export function parseFlowDraftSnapshot(value: unknown): FlowDraftSnapshot {
    try {
        const draft = decodeContract({ $ref: '#/components/schemas/FlowDraftSnapshot' }, value, { schemas: FLOW_DRAFT_SCHEMAS }) as FlowDraftSnapshot;
        if (draft.fingerprint !== null && !/^sha256:[a-f0-9]{64}$/.test(draft.fingerprint) || new Set(draft.reasons).size !== draft.reasons.length)
            throw new Error();
        if (draft.state === 'available') {
            if (draft.revision === null || draft.fingerprint === null || draft.reasons.length || draft.definition === null || draft.definition.businessId !== draft.businessId || draft.definition.id !== draft.recipeId)
                throw new Error();
        }
        else if (draft.definition !== null || !draft.reasons.length)
            throw new Error();
        return draft;
    }
    catch {
        throw new FlowDraftRequestError();
    }
}
export function parseFlowDraftSave(raw: string | Uint8Array): ManagedFlowDraftSaveInput | ApplyBlueprintUpdateInput {
    try {
        const value = parseBoundedJson(raw, 528384);
        if (value && typeof value === 'object' && 'kind' in value && value.kind === 'blueprint_update')
            return parseApplyBlueprintUpdate(raw);
        const input = decodeContract({ $ref: '#/components/schemas/ManagedFlowDraftSaveInput' }, value, { schemas: FLOW_DRAFT_SCHEMAS }) as ManagedFlowDraftSaveInput;
        if (new TextEncoder().encode(JSON.stringify(input.definition)).byteLength > 512000)
            throw new Error();
        return input;
    }
    catch {
        throw new FlowDraftRequestError();
    }
}
export function parseFlowDraftSaveReceipt(value: unknown): ManagedFlowDraftSaveReceipt | BlueprintUpdateReceipt {
    try {
        if (!value || typeof value !== 'object' || !('kind' in value))
            return parseBlueprintUpdateReceipt(value);
        const receipt = decodeContract({ $ref: '#/components/schemas/ManagedFlowDraftSaveReceipt' }, value, { schemas: FLOW_DRAFT_SCHEMAS }) as ManagedFlowDraftSaveReceipt;
        if (!/^sha256:[a-f0-9]{64}$/.test(receipt.fingerprint))
            throw new Error();
        return receipt;
    }
    catch {
        throw new FlowDraftRequestError();
    }
}
export function validateFlowDraftSaveReceipt(value: unknown, input: ManagedFlowDraftSaveInput | ApplyBlueprintUpdateInput, businessId: string, recipeId: string) {
    const receipt = parseFlowDraftSaveReceipt(value);
    if (receipt.businessId !== businessId || receipt.recipeId !== recipeId)
        throw new FlowDraftRequestError();
    if (input.kind === 'managed_draft') {
        if (!('kind' in receipt) || receipt.kind !== 'managed_draft' || receipt.deploymentRevision !== input.expectedDeploymentRevision
            || receipt.draftRevision !== input.expectedDraftRevision + (receipt.status === 'draft_updated' ? 1 : 0))
            throw new FlowDraftRequestError();
    }
    else if ('kind' in receipt || JSON.stringify(receipt.target) !== JSON.stringify(input.target)
        || receipt.deploymentRevision !== input.expectedDeploymentRevision + (receipt.status === 'draft_updated' ? 1 : 0)
        || ![input.expectedDraftRevision, ...(receipt.status === 'draft_updated' ? [input.expectedDraftRevision + 1] : [])].includes(receipt.draftRevision))
        throw new FlowDraftRequestError();
    return receipt;
}
