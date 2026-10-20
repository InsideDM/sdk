import { SCHEMAS } from './generated/schemas.js';

export interface Schema {
  readonly $ref?: string;
  readonly type?: string | readonly string[];
  readonly const?: unknown;
  readonly enum?: readonly unknown[];
  readonly properties?: Readonly<Record<string, Schema>>;
  readonly required?: readonly string[];
  readonly items?: Schema;
  readonly allOf?: readonly Schema[];
  readonly oneOf?: readonly Schema[];
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly pattern?: string;
  readonly format?: string;
  readonly minProperties?: number;
  readonly maxProperties?: number;
  readonly propertyNames?: Schema;
  readonly additionalProperties?: Schema | boolean;
}

export class SchemaMismatch extends Error {
  constructor(readonly field: string) { super(`Invalid contract field: ${field}.`); }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** A bounded decoder for the schema keywords emitted by syncContract, not a general JSON Schema engine. */
export function decode(schema: Schema, input: unknown, field = 'response', forwardEnums = true, depth = 0): unknown {
  const refuse = (): never => { throw new SchemaMismatch(field); };
  if (depth > 40) return refuse();
  if (isRecord(input)) {
    const count = Object.keys(input).length;
    if (schema.minProperties !== undefined && count < schema.minProperties) return refuse();
    if (schema.maxProperties !== undefined && count > schema.maxProperties) return refuse();
  }
  if (schema.$ref) {
    if (!schema.$ref.startsWith('#/components/schemas/')) return refuse();
    const name = schema.$ref.slice('#/components/schemas/'.length);
    const resolved = (SCHEMAS as Readonly<Record<string, Schema>>)[name];
    if (!resolved) return refuse();
    return decode(resolved, input, field, forwardEnums, depth + 1);
  }
  if (schema.allOf) {
    const output: Record<string, unknown> = {};
    for (const part of schema.allOf) {
      const value = decode(part, input, field, forwardEnums, depth + 1);
      if (!isRecord(value)) return refuse();
      Object.assign(output, value);
    }
    return output;
  }
  if (schema.oneOf) {
    const matches: unknown[] = [];
    for (const part of schema.oneOf) {
      try { matches.push(decode(part, input, field, forwardEnums, depth + 1)); }
      catch (error) { if (!(error instanceof SchemaMismatch)) throw error; }
    }
    return matches.length === 1 ? matches[0] : refuse();
  }
  const types = typeof schema.type === 'string' ? [schema.type] : schema.type;
  if (types && !types.some((type) => type === 'null' ? input === null
    : type === 'array' ? Array.isArray(input)
      : type === 'object' ? isRecord(input)
        : type === 'integer' ? typeof input === 'number' && Number.isSafeInteger(input)
          : type === 'number' ? typeof input === 'number' && Number.isFinite(input)
            : typeof input === type)) return refuse();
  if ('const' in schema && input !== schema.const) return refuse();
  if (schema.enum && !schema.enum.includes(input)) {
    if (forwardEnums && typeof input === 'string' && schema.enum.includes('unknown')) return 'unknown';
    return refuse();
  }
  if (typeof input === 'string') {
    if (schema.minLength !== undefined && input.length < schema.minLength) return refuse();
    if (schema.maxLength !== undefined && input.length > schema.maxLength) return refuse();
    if (schema.pattern && !new RegExp(schema.pattern).test(input)) return refuse();
    if (schema.format === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) return refuse();
    if (schema.format === 'date-time' && (!/^\d{4}-\d{2}-\d{2}T/.test(input) || !Number.isFinite(Date.parse(input)))) return refuse();
    if (schema.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(input)) return refuse();
  }
  if (typeof input === 'number') {
    if (schema.minimum !== undefined && input < schema.minimum) return refuse();
    if (schema.maximum !== undefined && input > schema.maximum) return refuse();
  }
  if (Array.isArray(input)) {
    if (schema.minItems !== undefined && input.length < schema.minItems) return refuse();
    if (schema.maxItems !== undefined && input.length > schema.maxItems) return refuse();
    return schema.items ? input.map((item, index) => decode(schema.items!, item, `${field}[${index}]`, forwardEnums, depth + 1)) : [...input];
  }
  if (isRecord(input) && (schema.properties || typeof schema.additionalProperties === 'object')) {
    for (const key of schema.required ?? []) if (!Object.hasOwn(input, key)) throw new SchemaMismatch(`${field}.${key}`);
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(input, key)) Object.defineProperty(output, key, { value: decode(child, input[key], `${field}.${key}`, forwardEnums, depth + 1), enumerable: true });
    }
    for (const [key, value] of Object.entries(input)) {
      if (Object.hasOwn(schema.properties ?? {}, key)) continue;
      if (schema.propertyNames) decode(schema.propertyNames, key, field, false, depth + 1);
      if (typeof schema.additionalProperties === 'object') Object.defineProperty(output, key, { value: decode(schema.additionalProperties, value, field, forwardEnums, depth + 1), enumerable: true });
      else if (!forwardEnums && schema.additionalProperties === false) return refuse();
    }
    // Unknown response fields are ignored, so additive server changes remain compatible.
    return output;
  }
  return input;
}
