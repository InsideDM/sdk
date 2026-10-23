import { parseApiKey } from './generated/apiKey.js';
import { SCHEMAS } from './generated/schemas.js';
import { parseConversationAssigneeQuery, parseConversationAssigneePage } from './generated/conversationAssignees.js';
import {parseDelegationCredential} from './generated/delegationCredential.js';
import {parseApplicationCredential} from './generated/applicationCredential.js';
import {PARTNER_SUBSCRIPTION_OPERATIONS} from './generated/partnerSubscriptions.js';
import {PARTNER_BLUEPRINT_OPERATIONS} from './generated/partnerBlueprints.js';
import { isPublicRequestId } from './generated/requestId.js';
import { isIdempotencyKey } from './generated/idempotency.js';
import { parseContactAttributeUpdate } from './generated/contactAttributes.js';
import { parseContactTagsReplacement, parseContactTagsResponse } from './generated/contactTags.js';
import { parseContactCreation, parseContactReference } from './generated/contactCreation.js';
import { parseContactUpdate, parseUpdatedContact } from './generated/contactUpdate.js';
import {parseMessageSendInput} from './generated/messageSend.js';
import { captureEventPublish } from './generated/eventPublish.js';
import { parseFlowRunProgress } from './generated/flowRunProgress.js';
import { parseFlowRunListQuery, parseFlowRunPage } from './generated/flowRunCatalog.js';
import {parseEventBindingQuery,parseEventBindingPage} from './generated/eventBindings.js';
import { parseFlowTemplateCatalogQuery, parseFlowTemplateImport, parseFlowTemplateImportReceipt, parseFlowTemplateId } from './generated/flowTemplateDeployments.js';
import {parseFlowDeploymentQuery,parseFlowTemplateDeployment} from './generated/flowTemplateDeployments.js';
import {parsePreviewBlueprintUpdate,parseBlueprintUpdatePreview} from './generated/flowBlueprintUpdates.js';
import {parseManagedPublicationInput,parseManagedPublicationRequest,parseManagedPublicationQuery,parseManagedPublicationWithdrawal} from './generated/flowPublicationRequests.js';
import {parseManagedFlowRegressionInput,parseManagedFlowRegressionSuiteInput,parseFlowRegressionQuery,parseFlowRegressionCatalogQuery,parseFlowRegressionCatalog,parseFlowRegressionSuite,parseFlowRegressionRun} from './generated/flowRegressions.js';
import {parseManagedFlowSimulationInput,parseFlowDraftSimulation} from './generated/flowSimulations.js';
import {parseFlowGovernanceQuery,parseFlowGovernanceConfiguration} from './generated/flowGovernance.js';
import {parseFlowCatalogView} from './generated/flowTemplateDeployments.js';
import {parseFlowDraftSnapshot,parseFlowDraftSave,validateFlowDraftSaveReceipt} from './generated/flowDrafts.js';
import { parseSoftwareUsageView, parseSoftwareUsageSummary, parseSoftwareLimits } from './generated/softwareUsage.js';
import { parseBusinessAnalyticsReport } from './generated/analytics.js';
import { parseMessagingSettingsUpdate } from './generated/messagingConfiguration.js';
import { parseNotificationPreparation, parseApplyPreparedNotification } from './generated/commandPreparations.js';
import { parsePreparedMessagingConfiguration } from './generated/configurationPreparations.js';
import { parseConversationControlQuery, parseConversationControlState, parseConversationControlCommand, parseConversationControlReceipt,
  type ConversationControlCommand } from './generated/conversationControls.js';
import { parseConversationControlHistoryQuery, parseConversationControlHistoryPage } from './generated/conversationControlHistory.js';
import { parseContactFieldCreation, parseCreatedContactField, parseContactFieldArchive, parseArchivedContactField,
  parseContactFieldMemory, parseConfiguredContactFieldMemory } from './generated/contactFields.js';
import {parseConsentWithdrawal,parseConsentStateQuery,parseContactConsentState} from './generated/consents.js';
import { parseMarketingOptIn } from './generated/consents.js';
import { randomUUID } from 'node:crypto';
import { PUBLIC_OPERATIONS, type PublicOperationId } from './generated/operations.js';
import { DEVELOPER_PROBLEMS, type PublicProblem } from './generated/problem.js';
import { decode, isRecord, SchemaMismatch, type Schema } from './schema.js';
import { attachWriteRecovery, InsideDMApiError, InsideDMConfigurationError, InsideDMError, InsideDMProtocolError, InsideDMTransportError } from './errors.js';
import { parseKnowledgeRunQuery, parseKnowledgeRunProgress, parseKnowledgeRunListQuery, parseKnowledgeRunPage } from './generated/knowledgeRuns.js';
import { parseKnowledgeSourceListQuery, parseKnowledgeSourcePage } from './generated/knowledgeSources.js';
import { parseWebsiteKnowledgeImport, parseWebsiteKnowledgeImportReceipt } from './generated/knowledgeWebsiteImports.js';
import { parseWebsiteKnowledgeRemoval, parseWebsiteKnowledgeRemovalReceipt } from './generated/knowledgeWebsiteRemovals.js';
import { parseKnowledgeSourceId, parseKnowledgeSourceRemoval, parseKnowledgeSourceRemovalReceipt } from './generated/knowledgeSourceRemovals.js';
import { parseKnowledgeDocumentMetadata } from './generated/knowledgeDocuments.js';
import { parseLoyaltyMembership } from './generated/loyaltyMembership.js';
import { parseKnowledgeSectionQuery, parseKnowledgeSectionContentPage } from './generated/knowledgeSections.js';
import { parseKnowledgeSectionId, parseSetKnowledgeSectionOverride, parseAcknowledgeKnowledgeSectionOverride, parseKnowledgeSectionEditReceipt } from './generated/knowledgeSectionEdits.js';
import { parseFlowStepCatalog, parseFlowStepQuery, parseSavedFlowBlockQuery, parseSavedFlowBlockPage,
  parseSavedFlowBlockInterfaceQuery, parseSavedFlowBlockInterface } from './generated/flowSteps.js';
import type { ClientOptions, ClientSettings, AccessTokenProvider, RequestOptions, WriteRequestOptions, ResponseMeta } from './types.js';
import { DEFAULT_API_BASE_URL, SDK_VERSION } from './version.js';

const MAX_BODY_BYTES = 1024 * 1024;
const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
function validAccessToken(value:unknown):value is string{return typeof value==='string'&&/^(?:idmi_)?[A-Za-z0-9_-]{43}$/.test(value);}
function isAccessTokenProvider(value:unknown):value is AccessTokenProvider{return typeof value==='function';}
type Settings = { timeoutMs: number; attemptTimeoutMs: number; maxRetries: number };
/** Internal credential seam; public client configuration never accepts actor assertions or arbitrary authorization headers. */
export type TransportAuthentication={kind:'application';token:string}|{kind:'delegation';businessId:string;
  get:(options:RequestOptions&Settings)=>Promise<string>;invalidate:(token:string)=>void};
type Operation = { method: string; path: string; successStatus: number; pathParameters: Readonly<Record<string, Schema>>; queryParameters: Readonly<Record<string, Schema>>; response: Schema };

function bounded(value: unknown, fallback: number, min: number, max: number, field: string): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new InsideDMConfigurationError(`${field}: use an integer from ${min} to ${max}.`, field);
  }
  return value;
}

function settings(options: RequestOptions, defaults: Settings): Settings {
  if (!isRecord(options)) throw new InsideDMConfigurationError('Provide a request options object.', 'options');
  if (options.signal !== undefined && !(options.signal instanceof AbortSignal)) throw new InsideDMConfigurationError('signal: use a native AbortSignal, such as AbortSignal.timeout(5000).', 'signal');
  return { timeoutMs: bounded(options.timeoutMs, defaults.timeoutMs, 1, 120_000, 'timeoutMs'),
    attemptTimeoutMs: bounded(options.attemptTimeoutMs, defaults.attemptTimeoutMs, 1, 60_000, 'attemptTimeoutMs'),
    maxRetries: bounded(options.maxRetries, defaults.maxRetries, 0, 5, 'maxRetries') };
}

/** Preserve only schema-owned field names and fixed hints, never thrown user values. */
function configurationFailure(error: unknown, fallback: string, field = 'input'): InsideDMConfigurationError {
  if (error instanceof SchemaMismatch) {
    const publicField = error.field === 'request' ? 'input' : error.field.replace(/^request\./, '');
    return new InsideDMConfigurationError(`${publicField}: ${error.hint}`, publicField);
  }
  return new InsideDMConfigurationError(fallback, field);
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
  readonly #accessToken: string | AccessTokenProvider | null;
  #oauthGrantId: string | null = null;
  readonly #baseUrl = DEFAULT_API_BASE_URL;
  readonly #fetch: typeof globalThis.fetch;
  readonly #defaults: Settings;
  #businessId: string | null = null;

  constructor(options:ClientOptions|ClientSettings,authentication:TransportAuthentication|null=null) {
    if (typeof window !== 'undefined') throw new InsideDMConfigurationError('InsideDM API keys belong on your server.');
    if(options===null||typeof options!=='object'||Array.isArray(options))throw new InsideDMConfigurationError('Provide client options with apiKey or accessToken.', 'options');
    const apiKey=options&&'apiKey' in options?options.apiKey??null:null;
    const accessToken=options&&'accessToken' in options?options.accessToken??null:null;
    if(accessToken!==null&&(authentication!==null||apiKey!==null||typeof accessToken!=='function'&&!validAccessToken(accessToken)))throw new InsideDMConfigurationError('accessToken: provide an API access token or provider, separately from apiKey.', 'accessToken');
    if(!options||authentication===null&&accessToken===null&&!parseApiKey(apiKey)&&!parseDelegationCredential(apiKey)
      ||authentication?.kind==='application'&&!parseApplicationCredential(authentication.token))throw new InsideDMConfigurationError('apiKey: provide the complete InsideDM server key from your secret store.', 'apiKey');
    this.#authentication=authentication===null?null:{...authentication};
    this.#accessToken=isAccessTokenProvider(accessToken)||validAccessToken(accessToken)?accessToken:null;
    this.#apiKey=authentication?.kind==='application'?authentication.token:typeof apiKey==='string'?apiKey:null;
    if(authentication?.kind==='delegation')this.#businessId=authentication.businessId;
    if ('baseUrl' in options) throw new InsideDMConfigurationError('baseUrl: the InsideDM API endpoint is managed by the SDK. Remove this option.', 'baseUrl');
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
      if ('contactId' in operation.pathParameters) decode(operation.pathParameters.contactId, contactId, 'contactId', false);
      if (operationId === 'createContact') {
        if (!isRecord(input) || Object.keys(input).some(key => !['name', 'phone'].includes(key))) throw new SchemaMismatch('request', 'contacts.create accepts only name and phone; use separate tag and custom-field methods.');
        input = { ...input, channel: 'whatsapp' };
      }
      // Validate runtime input before serializing: JSON silently drops undefined and changes NaN to null.
      if(operation.request===undefined)throw new Error('Missing mutation contract.');
      decode(operation.request, input, 'request', false);
      body = JSON.stringify(operationId === 'createContact' ? parseContactCreation(JSON.stringify(input))
        : operationId === 'updateContact' ? parseContactUpdate(JSON.stringify(input))
        : operationId === 'replaceContactTags' ? parseContactTagsReplacement(JSON.stringify(input)) : parseContactAttributeUpdate(JSON.stringify(input)));
    } catch (error) {
      const fallback = operationId === 'createContact' ? 'Use a nonblank name of at most 256 characters and an E.164 phone number.'
        : operationId === 'updateContact' ? 'displayName: use 1–256 nonblank characters without control characters, or null to clear it.'
        : operationId === 'replaceContactTags' ? 'tags: provide at most 50 nonblank strings of 1–256 characters; [] clears the set.'
        : 'attributes: provide 1–500 custom-field names with string, finite number, boolean or null values, within 64 KiB.';
      throw configurationFailure(error, fallback, operationId === 'updateContact' ? 'displayName' : operationId === 'replaceContactTags' ? 'tags' : operationId === 'updateContactAttributes' ? 'attributes' : 'input');
    }
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

  async conversationControl(action:ConversationControlCommand['action'],conversationId:string,input:unknown,options:WriteRequestOptions={}){
    let command:ConversationControlCommand;
    try{
      decode(SCHEMAS[action==='assign'?'ConversationAssignmentInput':action==='take_over'?'ConversationTakeoverInput':'ConversationSnoozeInput']!,input,'request',false);
      command=parseConversationControlCommand(JSON.stringify({...input as object,action}));
    }catch(error){throw configurationFailure(error,'Read controls.get first and provide its expectedRevision; assign also needs an active assigneeUserId or null.');}
    return this.ownerOperation('updateConversationControl',conversationId,command,options);
  }

  async ownerOperation(operationId:'removeKnowledgeSource'|'setKnowledgeSectionOverride'|'acknowledgeKnowledgeSectionOverride'|'removeWebsiteKnowledge'|'importWebsiteKnowledge'|'configureContactFieldMemory'|'archiveContactField'|'createContactField'|'updateConversationControl'|'prepareMessagingConfiguration'|'applyPreparedMessagingConfiguration'|'simulateFlowDraft'|'saveFlowRegressionSuite'|'runFlowRegression'|'prepareNotification'|'applyPreparedNotification'|'updateMessagingConfiguration'|'requestFlowPublication'|'withdrawFlowPublication'|'previewBlueprintUpdate'|'saveFlowDraft'|'importFlowTemplate'|'publishEvent'|'sendMessage'|'previewMessage'|'getOperation'|'lookupOperation'|'cancelOperation'|'withdrawConsent'|'recordMarketingOptIn',
    resourceId:string|null,input:unknown,options:WriteRequestOptions={},expectedBusinessId?:string,additionalPathValues:Readonly<Record<string,string>>={}){
    const config=settings(options,this.#defaults),deadline=performance.now()+config.timeoutMs;
    const operation=PUBLIC_OPERATIONS[operationId];
    const resourceParameters=Object.keys(operation.pathParameters).filter(name=>name!=='businessId');
    const resources={...(resourceParameters[0]&&resourceId?{[resourceParameters[0]]:resourceId}:{}),...additionalPathValues};
    let idempotencyKey=operation.idempotency==='required'?options.idempotencyKey??randomUUID():undefined;
    if(idempotencyKey!==undefined&&!isIdempotencyKey(idempotencyKey))throw new InsideDMConfigurationError('Idempotency keys require 1–128 visible ASCII characters.');
    if(idempotencyKey===undefined&&operationId!=='publishEvent'&&options.idempotencyKey!==undefined)throw new InsideDMConfigurationError('Read and preview requests do not take an idempotency key.');
    let body:string|undefined;
    try{
      if(operationId==='setKnowledgeSectionOverride'||operationId==='acknowledgeKnowledgeSectionOverride')resources.sectionId=parseKnowledgeSectionId(resourceId);
      if(operationId==='removeKnowledgeSource')resources.sourceId=parseKnowledgeSourceId(resourceId);
      if(Object.keys(resources).some(name=>!resourceParameters.includes(name))||Object.keys(resources).length!==resourceParameters.length)throw new InsideDMConfigurationError('Provide the operation-specific resource IDs.');
      for(const name of resourceParameters)decode(operation.pathParameters[name]!,resources[name],name,false);
      if(operationId==='importFlowTemplate')parseFlowTemplateId(resourceId);
      if(operation.request!==undefined){
        if((operationId==='sendMessage'||operationId==='previewMessage'||operationId==='prepareNotification')&&typeof input==='object'&&input!==null&&!Array.isArray(input)){
          const message=input as {intent?:unknown};
          input={...message,intent:message.intent===undefined?'notification':message.intent};
        }
        decode(operation.request,input,'request',false);
        body=JSON.stringify(input);
        if(operationId==='importWebsiteKnowledge')body=JSON.stringify(parseWebsiteKnowledgeImport(body));
        if(operationId==='removeWebsiteKnowledge')body=JSON.stringify(parseWebsiteKnowledgeRemoval(body));
        if(operationId==='removeKnowledgeSource')body=JSON.stringify(parseKnowledgeSourceRemoval(body));
        if(operationId==='setKnowledgeSectionOverride')body=JSON.stringify(parseSetKnowledgeSectionOverride(body));
        if(operationId==='acknowledgeKnowledgeSectionOverride')body=JSON.stringify(parseAcknowledgeKnowledgeSectionOverride(body));
        if(operationId==='createContactField')body=JSON.stringify(parseContactFieldCreation(body));
        if(operationId==='archiveContactField')body=JSON.stringify(parseContactFieldArchive(body));
        if(operationId==='configureContactFieldMemory')body=JSON.stringify(parseContactFieldMemory(body));
        if(operationId==='updateConversationControl')body=JSON.stringify(parseConversationControlCommand(body));
        if (operationId === 'updateMessagingConfiguration' || operationId === 'prepareMessagingConfiguration') body = JSON.stringify(parseMessagingSettingsUpdate(body));
        if(operationId==='sendMessage'||operationId==='previewMessage')body=JSON.stringify(parseMessageSendInput(body));
        if(operationId==='prepareNotification')body=JSON.stringify(parseNotificationPreparation(body));
        if(operationId==='applyPreparedNotification'||operationId==='applyPreparedMessagingConfiguration')body=JSON.stringify(parseApplyPreparedNotification(body));
        if(operationId==='withdrawConsent')body=JSON.stringify(parseConsentWithdrawal(body));
        if(operationId==='recordMarketingOptIn')body=JSON.stringify(parseMarketingOptIn(body));
        if(operationId==='importFlowTemplate')body=JSON.stringify(parseFlowTemplateImport(body));
        if(operationId==='previewBlueprintUpdate')body=JSON.stringify(parsePreviewBlueprintUpdate(body));
        if(operationId==='saveFlowDraft')body=JSON.stringify(parseFlowDraftSave(body));
        if(operationId==='requestFlowPublication')body=JSON.stringify(parseManagedPublicationInput(body));
        if(operationId==='withdrawFlowPublication')body=JSON.stringify(parseManagedPublicationWithdrawal(body));
        if(operationId==='runFlowRegression')body=JSON.stringify(parseManagedFlowRegressionInput(body));
        if(operationId==='saveFlowRegressionSuite')body=JSON.stringify(parseManagedFlowRegressionSuiteInput(body));
        if(operationId==='simulateFlowDraft')body=JSON.stringify(parseManagedFlowSimulationInput(body));
        if (operationId === 'publishEvent') {
          const { occurredAt, ...event } = captureEventPublish(input);
          if (options.idempotencyKey !== undefined && options.idempotencyKey !== event.id) throw new SchemaMismatch('idempotencyKey', 'events.publish uses input.id as its retry key. Omit options.idempotencyKey or use that same ID.');
          idempotencyKey = event.id;
          body = JSON.stringify({ ...event, ...(occurredAt === null ? {} : { occurredAt }) });
        }
        if(Buffer.byteLength(body)>(operation.bodyLimit??65536))throw new SchemaMismatch('request', 'Keep the serialized request within its documented operation byte limit.');
      }
    }catch(error){
      const hint = operationId === 'sendMessage' || operationId === 'previewMessage' || operationId === 'prepareNotification'
        ? 'Use nonblank text of at most 1000 characters, or an approved template with nonblank variable values of at most 1024 characters.'
        : operationId === 'updateConversationControl' ? 'Read conversations.controls.get first and provide its exact expectedRevision with the documented control action. Only actual user access can change ownership.'
        : operationId === 'createContactField' ? 'Provide a field label of at most 256 characters, an optional lowercase key and a supported type. Agent memory is off on creation.'
        : operationId === 'importWebsiteKnowledge' ? 'Provide a public HTTP(S) website URL without credentials or a nondefault port, and an optional maxPages from 1 to 100. Retain the original input and retry key.'
        : operationId === 'removeWebsiteKnowledge' ? 'Provide the exact HTTP(S) website URL to remove. Keep the original input/key after uncertainty so a retry cannot remove a later re-add.'
        : operationId === 'removeKnowledgeSource' ? 'Use a source UUID from knowledge.sources.list and documentVersion from knowledge.sections.list as expectedVersion. Retain the exact source, version and key after uncertainty.'
        : operationId === 'setKnowledgeSectionOverride' || operationId === 'acknowledgeKnowledgeSectionOverride' ? 'Use the section UUID and current documentVersion from knowledge.sections.list as expectedVersion. Correction text is verbatim within 64 KiB UTF-8; null clears it. Retain the exact original input and retry key after uncertainty.'
        : operationId === 'archiveContactField' ? 'Provide the field ID and expectedVersion from the current contacts.fields.list catalog. Retain the original version and key after uncertainty.'
        : operationId === 'configureContactFieldMemory' ? 'Provide the field ID, current catalog expectedVersion and explicit agentMayRemember. Omit agentHint to keep it or use null to clear it.'
        : operationId === 'applyPreparedNotification' || operationId === 'applyPreparedMessagingConfiguration' ? 'Provide the preparation ID and its current approved expectedRevision.'
        : operationId === 'publishEvent' ? 'Use a stable event ID, published flow binding and known contact. Properties must be plain JSON within 32 KiB, without undefined, Date or non-finite numbers.'
        : operationId === 'withdrawConsent' ? 'Use one E.164 phone number and a supported purpose, without consent-grant fields.'
        : operationId === 'recordMarketingOptIn' ? 'Provide only the ID of the retained inbound message containing the customer request.'
        : operationId === 'importFlowTemplate' ? 'Use a discovered template ID, its exact version and reviewed endpoint bindings.'
        : operationId === 'lookupOperation' ? 'Provide the original send key, or {kind: "events.publish", idempotencyKey: originalEventId}.'
        : operationId === 'cancelOperation' ? 'Provide the operation ID and its current opaque revision.'
        : operationId === 'updateMessagingConfiguration' || operationId === 'prepareMessagingConfiguration' ? 'Provide the complete configuration and its current expectedVersion.'
        : 'Use the current saved deployment or source preview with its exact revisions and reviewed bindings.';
      throw configurationFailure(error, hint);
    }
    try{
      if(this.#businessId===null){
        const workspace=await this.request('getWorkspace',{},{},{...options,timeoutMs:Math.max(1,Math.floor(deadline-performance.now()))});
        this.#businessId=(workspace.body as {data:{id:string}}).data.id;
      }
      if(expectedBusinessId!==undefined&&this.#businessId!==expectedBusinessId)throw new InsideDMConfigurationError('Use the business client that owns the saved deployment.');
      const remaining=Math.floor(deadline-performance.now());
      if(remaining<1)throw new InsideDMTransportError('timeout',{code:'request_timeout'});
      const result=await this.request(operationId,{businessId:this.#businessId,...resources},operationId==='setKnowledgeSectionOverride'||operationId==='acknowledgeKnowledgeSectionOverride'?{view:'edit'}:operationId==='removeWebsiteKnowledge'||operationId==='removeKnowledgeSource'?{view:'remove'}:operationId==='importWebsiteKnowledge'?{view:'import'}:operationId==='updateConversationControl'?{view:'control'}:operationId==='createContactField'?{view:'creation'}:operationId==='archiveContactField'?{view:'archive'}:operationId==='configureContactFieldMemory'?{view:'memory'}:{},
        {...options,timeoutMs:remaining},body===undefined?undefined:{body,...(idempotencyKey?{idempotencyKey}:{})});
      if(operationId==='setKnowledgeSectionOverride'||operationId==='acknowledgeKnowledgeSectionOverride'){
        try{const data=parseKnowledgeSectionEditReceipt((result.body as {data:unknown}).data);
          const expected=operationId==='setKnowledgeSectionOverride'?parseSetKnowledgeSectionOverride(body!):parseAcknowledgeKnowledgeSectionOverride(body!);
          const action=operationId==='acknowledgeKnowledgeSectionOverride'?'acknowledge_override'
            :'overrideMd' in expected&&expected.overrideMd===null?'clear_override':'set_override';
          if(data.businessId!==this.#businessId||data.sectionId!==resources.sectionId||data.action!==action||data.documentVersion!==expected.expectedVersion+1)throw new Error();result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned a different knowledge correction receipt.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='removeKnowledgeSource'){
        try{const data=parseKnowledgeSourceRemovalReceipt((result.body as {data:unknown}).data),expected=parseKnowledgeSourceRemoval(body!);
          if(data.businessId!==this.#businessId||data.sourceId!==resources.sourceId||data.documentVersion<expected.expectedVersion)throw new Error();result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned a different knowledge source removal receipt.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='removeWebsiteKnowledge'){
        try{const data=parseWebsiteKnowledgeRemovalReceipt((result.body as {data:unknown}).data),expected=parseWebsiteKnowledgeRemoval(body!);
          if(data.businessId!==this.#businessId||data.url!==expected.url)throw new Error();result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned a different website removal receipt.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='importWebsiteKnowledge'){
        try{const data=parseWebsiteKnowledgeImportReceipt((result.body as {data:unknown}).data),expected=parseWebsiteKnowledgeImport(body!);
          if(data.businessId!==this.#businessId||data.url!==expected.url||data.maxPages!==(expected.maxPages??100))throw new Error();
          result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned a different website import acceptance.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='createContactField'){
        try{const data=parseCreatedContactField((result.body as {data:unknown}).data),expected=parseContactFieldCreation(body!);
          if(data.businessId!==this.#businessId||data.definition.label!==expected.label||data.definition.type!==expected.type
            ||expected.key!==null&&data.definition.key!==expected.key)throw new Error();result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned a different field creation result.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='archiveContactField'){
        try{const data=parseArchivedContactField((result.body as {data:unknown}).data),expected=parseContactFieldArchive(body!);
          if(data.businessId!==this.#businessId||data.definitionId!==resourceId||data.appliedVersion!==expected.expectedVersion+1)throw new Error();result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned a different field archival result.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='configureContactFieldMemory'){
        try{const data=parseConfiguredContactFieldMemory((result.body as {data:unknown}).data),expected=parseContactFieldMemory(body!);
          if(data.businessId!==this.#businessId||data.definition.id!==resourceId||data.appliedVersion!==expected.expectedVersion+Number(data.changed)
            ||data.definition.agentMayRemember!==expected.agentMayRemember||Object.hasOwn(expected,'agentHint')&&data.definition.agentHint!==expected.agentHint)throw new Error();result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned a different field memory result.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='updateConversationControl'){
        try{const data=parseConversationControlReceipt((result.body as {data:unknown}).data),expected=parseConversationControlCommand(body!);
          if(data.businessId!==this.#businessId||data.conversationId!==resourceId||data.action!==expected.action
            ||expected.action==='assign'&&data.assigneeUserId!==expected.assigneeUserId)throw new Error();result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned an invalid conversation control acceptance.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='prepareMessagingConfiguration'||operationId==='applyPreparedMessagingConfiguration'){
        try{
          const data=parsePreparedMessagingConfiguration((result.body as {data:unknown}).data);
          if(data.businessId!==this.#businessId||resourceId!==null&&data.id!==resourceId)throw new Error();
          result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned an invalid prepared settings result.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='importFlowTemplate'){
        try{
          const data=parseFlowTemplateImportReceipt((result.body as {data:unknown}).data);
          const expected=parseFlowTemplateImport(body!);
          if(data.businessId!==this.#businessId||data.packId!==resourceId||data.version!==expected.version||expected.blueprint&&data.digest!==expected.blueprint.digest)throw new Error('Wrong template attribution.');
          result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned an invalid template creation receipt.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='requestFlowPublication'){
        try{
          const expected=parseManagedPublicationInput(body!),data=parseManagedPublicationRequest((result.body as {data:unknown}).data);
          if(data.businessId!==this.#businessId||data.recipeId!==resourceId||data.deploymentRevision!==expected.expectedDeploymentRevision||data.draftRevision!==expected.expectedDraftRevision)throw new Error();
          result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned an invalid publication request.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='simulateFlowDraft'){
        try{const expected=parseManagedFlowSimulationInput(body!),data=parseFlowDraftSimulation((result.body as {data:unknown}).data);
          if(data.businessId!==this.#businessId||data.recipeId!==resourceId||data.draftRevision!==expected.expectedRevision||data.status==='passed'&&expected.pathId!==undefined&&data.selectedPath?.id!==expected.pathId)throw new Error();result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned an invalid native simulation.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='saveFlowRegressionSuite'){
        try{const expected=parseManagedFlowRegressionSuiteInput(body!),data=parseFlowRegressionSuite((result.body as {data:unknown}).data);
          if(data.businessId!==this.#businessId||data.recipeId!==resourceId||expected.suiteId!==null&&data.id!==expected.suiteId)throw new Error();result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned an invalid regression suite.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='runFlowRegression'){
        try{const expected=parseManagedFlowRegressionInput(body!),data=parseFlowRegressionRun((result.body as {data:unknown}).data);
          if(data.businessId!==this.#businessId||data.recipeId!==resourceId||data.releaseRequestId!==expected.releaseRequestId||data.suiteId!==expected.suiteId||data.suiteRevision!==expected.expectedSuiteRevision)throw new Error();
          result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned an invalid regression run.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='withdrawFlowPublication'){
        try{
          const data=parseManagedPublicationRequest((result.body as {data:unknown}).data);
          if(data.businessId!==this.#businessId||data.recipeId!==resources.recipeId||data.id!==resources.releaseRequestId||data.status!=='dismissed')throw new Error();
          result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned an invalid publication withdrawal.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='saveFlowDraft'){
        try{result.body={data:validateFlowDraftSaveReceipt((result.body as {data:unknown}).data,parseFlowDraftSave(body!),this.#businessId,resourceId!)};}
        catch{throw new InsideDMProtocolError('InsideDM returned an invalid draft save receipt.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      if(operationId==='previewBlueprintUpdate'){
        try{
          const expected=parsePreviewBlueprintUpdate(body!),data=parseBlueprintUpdatePreview((result.body as {data:unknown}).data);
          if(data.businessId!==this.#businessId||data.recipeId!==resourceId||JSON.stringify(data.target)!==JSON.stringify(expected.target))throw new Error('Wrong update attribution.');
          if(expected.bindings&&JSON.stringify(data.bindings)!==JSON.stringify(expected.bindings))throw new Error('Wrong update bindings.');
          result.body={data};
        }catch{throw new InsideDMProtocolError('InsideDM returned an invalid blueprint update result.',{code:'invalid_response',requestId:result.meta.requestId});}
      }
      return result;
    }catch(error){
      if(error instanceof InsideDMError&&idempotencyKey&&(operationId==='setKnowledgeSectionOverride'||operationId==='acknowledgeKnowledgeSectionOverride')){
        const original=operationId==='setKnowledgeSectionOverride'?parseSetKnowledgeSectionOverride(body!):parseAcknowledgeKnowledgeSectionOverride(body!);
        throw attachWriteRecovery(error,{operation:operationId,sectionId:resources.sectionId!,expectedVersion:original.expectedVersion,idempotencyKey});
      }
      if(error instanceof InsideDMError&&idempotencyKey&&(operationId==='importWebsiteKnowledge'||operationId==='removeWebsiteKnowledge'))throw attachWriteRecovery(error,{operation:operationId,idempotencyKey});
      if(error instanceof InsideDMError&&idempotencyKey&&operationId==='removeKnowledgeSource'){
        const original=parseKnowledgeSourceRemoval(body!);
        throw attachWriteRecovery(error,{operation:operationId,sourceId:resources.sourceId!,expectedVersion:original.expectedVersion,idempotencyKey});
      }
      if(error instanceof InsideDMError&&idempotencyKey&&operationId==='configureContactFieldMemory'){
        const original=parseContactFieldMemory(body!);
        throw attachWriteRecovery(error,{operation:operationId,definitionId:resourceId!,expectedVersion:original.expectedVersion,idempotencyKey});
      }
      if(error instanceof InsideDMError&&idempotencyKey&&operationId==='archiveContactField'){
        const original=parseContactFieldArchive(body!);
        throw attachWriteRecovery(error,{operation:operationId,definitionId:resourceId!,expectedVersion:original.expectedVersion,idempotencyKey});
      }
      if(error instanceof InsideDMError&&idempotencyKey&&operationId==='updateConversationControl'){
        const original=parseConversationControlCommand(body!);
        throw attachWriteRecovery(error,{operation:operationId,conversationId:resourceId!,...original,idempotencyKey});
      }
      if(error instanceof InsideDMError&&idempotencyKey&&operationId==='saveFlowRegressionSuite'){
        const original=parseManagedFlowRegressionSuiteInput(body!);
        throw attachWriteRecovery(error,{operation:operationId,recipeId:resources.recipeId!,suiteId:original.suiteId,expectedRevision:original.expectedRevision,idempotencyKey});
      }
      if(error instanceof InsideDMError&&idempotencyKey&&operationId==='runFlowRegression'){
        const original=parseManagedFlowRegressionInput(body!);
        throw attachWriteRecovery(error,{operation:operationId,recipeId:resources.recipeId!,releaseRequestId:original.releaseRequestId,suiteId:original.suiteId,expectedSuiteRevision:original.expectedSuiteRevision,idempotencyKey});
      }
      if(error instanceof InsideDMError&&idempotencyKey)throw attachWriteRecovery(error,operationId==='withdrawFlowPublication'?{operation:operationId,recipeId:resources.recipeId!,releaseRequestId:resources.releaseRequestId!,idempotencyKey}:operationId==='requestFlowPublication'||operationId==='saveFlowDraft'?{operation:operationId,recipeId:resourceId!,idempotencyKey}:operationId==='importFlowTemplate'?{operation:operationId,packId:resourceId!,idempotencyKey}:operationId==='sendMessage'||operationId==='publishEvent'
        ?{operation:operationId,idempotencyKey}:operationId==='createContactField'||operationId==='prepareMessagingConfiguration'||operationId==='prepareNotification'||operationId==='withdrawConsent'||operationId==='recordMarketingOptIn'||operationId==='updateMessagingConfiguration'?{operation:operationId,idempotencyKey}:{operation:'cancelOperation',operationId:resourceId!,idempotencyKey});
      throw error;
    }
  }

  async request(operationId: PublicOperationId, pathValues: Record<string, string>, query: object, options: RequestOptions = {}, mutation?: { body: string; idempotencyKey?: string }): Promise<{ body: unknown; meta: ResponseMeta }> {
    const platformOperation=PARTNER_BLUEPRINT_OPERATIONS.some(item=>item.id===operationId)||PARTNER_SUBSCRIPTION_OPERATIONS.some(item=>item.id===operationId)||operationId==='createBusinessDelegation'||operationId==='createInstallationRequest'||operationId==='getInstallationRequest'||operationId==='getApplicationSelf'||operationId==='getInstallation'||operationId==='revokeInstallation'||operationId==='listPlatformBusinesses'||operationId==='getPlatformBusiness'||operationId==='getPartnerApiUsage'
      ||operationId==='createPlatformBusiness'||operationId==='getBusinessCreation'||operationId==='renewBusinessClaimLink'||operationId==='createOnboardingSession'||operationId==='getOnboardingSession';
    if((this.#authentication?.kind==='application')!==platformOperation)throw new InsideDMConfigurationError('Use the matching business or platform client for this operation.');
    const operation: Operation = PUBLIC_OPERATIONS[operationId];
    const config = settings(options, this.#defaults);
    const deadline = performance.now() + config.timeoutMs;
    // Bind an OAuth client before any resource operation. The discovery is a
    // read; subsequent expectations are enforced by ingress before effects.
    if(this.#accessToken!==null&&operationId!=='getWorkspace'&&this.#businessId===null){
      const workspace=await this.request('getWorkspace',{},{},{...options,timeoutMs:Math.max(1,Math.floor(deadline-performance.now()))});
      if((workspace.body as {data:{id:string}}).data.id!==this.#businessId)throw new InsideDMProtocolError('InsideDM returned inconsistent business context.',{code:'credential_context_changed'});
    }
    const url = this.#url(operation, pathValues, query);
    let last: InsideDMError | null = null;
    let transientRetries=0,refreshed=false;
    for (let attempt = 1; ; attempt++) {
      if (options.signal?.aborted) throw aborted(attempt - 1, options.signal);
      let remaining = deadline - performance.now();
      if (remaining <= 0) throw new InsideDMTransportError('timeout', { code: 'request_timeout', attempts: attempt - 1 });
      let token:string|null;
      if(this.#accessToken!==null){
        const authController=new AbortController(),authTimer=setTimeout(()=>authController.abort(),remaining);
        const onAuthAbort=()=>authController.abort();options.signal?.addEventListener('abort',onAuthAbort,{once:true});
        try{
          const credential=this.#accessToken;
          const pending=Promise.resolve().then(()=>typeof credential==='function'?credential(Object.freeze({operation:operationId,method:operation.method,
            route:new URL(url).pathname+new URL(url).search,body:mutation?.body??null,idempotencyKey:mutation?.idempotencyKey??null,
            businessId:this.#businessId,grantId:this.#oauthGrantId,signal:authController.signal})):credential);
          token=await interruptible(pending,authController.signal,()=>aborted(attempt-1,options.signal));
          if(!validAccessToken(token))throw new InsideDMConfigurationError('accessToken: the provider must return an API access token.', 'accessToken');
        }catch(error){
          if(authController.signal.aborted)throw aborted(attempt-1,options.signal);
          throw new InsideDMConfigurationError('accessToken: the credential provider failed. Check your token manager.', 'accessToken');
        }finally{clearTimeout(authTimer);options.signal?.removeEventListener('abort',onAuthAbort);authController.abort();}
      }else token=this.#authentication?.kind==='delegation'?await this.#authentication.get({...options,...config,timeoutMs:Math.max(1,Math.floor(remaining))}):this.#apiKey;
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
          ...(this.#accessToken!==null&&this.#businessId!==null&&this.#oauthGrantId!==null?{'x-insidedm-business-id':this.#businessId,'x-insidedm-grant-id':this.#oauthGrantId}:{}),
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
        let oauthContext:{businessId:string;grantId:string}|null=null;
        if(this.#accessToken!==null){
          const business=response.headers.get('x-insidedm-business-id'),grant=response.headers.get('x-insidedm-grant-id'),uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
          if(!business||!grant||!uuid.test(business)||!uuid.test(grant)||this.#businessId!==null&&this.#businessId!==business||this.#oauthGrantId!==null&&this.#oauthGrantId!==grant){
            throw new InsideDMProtocolError('InsideDM returned a different credential context. Create a separate client for each authorized connection.',{code:'credential_context_changed',...meta});
          }
          oauthContext={businessId:business,grantId:grant};
        }
        let body:unknown;
        try { body=decode(operation.response, raw); }
        catch { throw new InsideDMProtocolError('InsideDM returned data outside the public contract.', { ...meta, code: 'invalid_response' }); }
        if(oauthContext){
          if(operationId==='getWorkspace'&&(body as {data:{id:string}}).data.id!==oauthContext.businessId)throw new InsideDMProtocolError('InsideDM returned inconsistent business context.',{...meta,code:'credential_context_changed'});
          this.#businessId=oauthContext.businessId;this.#oauthGrantId=oauthContext.grantId;
        }
        return {body,meta};
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
  async requestForBusiness(operationId: 'listFlowRuns' | 'getLoyaltyMembership' | 'getKnowledgeDocument' | 'listKnowledgeSections' | 'listKnowledgeSources' | 'listKnowledgeRuns' | 'getKnowledgeRun' | 'getSavedFlowBlockInterface' | 'listSavedFlowBlocks' | 'listFlowSteps' | 'listConversationAssignees' | 'getConversationControl' | 'getPreparedMessagingConfiguration' | 'getFlowGovernance' | 'listFlowRegressionSuites' | 'getFlowRegressionRun' | 'listContactFields' | 'getPreparedNotification' | 'getBusinessAnalytics' | 'listEventBindings' | 'getFlowPublicationRequest' | 'getFlowDeployment' | 'getFlowTemplateCatalog' | 'getSoftwareUsage' | 'listTemplates' | 'getMessagingReadiness' | 'getMessagingConfiguration' | 'getConsentState' | 'getFlowRun', query: object, options: RequestOptions = {}, pathValues: Record<string,string> = {}) {
    const config = settings(options, this.#defaults), deadline = performance.now() + config.timeoutMs;
    if(operationId==='listConversationAssignees'){
      if(!isRecord(query)||Object.keys(query).some(key=>!['limit','cursor'].includes(key)))throw new InsideDMConfigurationError('Assignee pages accept only limit and cursor.');
      query={...query,view:'assignees'};
    }
    if (!isRecord(query)) throw new InsideDMConfigurationError('Query parameters must be an object.');
    const snapshot = { ...query };
    if (operationId === 'listFlowRuns') {
      try {
        if ('idempotencyKey' in options || Object.keys(snapshot).some(key => !['flowId', 'status', 'limit', 'cursor'].includes(key))) throw new Error();
        const params = Object.fromEntries(Object.entries(snapshot).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
        Object.assign(snapshot, parseFlowRunListQuery('?' + new URLSearchParams({ view: 'progress', ...params })), { view: 'progress' });
      } catch { throw new InsideDMConfigurationError('Flow run discovery accepts flowId, status, limit (1–100), the original cursor and normal read options.'); }
    }
    if(operationId==='getLoyaltyMembership'){
      pathValues={...pathValues};
      if(Object.keys(snapshot).length||'idempotencyKey' in options||Object.keys(pathValues).length!==1
        ||typeof pathValues.contactId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(pathValues.contactId))
        throw new InsideDMConfigurationError('Loyalty membership takes a contact UUID and normal read options.');
    }
    if(operationId==='getKnowledgeDocument'&&(Object.keys(snapshot).length||'idempotencyKey' in options))
      throw new InsideDMConfigurationError('Knowledge metadata reads accept normal request options without query fields or an idempotency key.');
    if(operationId==='listKnowledgeSections'){
      try{if('idempotencyKey' in options||Object.keys(snapshot).some(key=>!['limit','cursor'].includes(key)))throw new Error();
        Object.assign(snapshot,parseKnowledgeSectionQuery('?'+new URLSearchParams({view:'sections',...Object.fromEntries(Object.entries(snapshot).filter(([,v])=>v!==undefined))} as Record<string,string>)),{view:'sections'});}
      catch{throw new InsideDMConfigurationError('Knowledge section pages accept a limit of 1–25 and the original cursor. Content access requires knowledge.content.read.');}
    }
    if(operationId==='listKnowledgeSources'){
      try{if('idempotencyKey' in options||Object.keys(snapshot).some(key=>!['limit','cursor','kind','status'].includes(key)))throw new Error();
        Object.assign(snapshot,parseKnowledgeSourceListQuery('?'+new URLSearchParams({view:'catalog',...Object.fromEntries(Object.entries(snapshot).filter(([,v])=>v!==undefined))} as Record<string,string>)),{view:'catalog'});}
      catch{throw new InsideDMConfigurationError('Knowledge source pages accept a limit of 1–100, supported kind/status filters and the original cursor.');}
    }
    if(operationId==='listKnowledgeRuns'){
      try{if('idempotencyKey' in options||Object.keys(snapshot).some(key=>!['limit','cursor','status'].includes(key)))throw new Error();
        Object.assign(snapshot,parseKnowledgeRunListQuery('?'+new URLSearchParams({view:'ingestion_runs',...Object.fromEntries(Object.entries(snapshot).filter(([,v])=>v!==undefined))} as Record<string,string>)),{view:'ingestion_runs'});}
      catch{throw new InsideDMConfigurationError('Knowledge run pages accept a limit of 1–100, a native status and the original cursor.');}
    }
    if(operationId==='getKnowledgeRun'){
      try{if('idempotencyKey' in options)throw new Error();parseKnowledgeRunQuery('?'+new URLSearchParams(snapshot as Record<string,string>));}
      catch{throw new InsideDMConfigurationError('Knowledge progress takes a run ID and normal read options.');}
    }
    if(operationId==='getSavedFlowBlockInterface'){
      try{if('idempotencyKey' in options)throw new Error();Object.assign(snapshot,parseSavedFlowBlockInterfaceQuery('?'+new URLSearchParams(snapshot as Record<string,string>)));}
      catch{throw new InsideDMConfigurationError('Provide the exact saved block versionId and normal read options.');}
    }
    if(operationId==='listSavedFlowBlocks'){
      try{if('idempotencyKey' in options||Object.keys(snapshot).some(key=>!['limit','cursor'].includes(key)))throw new Error();
        const parsed=parseSavedFlowBlockQuery('?'+new URLSearchParams({view:'saved_references',...Object.fromEntries(Object.entries(snapshot).filter(([,v])=>v!==undefined))} as Record<string,string>));
        Object.assign(snapshot,parsed,{view:'saved_references'});}
      catch{throw new InsideDMConfigurationError('Saved flow blocks accept a limit of 1–100 and the original cursor.');}
    }
    if(operationId==='listFlowSteps'){
      try{if('idempotencyKey' in options)throw new Error();parseFlowStepQuery('?'+new URLSearchParams(snapshot as Record<string,string>));}
      catch{throw new InsideDMConfigurationError('Flow step discovery accepts only normal read options.');}
    }
    if(operationId==='listConversationAssignees'){
      try{if('idempotencyKey' in options)throw new Error();const supplied=Object.fromEntries(Object.entries(snapshot).filter(([,value])=>value!==undefined));
        const parsed=parseConversationAssigneeQuery('?'+new URLSearchParams(supplied as Record<string,string>));Object.assign(snapshot,parsed);}
      catch{throw new InsideDMConfigurationError('Provide an assignee limit of 1–100 and the original page cursor.');}
    }
    if(operationId==='getConversationControl'){
      try{if('idempotencyKey' in options)throw new Error();const route='?'+new URLSearchParams(Object.fromEntries(Object.entries(snapshot).filter(([,value])=>value!==undefined)) as Record<string,string>);
        if(snapshot.view==='control_history')Object.assign(snapshot,parseConversationControlHistoryQuery(route));else parseConversationControlQuery(route);}
      catch{throw new InsideDMConfigurationError('Use controls.get, or controls.history with a limit of 1–100 and its original cursor.');}
    }
    if(operationId==='getFlowGovernance'){
      try{if('idempotencyKey' in options)throw new Error();parseFlowGovernanceQuery('?'+new URLSearchParams(snapshot as Record<string,string>));}
      catch{throw new InsideDMConfigurationError('Governance reads take a flow ID and normal request options.');}
    }
    if(operationId==='listFlowRegressionSuites'||operationId==='getFlowRegressionRun'){
      try{if('idempotencyKey' in options)throw new Error();const route='?'+new URLSearchParams(snapshot as Record<string,string>);if(operationId==='listFlowRegressionSuites')parseFlowRegressionCatalogQuery(route);else parseFlowRegressionQuery(route);}
      catch{throw new InsideDMConfigurationError('Provide exact flow/release/run IDs and normal read options.');}
    }
    if(operationId==='listEventBindings'){
      try{
        if(Object.keys(snapshot).some(key=>!['limit','cursor'].includes(key))||'idempotencyKey' in options)throw new Error();
        const supplied=Object.fromEntries(Object.entries(snapshot).filter(([,value])=>value!==undefined));
        Object.assign(snapshot,{view:'event_bindings',...parseEventBindingQuery('?'+new URLSearchParams({...supplied,view:'event_bindings'} as Record<string,string>))});
      }catch{throw new InsideDMConfigurationError('Provide an event binding limit of 1–100 and an optional continuation cursor.');}
    }
    if(operationId==='getFlowPublicationRequest'){
      try{if('idempotencyKey' in options)throw new Error();parseManagedPublicationQuery('?'+new URLSearchParams(snapshot as Record<string,string>).toString());}
      catch{throw new InsideDMConfigurationError('Publication request reads take flow/request IDs and normal request options.');}
    }
    if(operationId==='getFlowDeployment'){
      try{
        if('idempotencyKey' in options)throw new Error('Read mutation key.');
        parseFlowDeploymentQuery('?'+new URLSearchParams(snapshot as Record<string,string>).toString());
      }catch{throw new InsideDMConfigurationError('Deployment reads accept a flow ID and request options, without an idempotency key.');}
    }
    if (operationId === 'getFlowTemplateCatalog') {
      try {
        if (Object.keys(snapshot).some(key => !['view','limit','cursor'].includes(key)) || 'idempotencyKey' in options||snapshot.view!==undefined&&snapshot.view!=='flow_deployments') throw new Error('Unsupported catalog input.');
        const supplied = Object.fromEntries(Object.entries(snapshot).filter(([,value]) => value !== undefined));
        const view=snapshot.view==='flow_deployments'?'flow_deployments':'flow_templates';
        Object.assign(snapshot, { view, ...parseFlowTemplateCatalogQuery('?' + new URLSearchParams({ ...supplied, view } as Record<string,string>).toString()) });
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
    if(operationId==='listKnowledgeSections'){
      try{const data=parseKnowledgeSectionContentPage(result.body);
        if(data.businessId!==this.#businessId||data.data.length>Number(snapshot.limit))throw new Error();result.body=data;}
      catch{throw new InsideDMProtocolError('InsideDM returned an invalid knowledge section page.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='listKnowledgeSources'){
      try{const data=parseKnowledgeSourcePage(result.body);
        if(data.businessId!==this.#businessId||data.data.length>Number(snapshot.limit)
          ||snapshot.kind!==undefined&&data.data.some(source=>source.kind!==snapshot.kind)
          ||snapshot.status!==undefined&&data.data.some(source=>source.status!==snapshot.status))throw new Error();result.body=data;}
      catch{throw new InsideDMProtocolError('InsideDM returned an invalid knowledge source page.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='listKnowledgeRuns'){
      try{const data=parseKnowledgeRunPage(result.body);
        if(data.businessId!==this.#businessId||data.data.length>Number(snapshot.limit)||snapshot.status!==undefined&&data.data.some(run=>run.status!==snapshot.status))throw new Error();result.body=data;}
      catch{throw new InsideDMProtocolError('InsideDM returned an invalid knowledge run page.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='getKnowledgeRun'){
      try{const data=parseKnowledgeRunProgress((result.body as {data:unknown}).data);
        if(data.businessId!==this.#businessId||data.id!==pathValues.runId?.toLowerCase())throw new Error();result.body={data};}
      catch{throw new InsideDMProtocolError('InsideDM returned a different knowledge indexing run.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='listConversationAssignees'){
      try{const data=parseConversationAssigneePage(result.body);
        if(data.businessId!==this.#businessId||data.data.length>Number(snapshot.limit))throw new Error();result.body=data;
      }catch{throw new InsideDMProtocolError('InsideDM returned an invalid assignee directory.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='listSavedFlowBlocks'){
      try{const data=parseSavedFlowBlockPage(result.body);if(data.businessId!==this.#businessId||data.data.length>Number(snapshot.limit))throw new Error();result.body=data;}
      catch{throw new InsideDMProtocolError('InsideDM returned an invalid saved flow-block catalog.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='getSavedFlowBlockInterface'){
      try{const data=parseSavedFlowBlockInterface((result.body as {data:unknown}).data);
        if(data.businessId!==this.#businessId||data.flowId!==pathValues.flowId?.toLowerCase()||data.versionId!==snapshot.versionId)throw new Error();result.body={data};}
      catch{throw new InsideDMProtocolError('InsideDM returned a different saved flow-block interface.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='getConversationControl'){
      try{const data=snapshot.view==='control_history'?parseConversationControlHistoryPage((result.body as {data:unknown}).data):parseConversationControlState((result.body as {data:unknown}).data);
        if(data.businessId!==this.#businessId||data.conversationId!==pathValues.conversationId
          ||'events' in data&&data.events.length>Number(snapshot.limit))throw new Error();result.body={data};
      }catch{throw new InsideDMProtocolError('InsideDM returned a different conversation control snapshot.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='getPreparedMessagingConfiguration'){
      try{const data=parsePreparedMessagingConfiguration((result.body as {data:unknown}).data);
        if(data.businessId!==this.#businessId||data.id!==pathValues.preparationId)throw new Error();result.body={data};
      }catch{throw new InsideDMProtocolError('InsideDM returned an invalid prepared settings result.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='getFlowGovernance'){
      try{const data=parseFlowGovernanceConfiguration((result.body as {data:unknown}).data);
        if(data.businessId!==this.#businessId||data.recipeId!==pathValues.recipeId)throw new Error();result.body={data};
      }catch{throw new InsideDMProtocolError('InsideDM returned an invalid governance observation.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='listFlowRegressionSuites'||operationId==='getFlowRegressionRun'){
      try{const data=operationId==='listFlowRegressionSuites'?parseFlowRegressionCatalog((result.body as {data:unknown}).data):parseFlowRegressionRun((result.body as {data:unknown}).data);
        if(data.businessId!==this.#businessId||data.recipeId!==pathValues.recipeId
          ||snapshot.view==='managed'&&(!('releaseRequestId' in data)||data.releaseRequestId!==snapshot.releaseRequestId)
          ||snapshot.view==='configuration'&&('releaseRequestId' in data||(snapshot.suiteId?!('id' in data)||data.id!==snapshot.suiteId:'id' in data))
          ||operationId==='getFlowRegressionRun'&&(!('id' in data)||data.id!==pathValues.runId))throw new Error();result.body={data};
      }catch{throw new InsideDMProtocolError('InsideDM returned an invalid regression observation.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if (operationId === 'getBusinessAnalytics') {
      try {
        const report = parseBusinessAnalyticsReport(result.body);
        if (report.channel !== snapshot.channel || report.range !== snapshot.range) throw new Error('Analytics attribution mismatch.');
        result.body = report;
      } catch { throw new InsideDMProtocolError('InsideDM returned a different analytics view.', { code: 'invalid_response', requestId: result.meta.requestId }); }
    }
    if(operationId==='getFlowPublicationRequest'){
      try{const data=parseManagedPublicationRequest((result.body as {data:unknown}).data);if(data.businessId!==this.#businessId||data.recipeId!==pathValues.recipeId||data.id!==pathValues.releaseRequestId)throw new Error();result.body={data};}
      catch{throw new InsideDMProtocolError('InsideDM returned an invalid publication request.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='getFlowDeployment'){
      try{
        const data=snapshot.view==='draft'?parseFlowDraftSnapshot((result.body as {data:unknown}).data):parseFlowTemplateDeployment((result.body as {data:unknown}).data);
        if(data.businessId!==this.#businessId||data.recipeId!==pathValues.recipeId)throw new Error('Wrong deployment.');
        result.body={data};
      }catch{throw new InsideDMProtocolError('InsideDM returned invalid flow deployment provenance.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if (operationId === 'getFlowTemplateCatalog') {
      try {
        const data = parseFlowCatalogView((result.body as {data:unknown}).data);
        if (data.businessId !== this.#businessId || (snapshot.view==='flow_deployments')!==('deployments' in data)
          || ('deployments' in data?data.deployments.length:data.dependencies.length) > (snapshot as {limit:number}).limit) throw new Error('Wrong catalog attribution.');
        result.body = {data};
      } catch { throw new InsideDMProtocolError('InsideDM returned an invalid template catalog.', { code: 'invalid_response', requestId: result.meta.requestId }); }
    }
    if(operationId==='listFlowSteps'){
      try{const data=parseFlowStepCatalog((result.body as {data:unknown}).data);if(data.businessId!==this.#businessId)throw new Error();result.body={data};}
      catch{throw new InsideDMProtocolError('InsideDM returned an invalid flow-step catalog.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if (operationId === 'getSoftwareUsage') {
      try {
        const expected = snapshot as Record<string, unknown>, value = (result.body as { data: unknown }).data;
        const data = expected.view === 'software_limits' ? parseSoftwareLimits(value) : parseSoftwareUsageSummary(value);
        if (data.businessId !== this.#businessId || 'period' in data && (data.period.from !== expected.from || data.period.to !== expected.to)) throw new Error('Wrong usage attribution.');
        result.body = { data };
      } catch { throw new InsideDMProtocolError('InsideDM returned invalid software usage.', { code: 'invalid_response', requestId: result.meta.requestId }); }
    }
    if(operationId==='listEventBindings'){
      try{
        const data=parseEventBindingPage(result.body);
        if(data.businessId!==this.#businessId||data.data.length>Number(snapshot.limit))throw new Error();
        result.body=data;
      }catch{throw new InsideDMProtocolError('InsideDM returned invalid event bindings.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='getKnowledgeDocument'){
      try{const data=parseKnowledgeDocumentMetadata((result.body as {data:unknown}).data);
        if(data.businessId!==this.#businessId)throw new Error();result.body={data};
      }catch{throw new InsideDMProtocolError('InsideDM returned invalid knowledge document metadata.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if(operationId==='getLoyaltyMembership'){
      try{const data=parseLoyaltyMembership((result.body as {data:unknown}).data);
        if(data.businessId!==this.#businessId||data.contactId!==pathValues.contactId)throw new Error();result.body={data};
      }catch{throw new InsideDMProtocolError('InsideDM returned invalid loyalty membership.',{code:'invalid_response',requestId:result.meta.requestId});}
    }
    if (operationId === 'listFlowRuns') {
      try {
        const page = parseFlowRunPage(result.body);
        if (page.businessId !== this.#businessId || page.data.length > Number(snapshot.limit)
          || page.data.some(run => snapshot.flowId !== undefined && run.flowId !== snapshot.flowId
            || snapshot.status !== undefined && run.status !== snapshot.status)) throw new Error();
        result.body = page;
      } catch { throw new InsideDMProtocolError('InsideDM returned an invalid flow run page.', { code: 'invalid_response', requestId: result.meta.requestId }); }
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
        decode(schema, values[name], name, false);
        path = path.replace(`{${name}}`, encodeURIComponent(values[name]!));
      }
      const url = new URL(this.#baseUrl + path);
      for (const [name, value] of Object.entries(query)) {
        const schema = operation.queryParameters[name];
        if (!schema) throw new SchemaMismatch('params', 'Remove filters not listed in the collection parameter type.');
        if (value === undefined) continue;
        decode(schema, value, name, false);
        url.searchParams.set(name, String(value));
      }
      return url.href;
    } catch (error) {
      throw configurationFailure(error, 'Use the documented resource IDs and collection filters.', 'params');
    }
  }
}
