// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import type { JsonValue } from './boundedJson.js';
import type { FlowRegressionCase } from './flowRegressionTypes.js';
export class FlowRegressionFixtureError extends Error {
    constructor() { super('Regression fixtures must be bounded JSON without credentials or secret-like keys.'); this.name = 'FlowRegressionFixtureError'; }
}
function fail(): never { throw new FlowRegressionFixtureError(); }
function identifier(value: unknown, max: number): string {
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value))
        fail();
    return value.trim();
}
export function validateAutomationRegressionBindingsV1(bindings: unknown): Record<string, JsonValue> {
    if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings) || Object.keys(bindings).length > 100)
        fail();
    let visited = 0;
    const visit = (value: unknown, depth: number): JsonValue => {
        if (++visited > 500 || depth > 8)
            fail();
        if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value))
            return value;
        if (Array.isArray(value))
            return value.map(entry => visit(entry, depth + 1));
        if (!value || typeof value !== 'object')
            fail();
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
            if (!key || key.trim() !== key || key.length > 200 || /[\x00-\x1f\x7f]/.test(key) || /(^|[._-])(secret|token|password|api[_-]?key|authorization)([._-]|$)/i.test(key))
                fail();
            return [key, visit(entry, depth + 1)];
        }));
    };
    const result = visit(bindings, 0);
    if (!result || typeof result !== 'object' || Array.isArray(result) || new TextEncoder().encode(JSON.stringify(result)).length > 64000)
        fail();
    return result;
}
export function parseFlowRegressionCases(value: unknown): FlowRegressionCase[] {
    if (!Array.isArray(value) || value.length < 1 || value.length > 100)
        fail();
    const seen = new Set<string>();
    return value.map(candidate => {
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
            fail();
        const row = candidate as Record<string, unknown>;
        if (Object.keys(row).some(key => !['id', 'name', 'bindings', 'expectedPathId', 'expectedOutcomeId', 'expectedSpecialistNode', 'forbiddenActionTypes'].includes(key)))
            fail();
        const id = identifier(row.id, 200);
        if (seen.has(id))
            fail();
        seen.add(id);
        if (row.forbiddenActionTypes !== undefined && (!Array.isArray(row.forbiddenActionTypes) || row.forbiddenActionTypes.length > 20))
            fail();
        return { id, name: identifier(row.name, 160), bindings: validateAutomationRegressionBindingsV1(row.bindings ?? {}), expectedPathId: identifier(row.expectedPathId, 20000), expectedOutcomeId: identifier(row.expectedOutcomeId, 200),
            ...(row.expectedSpecialistNode === undefined ? {} : { expectedSpecialistNode: row.expectedSpecialistNode === null ? null : identifier(row.expectedSpecialistNode, 100) }),
            ...(row.forbiddenActionTypes === undefined ? {} : { forbiddenActionTypes: (row.forbiddenActionTypes as unknown[]).map(type => identifier(type, 100)) }) };
    });
}
