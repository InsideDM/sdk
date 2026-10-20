// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export function isIdempotencyKey(value: unknown): value is string {
    return typeof value === 'string' && /^[\x21-\x7e]{1,128}$/.test(value);
}
