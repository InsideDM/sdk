// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
const base = { audience: 'accounts', principalKinds: ['app'], requiredScopes: ['platform.blueprints.manage'], scope: 'portfolio' } as const;
export const PARTNER_BLUEPRINT_OPERATIONS = [
    { ...base, id: 'listBlueprintTemplates', name: 'platform.blueprints.templates', method: 'GET', path: '/api/v1/platform/blueprints/templates', pathTemplate: '/api/v1/platform/blueprints/templates', idempotency: 'none' },
    { ...base, id: 'createBlueprintVersion', name: 'platform.blueprints.create', method: 'POST', path: '/api/v1/platform/blueprints/versions', pathTemplate: '/api/v1/platform/blueprints/versions', idempotency: 'required' },
    { ...base, id: 'listBlueprintVersions', name: 'platform.blueprints.versions', method: 'GET', path: '/api/v1/platform/blueprints/{blueprintKey}/versions', pathTemplate: '/api/v1/platform/blueprints/:blueprintKey/versions', idempotency: 'none' },
    { ...base, id: 'getBlueprintVersion', name: 'platform.blueprints.get', method: 'GET', path: '/api/v1/platform/blueprints/{blueprintKey}/versions/{version}', pathTemplate: '/api/v1/platform/blueprints/:blueprintKey/versions/:version', idempotency: 'none' },
] as const;
export interface BlueprintTemplateReference {
    id: string;
    version: number;
    digest: string;
}
export type BlueprintParameters = Record<string, string | number>;
export interface CreateBlueprintVersionInput {
    key: string;
    version: number;
    name: string;
    description: string;
    template: BlueprintTemplateReference;
    parameters?: BlueprintParameters;
    clientOverrides?: string[];
}
export interface BlueprintDeclarations {
    dependencies: Array<{
        id: string;
        kind: 'webhook_endpoint';
        method: 'POST';
    }>;
    variables: Array<{
        id: string;
        key: string;
        type: string;
        scope: string;
        required: boolean;
        mutable: boolean;
    }>;
    capabilities: {
        channels: string[];
        actions: string[];
    };
}
export interface BlueprintDefinition extends Omit<CreateBlueprintVersionInput, 'parameters' | 'clientOverrides'>, BlueprintDeclarations {
    schemaVersion: 'inside-flow-blueprint/v1';
    parameters: BlueprintParameters;
    clientOverrides: string[];
}
export interface PublicBlueprintVersion {
    applicationId: string;
    definition: BlueprintDefinition;
    digest: string;
    createdAt: string;
}
export type BlueprintParameterDefinition = {
    id: string;
    type: 'string';
    defaultValue: string;
    maxLength: number;
} | {
    id: string;
    type: 'integer';
    defaultValue: number;
    minimum: number;
    maximum: number;
};
export interface PublicBlueprintTemplate extends BlueprintDeclarations {
    template: BlueprintTemplateReference;
    name: string;
    description: string;
    parameterDefinitions: BlueprintParameterDefinition[];
}
export class BlueprintRequestError extends Error {
    constructor() { super('The blueprint request or response is invalid.'); this.name = 'BlueprintRequestError'; }
}
function fail(): never { throw new BlueprintRequestError(); }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 1 && v <= 2147483647;
const digest = (v: unknown): v is string => typeof v === 'string' && /^sha256:[a-f0-9]{64}$/.test(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[\x00-\x1f\x7f]/.test(v);
function exact(v: Record<string, unknown>, required: string[], optional: string[] = []) { if (required.some(k => !Object.hasOwn(v, k)) || Object.keys(v).some(k => ![...required, ...optional].includes(k)))
    fail(); }
export function parseBlueprintKey(value: unknown): string { if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value))
    fail(); return value; }
export function parseBlueprintPathVersion(value: unknown): number { if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value) || !integer(Number(value)))
    fail(); return Number(value); }
function reference(value: unknown): BlueprintTemplateReference {
    if (!record(value))
        fail();
    exact(value, ['id', 'version', 'digest']);
    parseBlueprintKey(value.id);
    if (!integer(value.version) || !digest(value.digest))
        fail();
    return value as unknown as BlueprintTemplateReference;
}
export function parseBlueprintParameters(value: unknown): BlueprintParameters {
    if (!record(value) || Object.keys(value).length > 20)
        fail();
    const entries = Object.entries(value).map(([key, value]) => {
        parseBlueprintKey(key);
        if (typeof value === 'string') {
            if (!text(value, 1000))
                fail();
            return [key, value] as const;
        }
        if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 2147483647)
            fail();
        return [key, value] as const;
    });
    return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
}
function identifiers(value: unknown, max: number): string[] {
    if (!Array.isArray(value) || value.length > max || new Set(value).size !== value.length)
        fail();
    return value.map(parseBlueprintKey);
}
function create(value: unknown): CreateBlueprintVersionInput {
    if (!record(value))
        fail();
    exact(value, ['key', 'version', 'name', 'description', 'template'], ['parameters', 'clientOverrides']);
    parseBlueprintKey(value.key);
    if (!integer(value.version) || !text(value.name, 100) || !text(value.description, 500))
        fail();
    return { key: value.key as string, version: value.version, name: value.name, description: value.description, template: reference(value.template),
        ...(value.parameters === undefined ? {} : { parameters: parseBlueprintParameters(value.parameters) }), ...(value.clientOverrides === undefined ? {} : { clientOverrides: identifiers(value.clientOverrides, 20) }) };
}
export function parseCreateBlueprintVersion(raw: string | Uint8Array): CreateBlueprintVersionInput { return create(parseBoundedJson(raw, 16384)); }
function declarations(value: Record<string, unknown>): BlueprintDeclarations {
    if (!Array.isArray(value.dependencies) || value.dependencies.length > 20 || !Array.isArray(value.variables) || value.variables.length > 100 || !record(value.capabilities))
        fail();
    const dependencies = value.dependencies.map(slot => {
        if (!record(slot))
            fail();
        exact(slot, ['id', 'kind', 'method']);
        parseBlueprintKey(slot.id);
        if (slot.kind !== 'webhook_endpoint' || slot.method !== 'POST')
            fail();
        return slot as unknown as BlueprintDeclarations['dependencies'][number];
    });
    if (new Set(dependencies.map(slot => slot.id)).size !== dependencies.length)
        fail();
    const variables = value.variables.map(variable => {
        if (!record(variable))
            fail();
        exact(variable, ['id', 'key', 'type', 'scope', 'required', 'mutable']);
        for (const key of ['id', 'key', 'type', 'scope'])
            parseBlueprintKey(variable[key]);
        if (variable.scope === 'business_secret' || typeof variable.required !== 'boolean' || typeof variable.mutable !== 'boolean')
            fail();
        return variable as unknown as BlueprintDeclarations['variables'][number];
    });
    if (new Set(variables.map(variable => variable.id)).size !== variables.length)
        fail();
    exact(value.capabilities, ['channels', 'actions']);
    const channels = identifiers(value.capabilities.channels, 3), actions = identifiers(value.capabilities.actions, 32);
    if (channels.some(channel => !['instagram', 'whatsapp', 'unified'].includes(channel)))
        fail();
    return { dependencies, variables, capabilities: { channels, actions } };
}
export function parseBlueprintVersion(value: unknown): PublicBlueprintVersion {
    if (!record(value))
        fail();
    exact(value, ['applicationId', 'definition', 'digest', 'createdAt']);
    if (!uuid(value.applicationId) || !digest(value.digest) || typeof value.createdAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.createdAt) || !Number.isFinite(Date.parse(value.createdAt)) || new Date(value.createdAt).toISOString() !== value.createdAt || !record(value.definition))
        fail();
    const definition = value.definition;
    exact(definition, ['schemaVersion', 'key', 'version', 'name', 'description', 'template', 'parameters', 'clientOverrides', 'dependencies', 'variables', 'capabilities']);
    if (definition.schemaVersion !== 'inside-flow-blueprint/v1')
        fail();
    const { schemaVersion: _schema, dependencies: _deps, variables: _vars, capabilities: _caps, ...input } = definition;
    const captured = create(input);
    if (captured.parameters === undefined || captured.clientOverrides === undefined)
        fail();
    return { applicationId: value.applicationId, definition: { ...captured, parameters: captured.parameters, clientOverrides: captured.clientOverrides, schemaVersion: 'inside-flow-blueprint/v1', ...declarations(definition) }, digest: value.digest, createdAt: value.createdAt };
}
export function parseBlueprintVersions(value: unknown): PublicBlueprintVersion[] {
    if (!Array.isArray(value) || value.length > 100)
        fail();
    const result = value.map(parseBlueprintVersion);
    if (new Set(result.map(v => v.applicationId + '/' + v.definition.key + '/' + v.definition.version)).size !== result.length)
        fail();
    return result;
}
export function parseBlueprintTemplates(value: unknown): PublicBlueprintTemplate[] {
    if (!Array.isArray(value) || value.length > 50)
        fail();
    const result = value.map(item => {
        if (!record(item))
            fail();
        exact(item, ['template', 'name', 'description', 'parameterDefinitions', 'dependencies', 'variables', 'capabilities']);
        if (!text(item.name, 100) || !text(item.description, 500) || !Array.isArray(item.parameterDefinitions) || item.parameterDefinitions.length > 20)
            fail();
        const specs: BlueprintParameterDefinition[] = item.parameterDefinitions.map(spec => {
            if (!record(spec))
                fail();
            parseBlueprintKey(spec.id);
            if (spec.type === 'string') {
                exact(spec, ['id', 'type', 'defaultValue', 'maxLength']);
                if (!integer(spec.maxLength) || spec.maxLength > 1000 || !text(spec.defaultValue, spec.maxLength))
                    fail();
            }
            else if (spec.type === 'integer') {
                exact(spec, ['id', 'type', 'defaultValue', 'minimum', 'maximum']);
                if (!integer(spec.minimum) || !integer(spec.maximum) || spec.minimum > spec.maximum || typeof spec.defaultValue !== 'number' || !Number.isSafeInteger(spec.defaultValue) || spec.defaultValue < spec.minimum || spec.defaultValue > spec.maximum)
                    fail();
            }
            else
                fail();
            return spec as unknown as BlueprintParameterDefinition;
        });
        if (new Set(specs.map(spec => spec.id)).size !== specs.length)
            fail();
        return { template: reference(item.template), name: item.name, description: item.description, parameterDefinitions: specs, ...declarations(item) };
    });
    if (new Set(result.map(item => item.template.id + '@' + item.template.version)).size !== result.length)
        fail();
    return result;
}
