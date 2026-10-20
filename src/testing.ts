import { InsideDM } from './client.js';
import { PUBLIC_OPERATIONS } from './generated/operations.js';
import { publicProblem, type DeveloperProblemCode } from './generated/problem.js';
import { SCHEMAS } from './generated/schemas.js';
import { decodeWebhookSecret, formatSignatureHeader, signWebhook } from './generated/webhookSignature.js';
import type { Schema } from './schema.js';
import type { ClientOptions } from './types.js';

export const TEST_ID = '00000000-0000-4000-8000-000000000001';
export const TEST_REQUEST_ID = `req_${Buffer.alloc(16).toString('base64url')}`;
const AT = '2026-01-01T00:00:00.000Z';
const FIXTURE_KEY = `idm_${Buffer.alloc(12).toString('base64url')}_${Buffer.alloc(32).toString('base64url')}`;
export const TEST_WEBHOOK_SECRET = `whsec_${Buffer.alloc(32).toString('base64url')}`;

/** Deterministic synthetic data; never merchant records or production credentials. */
function fixture(schema: Schema): unknown {
  if (schema.$ref) return fixture((SCHEMAS as Readonly<Record<string, Schema>>)[schema.$ref.split('/').at(-1)!]!);
  if ('const' in schema) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.allOf) return Object.assign({}, ...schema.allOf.map(fixture));
  if (schema.oneOf) return fixture(schema.oneOf[0]!);
  const types = typeof schema.type === 'string' ? [schema.type] : schema.type ?? [];
  if (types.includes('null')) return null;
  if (types.includes('object')) return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([key, value]) => [key, fixture(value)]));
  if (types.includes('array')) return [];
  if (types.includes('integer') || types.includes('number')) return schema.minimum ?? 1;
  if (types.includes('boolean')) return false;
  if (schema.format === 'uuid') return TEST_ID;
  if (schema.format === 'date-time') return AT;
  if (schema.format === 'date') return '2026-01-01';
  if(schema.pattern==='^op1_[A-Za-z0-9_-]{43}$')return `op1_${'A'.repeat(43)}`;
  if(schema.pattern==='^(?:0|[1-9]\\d{0,14})$')return '0';
  return 'fixture';
}

export interface TestClientOptions extends Pick<ClientOptions, 'timeoutMs' | 'attemptTimeoutMs'> {
  /** Called before each synthetic response; useful for recording URLs or injecting a failure. */
  respond?: (request: Request, defaultResponse: Response) => Response | Promise<Response>;
}

/** Offline synthetic client. Its transport has no network fallback or domain side effects. */
export function createTestClient(options: TestClientOptions = {}): InsideDM {
  const fetcher: typeof globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== 'https://sdk-fixture.invalid') throw new Error('Fixture transport refuses external hosts.');
    const operation = Object.values(PUBLIC_OPERATIONS).find((candidate) => candidate.method === request.method && new RegExp(`^${candidate.path.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(url.pathname));
    if (!operation) throw new Error('Fixture transport received an unknown operation.');
    const body = operation === PUBLIC_OPERATIONS.publishEvent
      ? { data: { ...(fixture({ $ref: '#/components/schemas/PublicOperation' }) as Record<string, unknown>), kind: 'events.publish' } }
      : operation === PUBLIC_OPERATIONS.createContact
      ? { data: { contactId: TEST_ID, revision: '1' } }
      : operation === PUBLIC_OPERATIONS.getConsentState
      ? { data: { contactId: url.searchParams.get('contactId'), identities: [] } }
      : operation === PUBLIC_OPERATIONS.withdrawConsent
      ? { data: { channel: 'whatsapp', purpose: (await request.clone().json() as { purpose: string }).purpose, status: 'withdrawn', changedAt: AT } }
      : operation === PUBLIC_OPERATIONS.getMessagingReadiness
      ? { data: { channel: 'whatsapp', accountReady: false, reasonCode: 'account_not_connected', textPurposeConfigured: false } }
      : operation === PUBLIC_OPERATIONS.getSoftwareUsage
      ? url.searchParams.get('view') === 'software_limits'
        ? { data: fixture({ $ref: '#/components/schemas/SoftwareLimits' }) }
        : { data: { ...(fixture({ $ref: '#/components/schemas/SoftwareUsageSummary' }) as Record<string, unknown>),
          period: { from: url.searchParams.get('from'), to: url.searchParams.get('to') }, asOf: url.searchParams.get('to') } }
      : operation === PUBLIC_OPERATIONS.updateContactAttributes
      ? { data: { contactId: url.pathname.split('/').at(-2), attributes: (await request.clone().json() as { attributes: unknown }).attributes, revision: '1' } }
      : operation === PUBLIC_OPERATIONS.replaceContactTags
      ? { data: { contactId: url.pathname.split('/').at(-2), tags: (await request.clone().json() as { tags: string[] }).tags, revision: '1' } }
      : operation === PUBLIC_OPERATIONS.updateContact
      ? { data: { contactId: url.pathname.split('/').at(-1), displayName: (await request.clone().json() as { displayName: string | null }).displayName, revision: '1' } }
      : fixture(operation.response);
    const response = new Response(JSON.stringify(body), { status: operation.successStatus, headers: { 'content-type': 'application/json', 'x-request-id': TEST_REQUEST_ID } });
    return options.respond ? options.respond(request, response) : response;
  };
  return new InsideDM({ apiKey: FIXTURE_KEY, baseUrl: 'https://sdk-fixture.invalid', fetch: fetcher,
    maxRetries: 0, timeoutMs: options.timeoutMs, attemptTimeoutMs: options.attemptTimeoutMs });
}

export function createProblemResponse(code: DeveloperProblemCode, options: { retryAfterSeconds?: number; detail?: string } = {}): Response {
  const problem = publicProblem(code, { requestId: TEST_REQUEST_ID, instance: '/fixture', detail: options.detail });
  return new Response(JSON.stringify(problem), { status: problem.status, headers: {
    'content-type': 'application/problem+json', 'x-request-id': TEST_REQUEST_ID,
    ...(options.retryAfterSeconds === undefined ? {} : { 'retry-after': String(options.retryAfterSeconds) }),
  } });
}

export function createWebhookFixture(body: unknown, options: { secret?: string; timestamp?: number } = {}): { rawBody: string; signature: string; secret: string } {
  const secret = options.secret ?? TEST_WEBHOOK_SECRET;
  const decoded = decodeWebhookSecret(secret);
  if (!decoded) throw new Error('Invalid fixture webhook secret.');
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const rawBody = JSON.stringify(body);
  return { rawBody, signature: formatSignatureHeader(timestamp, [signWebhook(decoded, timestamp, rawBody)]), secret };
}
