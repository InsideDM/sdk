// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export const DEVELOPER_PROBLEM_CODES = [
    "invalid_request",
    "invalid_cursor",
    "invalid_token",
    "insufficient_scope",
    "feature_not_enabled",
    "resource_not_found",
    "method_not_allowed",
    "response_too_large",
    "rate_limited",
    "internal_error",
    "dependency_unavailable",
    "idempotency_conflict",
    "revision_conflict",
    "invalid_state",
    "verification_failed",
] as const;
export type DeveloperProblemCode = (typeof DEVELOPER_PROBLEM_CODES)[number];
export interface ProblemShape {
    status: number;
    retryable: boolean;
}
export const DEVELOPER_PROBLEMS: Readonly<Record<DeveloperProblemCode, ProblemShape>> = {
    invalid_request: { status: 400, retryable: false },
    invalid_cursor: { status: 400, retryable: false },
    invalid_token: { status: 401, retryable: false },
    insufficient_scope: { status: 403, retryable: false },
    feature_not_enabled: { status: 403, retryable: false },
    resource_not_found: { status: 404, retryable: false },
    method_not_allowed: { status: 405, retryable: false },
    response_too_large: { status: 422, retryable: false },
    rate_limited: { status: 429, retryable: true },
    internal_error: { status: 500, retryable: true },
    dependency_unavailable: { status: 503, retryable: true },
    idempotency_conflict: { status: 409, retryable: false },
    revision_conflict: { status: 409, retryable: false },
    invalid_state: { status: 409, retryable: false },
    verification_failed: { status: 422, retryable: false },
};
export const RATE_POLICY_ID = "public-read-v1-standard";
export const PARTNER_VERIFICATION_RATE_POLICY_ID = 'partner-webhook-verification';
export type DeveloperRatePolicyId = typeof RATE_POLICY_ID | typeof PARTNER_VERIFICATION_RATE_POLICY_ID;
export interface PublicFieldError {
    field: string;
    reason: string;
}
export interface PublicProblem {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance: string;
    code: DeveloperProblemCode;
    requestId: string;
    retryable: boolean;
    policyId: DeveloperRatePolicyId | null;
    errors: PublicFieldError[] | null;
}
const STATUS_TITLES: Readonly<Record<number, string>> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    409: "Conflict",
    422: "Unprocessable Content",
    429: "Too Many Requests",
    500: "Internal Server Error",
    503: "Service Unavailable",
};
export function publicProblem(code: DeveloperProblemCode, input: {
    requestId: string;
    instance: string;
    detail?: string;
    errors?: PublicFieldError[] | null;
    policyId?: DeveloperRatePolicyId;
}): PublicProblem {
    const { status, retryable } = DEVELOPER_PROBLEMS[code];
    const errors = input.errors ?? null;
    if (errors !== null && code !== "invalid_request") {
        throw new TypeError(`field errors belong to invalid_request only, not ${code}`);
    }
    if (input.policyId !== undefined && (code !== 'rate_limited' || ![RATE_POLICY_ID, PARTNER_VERIFICATION_RATE_POLICY_ID].includes(input.policyId)))
        throw new TypeError('A known rate policy belongs only to rate_limited.');
    const title = STATUS_TITLES[status]!;
    return {
        type: "about:blank",
        title,
        status,
        detail: input.detail ?? title,
        instance: input.instance,
        code,
        requestId: input.requestId,
        retryable,
        policyId: code === "rate_limited" ? input.policyId ?? RATE_POLICY_ID : null,
        errors,
    };
}
