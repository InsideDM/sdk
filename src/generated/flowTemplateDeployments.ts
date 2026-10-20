// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
export const FLOW_TEMPLATE_OPERATIONS = [{
        id: 'getFlowTemplateCatalog', name: 'flows.templates.catalog', audience: 'conversations', method: 'GET',
        path: '/api/v1/dashboard/{businessId}/automation-runtime/catalog', pathTemplate: '/api/v1/dashboard/:businessId/automation-runtime/catalog',
        principalKinds: ['business_key', 'delegation'], requiredScopes: ['flows.deploy'], humanPermissions: ['flows.edit'], idempotency: 'none', scope: 'workspace',
    }, {
        id: 'importFlowTemplate', name: 'flows.templates.import', audience: 'conversations', method: 'POST',
        path: '/api/v1/dashboard/{businessId}/automation-runtime/template-packs/{packId}/import', pathTemplate: '/api/v1/dashboard/:businessId/automation-runtime/template-packs/:packId/import',
        principalKinds: ['business_key', 'delegation'], requiredScopes: ['flows.deploy'], humanPermissions: ['flows.edit'], idempotency: 'required', scope: 'workspace',
    }] as const;
export interface FlowTemplateBinding {
    endpointId: string;
    expectedRevision: number;
}
export interface FlowTemplateImportBody {
    version: string;
    bindings?: Record<string, FlowTemplateBinding>;
}
export interface FlowTemplateImportReceipt {
    businessId: string;
    recipeId: string;
    packId: string;
    version: string;
    digest: string;
    status: 'draft';
}
export interface FlowTemplateSummary {
    id: string;
    version: string;
    digest: string;
    name: string;
    description: string;
    channel: 'instagram' | 'whatsapp' | 'unified';
    dependencySlots: Array<{
        id: string;
        kind: 'webhook_endpoint';
        method: 'POST';
        required: true;
    }>;
}
export interface FlowTemplateCatalogQuery {
    limit: number;
    cursor?: string;
}
export interface FlowTemplateCatalog {
    businessId: string;
    templates: FlowTemplateSummary[];
    dependencies: Array<{
        id: string;
        kind: 'webhook_endpoint';
        name: string;
        revision: number;
    }>;
    page: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}
export class FlowTemplateRequestError extends Error {
    constructor() { super('The flow template request or response is invalid.'); this.name = 'FlowTemplateRequestError'; }
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const id = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
const version = (v: unknown): v is string => typeof v === 'string' && /^[1-9]\d{0,9}$/.test(v) && Number(v) <= 2147483647;
const revision = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 2147483647;
const label = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max && !/[\x00-\x1f\x7f]/.test(v);
const digest = (v: unknown): v is string => typeof v === 'string' && /^sha256:[0-9a-f]{64}$/.test(v);
function fail(): never { throw new FlowTemplateRequestError(); }
function exact(v: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) {
    if (required.some(key => !Object.hasOwn(v, key)) || Object.keys(v).some(key => ![...required, ...optional].includes(key)))
        fail();
}
export function parseFlowTemplateId(v: unknown): string { return id(v) ? v : fail(); }
export function parseFlowTemplateImport(raw: string | Uint8Array): FlowTemplateImportBody {
    const v = parseBoundedJson(raw, 16 * 1024);
    if (!record(v))
        fail();
    exact(v, ['version'], ['bindings']);
    if (!version(v.version))
        fail();
    if (v.bindings === undefined)
        return { version: v.version };
    if (!record(v.bindings) || Object.keys(v.bindings).length > 20)
        fail();
    const entries: Array<[
        string,
        FlowTemplateBinding
    ]> = [];
    for (const [slot, binding] of Object.entries(v.bindings)) {
        if (!id(slot) || !record(binding))
            fail();
        exact(binding, ['endpointId', 'expectedRevision']);
        if (!uuid(binding.endpointId) || !revision(binding.expectedRevision))
            fail();
        entries.push([slot, { endpointId: binding.endpointId, expectedRevision: binding.expectedRevision }]);
    }
    return { version: v.version, bindings: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) };
}
export function parseFlowTemplateCatalogQuery(route: string): FlowTemplateCatalogQuery {
    const mark = route.indexOf('?');
    if (mark < 0)
        fail();
    const query = new URLSearchParams(route.slice(mark + 1));
    if (query.get('view') !== 'flow_templates' || [...query.keys()].some(key => !['view', 'limit', 'cursor'].includes(key))
        || ['view', 'limit', 'cursor'].some(key => query.getAll(key).length > 1))
        fail();
    const limit = query.get('limit');
    if (limit !== null && (!/^[1-9]\d{0,2}$/.test(limit) || Number(limit) > 100))
        fail();
    const cursor = query.get('cursor');
    if (cursor !== null && (!cursor.length || cursor.length > 2048 || !/^[A-Za-z0-9_.-]+$/.test(cursor)))
        fail();
    return { limit: limit === null ? 25 : Number(limit), ...(cursor === null ? {} : { cursor }) };
}
export function parseFlowTemplateImportReceipt(v: unknown): FlowTemplateImportReceipt {
    if (!record(v))
        fail();
    exact(v, ['businessId', 'recipeId', 'packId', 'version', 'digest', 'status']);
    if (!uuid(v.businessId) || !uuid(v.recipeId) || !id(v.packId) || !version(v.version) || !digest(v.digest) || v.status !== 'draft')
        fail();
    return v as unknown as FlowTemplateImportReceipt;
}
export function parseFlowTemplateCatalog(v: unknown): FlowTemplateCatalog {
    if (!record(v))
        fail();
    exact(v, ['businessId', 'templates', 'dependencies', 'page']);
    if (!uuid(v.businessId) || !Array.isArray(v.templates) || v.templates.length > 50 || !Array.isArray(v.dependencies) || v.dependencies.length > 100 || !record(v.page))
        fail();
    const keys = new Set<string>();
    for (const template of v.templates) {
        if (!record(template))
            fail();
        exact(template, ['id', 'version', 'digest', 'name', 'description', 'channel', 'dependencySlots']);
        if (!id(template.id) || !version(template.version) || !digest(template.digest) || !label(template.name, 120) || !label(template.description, 500)
            || !['instagram', 'whatsapp', 'unified'].includes(String(template.channel)) || !Array.isArray(template.dependencySlots) || template.dependencySlots.length > 20)
            fail();
        const key = template.id + '@' + template.version;
        if (keys.has(key))
            fail();
        keys.add(key);
        const slots = new Set<string>();
        for (const slot of template.dependencySlots) {
            if (!record(slot))
                fail();
            exact(slot, ['id', 'kind', 'method', 'required']);
            if (!id(slot.id) || slot.kind !== 'webhook_endpoint' || slot.method !== 'POST' || slot.required !== true || slots.has(slot.id))
                fail();
            slots.add(slot.id);
        }
    }
    const resources = new Set<string>();
    for (const item of v.dependencies) {
        if (!record(item))
            fail();
        exact(item, ['id', 'kind', 'name', 'revision']);
        if (!uuid(item.id) || item.kind !== 'webhook_endpoint' || !label(item.name, 120) || !revision(item.revision) || resources.has(item.id))
            fail();
        resources.add(item.id);
    }
    exact(v.page, ['hasMore', 'nextCursor']);
    if (typeof v.page.hasMore !== 'boolean' || (v.page.hasMore ? typeof v.page.nextCursor !== 'string' || !v.page.nextCursor.length || v.page.nextCursor.length > 2048 || !/^[A-Za-z0-9_.-]+$/.test(v.page.nextCursor) : v.page.nextCursor !== null))
        fail();
    return v as unknown as FlowTemplateCatalog;
}
