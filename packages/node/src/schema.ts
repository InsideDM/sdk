import { SCHEMAS } from './generated/schemas.js';
import { decodeContract, type Schema } from './generated/contractCodec.js';

export { isRecord, SchemaMismatch, type Schema } from './generated/contractCodec.js';

/** The SDK supplies its generated references to the shared contract decoder. */
export function decode(schema: Schema, input: unknown, field = 'response', forwardEnums = true): unknown {
  return decodeContract(schema, input, { field, forwardEnums, schemas: SCHEMAS });
}
