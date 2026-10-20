import { parseApiKey } from './generated/apiKey.js';
import {parseDelegationCredential} from './generated/delegationCredential.js';
import {parseApplicationCredential} from './generated/applicationCredential.js';
import {PARTNER_SUBSCRIPTION_OPERATIONS} from './generated/partnerSubscriptions.js';
import { isPublicRequestId } from './generated/requestId.js';
import { isIdempotencyKey } from './generated/idempotency.js';
import { parseContactAttributeUpdate } from './generated/contactAttributes.js';
import { parseContactTagsReplacement, parseContactTagsResponse } from './generated/contactTags.js';
import { parseContactCreation, parseContactReference } from './generated/contactCreation.js';
import { parseContactUpdate, parseUpdatedContact } from './generated/contactUpdate.js';
import {parseMessageSendInput} from './generated/messageSend.js';
import { captureEventPublish } from './generated/eventPublish.js';
import { parseFlowRunProgress } from './generated/flowRunProgress.js';
import { parseFlowTemplateCatalogQuery, parseFlowTemplateCatalog, parseFlowTemplateImport, parseFlowTemplateImportReceipt, parseFlowTemplateId } from './generated/flowTemplateDeployments.js';
import { parseSoftwareUsageView, parseSoftwareUsageSummary, parseSoftwareLimits } from './generated/softwareUsage.js';
import {parseConsentWithdrawal,parseConsentStateQuery,parseContactConsentState} from './generated/consents.js';
import { parseMarketingOptIn } from './generated/consents.js';
import { randomUUID } from 'node:crypto';
import { PUBLIC_OPERATIONS, type PublicOperationId } from './generated/operations.js';
import { DEVELOPER_PROBLEMS, type PublicProblem } from './generated/problem.js';
import { decode, isRecord, SchemaMismatch, type Schema } from './schema.js';
import { attachWriteRecovery, InsideDMApiError, InsideDMConfigurationError, InsideDMError, InsideDMProtocolError, InsideDMTransportError } from './errors.js';
import type { ClientOptions, RequestOptions, WriteRequestOptions, ResponseMeta } from './types.js';
import { DEFAULT_API_BASE_URL, SDK_VERSION } from './version.js';

const MAX_BODY_BYTES = 1024 * 1024;
const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
type Settings = { timeoutMs: number; attemptTimeoutMs: number; maxRetries: number };
/** Internal credential seam; public client configuration never accepts actor assertions or arbitrary authorization headers. */
export type TransportAuthentication={kind:'application';token:string}|{kind:'delegation';businessId:string;
  get:(options:RequestOptions&Settings)=>Promise<string>;invalidate:(token:string)=>void};
type Operation = { method: string; path: string; successStatus: number; pathParameters: Readonly<Record<string, Schema>>; queryParameters: Readonly<Record<string, Schema>>; response: Schema };

function bounded(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new InsideDMConfigurationError('Request limits must be finite integers within the documented bounds.');
  }
  return value;
}

function settings(options: RequestOptions, defaults: Settings): Settings {
  if (!isRecord(options) || (options.signal !== undefined && !(options.signal instanceof AbortSignal))) throw new InsideDMConfigurationError('Request options require an options object and a native AbortSignal.');
  return { timeoutMs: bounded(options.timeoutMs, defaults.timeoutMs, 1, 120_000),
    attemptTimeoutMs: bounded(options.attemptTimeoutMs, defaults.attemptTimeoutMs, 1, 60_000),
    maxRetries: bounded(options.maxRetries, defaults.maxRetries, 0, 5) };
}

function retryAfter(response: Response): number | null {
  const raw = response.headers.get('retry-after');
  if (raw === null || raw.length > 128) return null;
  const seconds = /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : (Date.parse(raw) - Date.now()) / 1000;
  return Number.isFinite(seconds) ? Math.max(0, Math.min(seconds, 86_400)) : null;
}

function aborted(attempts: number, caller?: AbortSignal): InsideDMTransportError {
  return new InsideDMTransportError(caller?.aborted ? 'aborted' : 'timeout', {
    code: caller?.aborted ? 'request_aborted' : 'request_timeout', attempts, retryable: !caller?.aborted,
  });
}

/** Race even injected transports and body streams which ignore AbortSignal. */
async function interruptible<T>(work: Promise<T>, signal: AbortSignal, failure: () => Error): Promise<T> {
  if (signal.aborted) throw failure();
  return new Promise<T>((resolve, reject) => {
    const abort = (): void => { reject(failure()); };
    signal.addEventListener('abort', abort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

async function readJson(response: Response, signal: AbortSignal, deadline: number, failure: () => Error): Promise<unknown> {
  const length = response.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    void response.body?.cancel().catch(() => {});
    throw new InsideDMProtocolError('InsideDM returned an oversized response.', { code: 'response_too_large' });
  }
  if (!response.body) throw new InsideDMProtocolError('InsideDM returned an empty response.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      if (performance.now() >= deadline) throw failure();
      const part = await interruptible(reader.read(), signal, failure);
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_BODY_BYTES) throw new InsideDMProtocolError('InsideDM returned an oversized response.', { code: 'response_too_large' });
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown; }
    catch { throw new InsideDMProtocolError('InsideDM returned invalid JSON.'); }
  } finally {
    // Cancellation is deliberately not awaited: a custom stream may never settle.
    void reader.cancel().catch(() => {});
  }
}

export class Transport {
  readonly #apiKey: string|null;
  readonly #authentication:TransportAuthentication|null;
  readonly #baseUrl: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #defaults: Settings;
  #businessId: string | null = null;

  constructor(options:ClientOptions|Omit<ClientOptions,'apiKey'>,authentication:TransportAuthentication|null=null) {
    if (typeof window !== 'undefined') throw new InsideDMConfigurationError('InsideDM API keys belong on your server.');
    const apiKey=options&&'apiKey' in options?options.apiKey:null;
    if(!options||authentication===null&&!parseApiKey(apiKey)&&!parseDelegationCredential(apiKey)
      ||authentication?.kind==='application'&&!parseApplicationCredential(authentication.token))throw new InsideDMConfigurationError('Provide a valid InsideDM API key or business delegation token.');
    this.#authentication=authentication===null?null:{...authentication};
    this.#apiKey=authentication?.kind==='application'?authentication.token:apiKey;
    if(authentication?.kind==='delegation')this.#businessId=authentication.businessId;
    let url: URL;
    try { url = new URL(options.baseUrl ?? DEFAULT_API_BASE_URL); }
    catch { throw new InsideDMConfigurationError('Provide a valid API base URL.'); }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) {
      throw new InsideDMConfigurationError('API base URLs require HTTPS, without credentials, query parameters, or fragments. HTTP is allowed for localhost.');
    }
    this.#baseUrl = url.href.replace(/\/+$/, '');
    const fetcher = options.fetch ?? globalThis.fetch;
    if (typeof fetcher !== 'function') throw new InsideDMConfigurationError('A Fetch implementation is required.');
    this.#fetch = fetcher;
    this.#defaults = settings(options, { timeoutMs: 20_000, attemptTimeoutMs: 10_000, maxRetries: 2 });
  }

  async contactMutation(operationId: 'updateContactAttributes' | 'replaceContactTags' | 'createContact' | 'updateContact', contactId: string | null, input: unknown, options: WriteRequestOptions = {}): Promise<{ body: unknown; meta: ResponseMeta }> {
    const config = settings(options, this.#defaults);
    const deadline = performance.now() + config.timeoutMs;
    const idempotencyKey = options.idempotencyKey ?? randomUUID();
    if (!isIdempotencyKey(idempotencyKey)) throw new InsideDMConfigurationError('Idempotency keys require 1–128 visible ASCII characters.');
    let body: string;
    try {
      const operation = PUBLIC_OPERATIONS[operationId];
      if ('contactId' in operation.pathParameters) decode(operation.pathParameters.contactId, contactId, 'path', false);
      if (operationId === 'createContact') {
        if (!isRecord(input) || Object.keys(input).some(key => !['name', 'phone'].includes(key))) throw new Error('Invalid contact creation.');
        input = { ...input, channel: 'whatsapp' };
      }
      // Validate runtime input before serializing: JSON silently drops undefined and changes NaN to null.
      if(operation.request===undefined)throw new Error('Missing mutation contract.');
      decode(operation.request, input, 'request', false);
      body = JSON.stringify(operationId === 'createContact' ? parseContactCreation(JSON.stringify(input))
        : operationId === 'updateContact' ? parseContactUpdate(JSON.stringify(input))
        : operationId === 'replaceContactTags' ? parseContactTagsReplacement(JSON.stringify(input)) : parseContactAttributeUpdate(JSON.stringify(input)));
    } catch { throw new InsideDMConfigurationError(operationId === 'createContact'
      ? 'Provide a contact name and one E.164 phone number, without additional fields.'
      : 'Provide a valid contact ID and contact update of at most 64 KiB.'); }
    try {
      if (this.#businessId === null) {
        const workspace = await this.request('getWorkspace', {}, {}, { ...options, timeoutMs: Math.max(1, Math.floor(deadline - performance.now())) });
        this.#businessId = (workspace.body as { data: { id: string } }).data.id;
      }
      const remaining = Math.floor(deadline - performance.now());
      if (remaining < 1) throw new InsideDMTransportError('timeout', { code: 'request_timeout' });
      const result = await this.request(operationId, { businessId: this.#businessId, ...(contactId === null ? {} : { contactId }) },
        operationId === 'createContact' ? { view: 'reference' } : {}, { ...options, timeoutMs: remaining }, { body, idempotencyKey });
      if (operationId === 'createContact') {
        try { parseContactReference((result.body as { data: unknown }).data); }
        catch { throw new InsideDMProtocolError('InsideDM returned an invalid contact reference.', { code: 'invalid_response', requestId: result.meta.requestId }); }
      }
      if (operationId === 'replaceContactTags') {
        try { if (parseContactTagsResponse((result.body as { data: unknown }).data).contactId !== contactId) throw new Error('Wrong contact.'); }
        catch { throw new InsideDMProtocolError('InsideDM returned invalid contact tags.', { code: 'invalid_response', requestId: result.meta.requestId }); }
      }
      if (operationId === 'updateContact') {
        try { if (parseUpdatedContact((result.body as { data: unknown }).data).contactId !== contactId) throw new Error('Wrong contact.'); }
        catch { throw new InsideDMProtocolError('InsideDM returned an invalid contact profile.', { code: 'invalid_response', requestId: result.meta.requestId }); }
      }
      return result;
    } catch (error) {
      if (error instanceof InsideDMError) throw attachWriteRecovery(error, operationId === 'createContact'
        ? { operation: 'createContact', idempotencyKey } : { operation: operationId, contactId: contactId!, idempotencyKey });
      throw error;
    }
  }

  async ownerOperation(operationId:'importFlowTemplate'|'publishEvent'|'sendMessage'|'previewMessage'|'getOperation'|'lookupOperation'|'cancelOperation'|'withdrawConsent'|'recordMarketingOptIn',
    resourceId:string|null,input:unknown,options:WriteRequestOptions={}){
    const config=settings(options,this.#defaults),deadline=performance.now()+config.timeoutMs;
    const operation=PUBLIC_OPERATIONS[operationId];
    let idempotencyKey=operationId==='importFlowTemplate'||operationId==='sendMessage'||operationId==='cancelOperation'||operationId==='withdrawConsent'||operationId==='recordMarketingOptIn'?options.idempotencyKey??randomUUID():undefined;
    if(idempotencyKey!==undefined&&!isIdempotencyKey(idempotencyKey))throw new InsideDMConfigurationError('Idempotency keys require 1–128 visible ASCII characters.');
    if(idempotencyKey===undefined&&operationId!=='publishEvent'&&options.idempotencyKey!==undefined)throw new InsideDMConfigurationError('Read and preview requests do not take an idempotency key.');
    let body:string|undefined;
    try{
      if('operationId' in operation.pathParameters)decode(operation.pathParameters.operationId,resourceId,'path',false);
      if(operationId==='importFlowTemplate')parseFlowTemplateId(resourceId);
      if(operation.request!==undefined){
        if((operationId==='sendMessage'||operationId==='previewMessage')&&typeof input==='object'&&input!==null&&!Array.isArray(input)){
          const message=input as {intent?:unknown};
          input={...message,intent:message.intent===undefined?'notification':message.intent};
        }
        decode(operation.request,input,'request',false);
        body=JSON.stringify(input);
        if(operationId==='sendMessage'||operationId==='previewMessage')body=JSON.stringify(parseMessageSendInput(body));
        if(operationId==='withdrawConsent')body=JSON.stringify(parseConsentWithdrawal(body));
        if(operationId==='recordMarketingOptIn')body=JSON.stringify(parseMarketingOptIn(body));
        if(operationId==='importFlowTemplate')body=JSON.stringify(parseFlowTemplateImport(body));
        if (operationId === 'publishEvent') {
          const { occurredAt, ...event } = captureEventPublish(input);
          if (options.idempotencyKey !== undefined && options.idempotencyKey !== event.id) throw new Error('The event ID is its retry key.');
          idempotencyKey = event.id;
          body = JSON.stringify({ ...event, ...(occurredAt === null ? {} : { occurredAt }) });
        }
        if(Buffer.byteLength(body)>65536)throw new Error('Request bound exceeded.');
      }
    }catch{throw new InsideDMConfigurationError('Provide valid flow template, message, event, consent or operation parameters.');}
    try{
      if(this.#businessId===null){
        const workspace=await this.request('getWorkspace',{},{},{...options,timeoutMs:Math.max(1,Math.floor(deadline-performance.now()))});
        this.#businessId=(workspace.body as {data:{id:string}}).data.id;
      }
      const remaining=Math.floor(deadline-performance.now());
      if(remaining<1)throw new InsideDMTransportError('timeout',{code:'request_timeout'});
      const result=await this.request(operationId,{businessId:this.#businessId,...(resourceId?operationId==='importFlowTemplate'?{packId:resourceId}:{operationId:resourceId}:{})},{},
        {...options,timeoutMs:remaining},body===undefined?undefined:{body,...(idempotencyKey?{idempotencyKey}:{})});
      if(operationId==='importFlowTemplate'){
        try{
          const data=parseFlowTemplateImportReceipt((result.body as {data:unknown}).data);
          if(data.businessId!==this.#businessId||data.packId!==resourceId||data.version!==parseFlowTemplateImport(body!).version)throw new Error('Wrong template attribution.');
          result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned an invalid template creation receipt.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      return result;
    }catch(error){
      if(error instanceof InsideDMError&&idempotencyKey)throw attachWriteRecovery(error,operationId==='importFlowTemplate'?{operation:operationId,packId:resourceId!,idempotencyKey}:operationId==='sendMessage'||operationId==='publishEvent'
        ?{operation:operationId,idempotencyKey}:operationId==='withdrawConsent'||operationId==='recordMarketingOptIn'?{operation:operationId,idempotencyKey}:{operation:'cancelOperation',operationId:resourceId!,idempotencyKey});
      throw error;
    }
  }

  async request(operationId: PublicOperationId, pathValues: Record<string, string>, query: object, options: RequestOptions = {}, mutation?: { body: string; idempotencyKey?: string }): Promise<{ body: unknown; meta: ResponseMeta }> {
    const platformOperation=PARTNER_SUBSCRIPTION_OPERATIONS.some(item=>item.id===operationId)||operationId==='createBusinessDelegation'||operationId==='createInstallationRequest'||operationId==='getInstallationRequest'||operationId==='getApplicationSelf'||operationId==='getInstallation'||operationId==='revokeInstallation'||operationId==='listPlatformBusinesses'||operationId==='getPlatformBusiness'||operationId==='getPartnerApiUsage'
      ||operationId==='createPlatformBusiness'||operationId==='getBusinessCreation'||operationId==='renewBusinessClaimLink'||operationId==='createOnboardingSession'||operationId==='getOnboardingSession';
    if((this.#authentication?.kind==='application')!==platformOperation)throw new InsideDMConfigurationError('Use the matching business or platform client for this operation.');
    const operation: Operation = PUBLIC_OPERATIONS[operationId];
    const config = settings(options, this.#defaults);
    const url = this.#url(operation, pathValues, query);
    const deadline = performance.now() + config.timeoutMs;
    let last: InsideDMError | null = null;
    let transientRetries=0,refreshed=false;
    for (let attempt = 1; ; attempt++) {
      if (options.signal?.aborted) throw aborted(attempt - 1, options.signal);
      let remaining = deadline - performance.now();
      if (remaining <= 0) throw new InsideDMTransportError('timeout', { code: 'request_timeout', attempts: attempt - 1 });
      const token=this.#authentication?.kind==='delegation'?await this.#authentication.get({...options,...config,timeoutMs:Math.max(1,Math.floor(remaining))}):this.#apiKey;
      if(options.signal?.aborted)throw aborted(attempt-1,options.signal);
      remaining=deadline-performance.now();
      if(remaining<=0)throw new InsideDMTransportError('timeout',{code:'request_timeout',attempts:attempt-1});
      const controller = new AbortController();
      const attemptDeadline = performance.now() + Math.min(remaining, config.attemptTimeoutMs);
      const timer = setTimeout(() => controller.abort(), Math.min(remaining, config.attemptTimeoutMs));
      const onAbort = (): void => controller.abort();
      options.signal?.addEventListener('abort', onAbort, { once: true });
      const failure = (): InsideDMTransportError => aborted(attempt, options.signal);
      let response: Response | null = null;
      let meta: ResponseMeta | null = null;
      try {
        const pending = this.#fetch(url, { method: operation.method, headers: {
          authorization: `Bearer ${token}`, accept: 'application/json', 'user-agent': `insidedm-node/${SDK_VERSION}`,
          ...(mutation ? { 'content-type': 'application/json', ...(mutation.idempotencyKey?{'idempotency-key': mutation.idempotencyKey}:{}) } : {}),
        }, ...(mutation ? { body: mutation.body } : {}), signal: controller.signal, redirect: 'manual' });
        // A late response from an injected fetch is discarded and its body cancelled.
        void pending.then((late) => { if (controller.signal.aborted) void late.body?.cancel().catch(() => {}); }, () => {});
        response = await interruptible(pending, controller.signal, failure);
        const headerId = response.headers.get('x-request-id');
        meta = { requestId: isPublicRequestId(headerId) ? headerId : '', status: response.status,
          attempts: attempt, retryAfterSeconds: retryAfter(response), ...(mutation?.idempotencyKey ? { idempotencyKey: mutation.idempotencyKey } : {}) };
        if (response.redirected || (response.status >= 300 && response.status < 400)) {
          throw new InsideDMProtocolError('InsideDM returned an unexpected redirect.', { code: 'unexpected_redirect', ...meta });
        }
        const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
        const expectedType = response.status === operation.successStatus ? 'application/json' : 'application/problem+json';
        if (contentType !== expectedType) throw new InsideDMProtocolError('InsideDM returned an unexpected content type.', { ...meta, code: 'invalid_response' });
        const raw = await readJson(response, controller.signal, attemptDeadline, failure);
        if (!meta.requestId) throw new InsideDMProtocolError('InsideDM omitted a valid request ID.', { ...meta, code: 'invalid_response' });
        if (response.status !== operation.successStatus) {
          let problem: PublicProblem;
          try { problem = decode({ $ref: '#/components/schemas/Problem' }, raw, 'problem', false) as PublicProblem; }
          catch { throw new InsideDMProtocolError('InsideDM returned an invalid problem response.', { ...meta, code: 'invalid_response' }); }
          const shape = DEVELOPER_PROBLEMS[problem.code];
          if (!shape || shape.status !== response.status || problem.status !== response.status || problem.requestId !== meta.requestId || shape.retryable !== problem.retryable) {
            throw new InsideDMProtocolError('InsideDM returned an inconsistent problem response.', { ...meta, code: 'invalid_response' });
          }
          throw new InsideDMApiError(problem, meta);
        }
        try { return { body: decode(operation.response, raw), meta }; }
        catch { throw new InsideDMProtocolError('InsideDM returned data outside the public contract.', { ...meta, code: 'invalid_response' }); }
      } catch (error) {
        last = controller.signal.aborted ? failure()
          : error instanceof InsideDMProtocolError ? new InsideDMProtocolError(error.message, {
            code: error.code, status: meta?.status, requestId: meta?.requestId || null, attempts: attempt, retryAfterSeconds: meta?.retryAfterSeconds,
          }) : error instanceof InsideDMError ? error : new InsideDMTransportError('transport', { code: 'network_error', attempts: attempt, retryable: true });
        if(token!==null&&this.#authentication?.kind==='delegation'&&last instanceof InsideDMApiError&&last.code==='invalid_token'){
          this.#authentication.invalidate(token);
          if(!refreshed){refreshed=true;continue;}
        }
        const retryable = last.kind !== 'aborted' && ((last.kind === 'transport' || last.kind === 'timeout') ? last.retryable
          : response !== null && RETRY_STATUSES.has(response.status) && (last.kind !== 'api' || last.retryable));
        if (!retryable || transientRetries>=config.maxRetries) throw last;
        transientRetries++;
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', onAbort);
        controller.abort();
        void response?.body?.cancel().catch(() => {});
      }
      const delay = meta?.retryAfterSeconds !== null && meta?.retryAfterSeconds !== undefined
        ? meta.retryAfterSeconds * 1000 : Math.min(2000, 200 * 2 ** (transientRetries - 1)) * (0.5 + Math.random() * 0.5);
      // Never retry earlier than Retry-After or extend the caller's total budget.
      if (delay >= deadline - performance.now()) throw last;
      await new Promise<void>((resolve, reject) => {
        const abort = (): void => { clearTimeout(timer); reject(new InsideDMTransportError('aborted', { code: 'request_aborted', attempts: attempt })); };
        const timer = setTimeout(() => { options.signal?.removeEventListener('abort', abort); resolve(); }, delay);
        if (options.signal?.aborted) abort();
        else options.signal?.addEventListener('abort', abort, { once: true });
      });
    }
  }

  /** Shared read owners use the workspace derived from the key, never caller-supplied tenant context. */
  async requestForBusiness(operationId: 'getFlowTemplateCatalog' | 'getSoftwareUsage' | 'listTemplates' | 'getMessagingReadiness' | 'getMessagingConfiguration' | 'getConsentState' | 'getFlowRun', query: object, options: RequestOptions = {}, pathValues: Record<string,string> = {}) {
    const config = settings(options, this.#defaults), deadline = performance.now() + config.timeoutMs;
    if (!isRecord(query)) throw new InsideDMConfigurationError('Query parameters must be an object.');
    const snapshot = { ...query };
    if (operationId === 'getFlowTemplateCatalog') {
      try {
        if (Object.keys(snapshot).some(key => !['limit','cursor'].includes(key)) || 'idempotencyKey' in options) throw new Error('Unsupported catalog input.');
        const supplied = Object.fromEntries(Object.entries(snapshot).filter(([,value]) => value !== undefined));
        Object.assign(snapshot, { view: 'flow_templates', ...parseFlowTemplateCatalogQuery('?' + new URLSearchParams({ ...supplied, view: 'flow_templates' } as Record<string,string>).toString()) });
      } catch { throw new InsideDMConfigurationError('Provide a template catalog limit of 1–100 and an optional continuation cursor.'); }
    }
    if (operationId === 'getSoftwareUsage') {
      try {
        const view = parseSoftwareUsageView('?' + new URLSearchParams(snapshot as Record<string, string>).toString());
        if (view.view === 'software_usage') Object.assign(snapshot, view.query);
      } catch { throw new InsideDMConfigurationError('Provide explicit UTC from/to instants spanning at most 31 days.'); }
    }
    if (operationId === 'getConsentState') {
      try { parseConsentStateQuery('?' + new URLSearchParams(snapshot as Record<string, string>).toString()); }
      catch { throw new InsideDMConfigurationError('Provide a valid contact ID.'); }
    }
    // Validate all caller parameters before discovery, deferring only the server-derived business ID.
    this.#url(PUBLIC_OPERATIONS[operationId], pathValues, snapshot, true);
    if (this.#businessId === null) {
      const workspace = await this.request('getWorkspace', {}, {}, { ...options, timeoutMs: Math.max(1, Math.floor(deadline - performance.now())) });
      this.#businessId = (workspace.body as { data: { id: string } }).data.id;
    }
    const remaining = Math.floor(deadline - performance.now());
    if (remaining < 1) throw new InsideDMTransportError('timeout', { code: 'request_timeout' });
    const result = await this.request(operationId, { ...pathValues, businessId: this.#businessId }, snapshot, { ...options, timeoutMs: remaining });
    if (operationId === 'getFlowTemplateCatalog') {
      try {
        const data = parseFlowTemplateCatalog((result.body as {data:unknown}).data);
        if (data.businessId !== this.#businessId || data.dependencies.length > (snapshot as {limit:number}).limit) throw new Error('Wrong catalog attribution.');
        result.body = {data};
      } catch { throw new InsideDMProtocolError('InsideDM returned an invalid template catalog.', { code: 'invalid_response', requestId: result.meta.requestId }); }
    }
    if (operationId === 'getSoftwareUsage') {
      try {
        const expected = snapshot as Record<string, unknown>, value = (result.body as { data: unknown }).data;
        const data = expected.view === 'software_limits' ? parseSoftwareLimits(value) : parseSoftwareUsageSummary(value);
        if (data.businessId !== this.#businessId || 'period' in data && (data.period.from !== expected.from || data.period.to !== expected.to)) throw new Error('Wrong usage attribution.');
        result.body = { data };
      } catch { throw new InsideDMProtocolError('InsideDM returned invalid software usage.', { code: 'invalid_response', requestId: result.meta.requestId }); }
    }
    if (operationId === 'getFlowRun') {
      try {
        const progress = parseFlowRunProgress(result.body);
        if (progress.data.id !== pathValues.runId) throw new Error('Wrong flow run.');
        result.body = progress;
      } catch { throw new InsideDMProtocolError('InsideDM returned invalid flow progress.', { code: 'invalid_response', requestId: result.meta.requestId }); }
    }
    if (operationId === 'getConsentState') {
      try {
        const data = parseContactConsentState((result.body as { data: unknown }).data);
        if (data.contactId !== (snapshot as Record<string, unknown>).contactId) throw new Error('Wrong contact.');
        result.body = { data };
      } catch { throw new InsideDMProtocolError('InsideDM returned invalid consent state.', { code: 'invalid_response', requestId: result.meta.requestId }); }
    }
    return result;
  }

  #url(operation: Operation, values: Record<string, string>, query: object, deferBusinessId = false): string {
    if (!isRecord(query)) throw new InsideDMConfigurationError('Query parameters must be an object.');
    let path = operation.path;
    try {
      for (const [name, schema] of Object.entries(operation.pathParameters)) {
        if (deferBusinessId && name === 'businessId' && values[name] === undefined) continue;
        decode(schema, values[name], 'path', false);
        path = path.replace(`{${name}}`, encodeURIComponent(values[name]!));
      }
      const url = new URL(this.#baseUrl + path);
      for (const [name, value] of Object.entries(query)) {
        const schema = operation.queryParameters[name];
        if (!schema) throw new SchemaMismatch('query');
        if (value === undefined) continue;
        decode(schema, value, 'query', false);
        url.searchParams.set(name, String(value));
      }
      return url.href;
    } catch {
      throw new InsideDMConfigurationError('Request parameters do not match the public API contract.');
    }
  }
}
