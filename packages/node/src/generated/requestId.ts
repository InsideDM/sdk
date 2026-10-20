// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export function isPublicRequestId(value: unknown): value is string {
    return typeof value === 'string' && /^req_[A-Za-z0-9_-]{21}[AQgw]$/.test(value);
}
