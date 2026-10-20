import type { PublicProblem } from './generated/problem.js';
import type { WriteRecovery } from './types.js';

const recoveries = new WeakMap<InsideDMError, Readonly<WriteRecovery>>();

/** Internal attachment; recovery details are available explicitly and excluded from default logs. */
export function attachWriteRecovery(error: InsideDMError, recovery: WriteRecovery): InsideDMError {
  recoveries.set(error, Object.freeze({ ...recovery }));
  return error;
}

const inspectionSymbol: unique symbol = Symbol.for('nodejs.util.inspect.custom');

export type FailureKind = 'configuration' | 'api' | 'transport' | 'timeout' | 'aborted' | 'protocol' | 'webhook_verification';

export interface ErrorContext {
  code: string;
  status?: number | null;
  requestId?: string | null;
  retryable?: boolean;
  attempts?: number;
  retryAfterSeconds?: number | null;
}

/** Default inspection deliberately excludes response bodies, URLs and credentials. */
export class InsideDMError extends Error {
  readonly kind: FailureKind;
  readonly code: string;
  readonly status: number | null;
  readonly requestId: string | null;
  readonly retryable: boolean;
  readonly attempts: number;
  readonly retryAfterSeconds: number | null;

  get recovery(): Readonly<WriteRecovery> | null { return recoveries.get(this) ?? null; }

  constructor(kind: FailureKind, message: string, context: ErrorContext) {
    super(message);
    this.name = 'InsideDMError';
    this.kind = kind;
    this.code = context.code;
    this.status = context.status ?? null;
    this.requestId = context.requestId ?? null;
    this.retryable = context.retryable ?? false;
    this.attempts = context.attempts ?? 0;
    this.retryAfterSeconds = context.retryAfterSeconds ?? null;
  }

  toJSON(): Readonly<Record<string, string | number | boolean | null>> {
    return { name: this.name, kind: this.kind, code: this.code, status: this.status,
      requestId: this.requestId, retryable: this.retryable, attempts: this.attempts,
      retryAfterSeconds: this.retryAfterSeconds };
  }

  [inspectionSymbol](): Readonly<Record<string, string | number | boolean | null>> { return this.toJSON(); }
}

export class InsideDMConfigurationError extends InsideDMError {
  /** Documented input field that needs correction, when known. Never contains its supplied value. */
  readonly field: string | null;
  constructor(message: string, field: string | null = null) {
    super('configuration', message, { code: 'invalid_configuration' });
    this.name = 'InsideDMConfigurationError'; this.field = field;
  }
  override toJSON(): Readonly<Record<string, string | number | boolean | null>> {
    return {...super.toJSON(), field: this.field, message: this.message};
  }
}

export class InsideDMApiError extends InsideDMError {
  readonly #problem: PublicProblem;
  constructor(problem: PublicProblem, context: Omit<ErrorContext, 'code'>) {
    super('api', `InsideDM refused the request (${problem.code}).`, { ...context, code: problem.code, retryable: problem.retryable });
    this.name = 'InsideDMApiError';
    this.#problem = problem;
  }
  /** Explicitly access server-supplied details; excluded from default error logging. */
  get problem(): PublicProblem { return this.#problem; }
}

export class InsideDMProtocolError extends InsideDMError {
  constructor(message: string, context: ErrorContext = { code: 'invalid_response' }) {
    super('protocol', message, context); this.name = 'InsideDMProtocolError';
  }
}

export class InsideDMTransportError extends InsideDMError {
  constructor(kind: 'transport' | 'timeout' | 'aborted', context: ErrorContext) {
    super(kind, kind === 'timeout' ? 'InsideDM request timed out.' : kind === 'aborted' ? 'InsideDM request was aborted.' : 'InsideDM could not be reached.', context);
    this.name = 'InsideDMTransportError';
  }
}

export class InsideDMWebhookVerificationError extends InsideDMError {
  constructor(code: string) { super('webhook_verification', 'Webhook verification failed.', { code }); this.name = 'InsideDMWebhookVerificationError'; }
}
