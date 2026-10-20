import { Transport } from './transport.js';
import type { PublicOperationId } from './generated/operations.js';
import { InsideDMConfigurationError, InsideDMProtocolError } from './errors.js';
import {parseBlueprintVersion} from './generated/partnerBlueprints.js';
import {parseBlueprintUpdatePreview} from './generated/flowBlueprintUpdates.js';
import type {
  ClientOptions, RequestOptions, WriteRequestOptions, UpdateContactAttributesInput, UpdatedContactAttributes, PaginationOptions, Result, PageResult, PageParams,
  ContactListParams, ConversationListParams, MessageListParams, OrderListParams,
  PublicWorkspace, PublicContact, PublicContactSummary, PublicConversation, PublicConversationSummary,
  PublicMessage, PublicOrder, PublicOrderSummary, PublicShipment, PublicShipmentSummary,
  NotificationInput,PublicOperation,MessagePreview,
  PublicTemplate,TemplateListParams,MessagingReadiness,PublicMessagingConfiguration,
  WithdrawConsentInput,ConsentWithdrawal,ContactConsentState,
  ReplaceContactTagsInput, ReplacedContactTags,
  CreateContactInput, ContactReference,
  UpdateContactInput, UpdatedContact,
  RecordMarketingOptInInput, MarketingOptInRegistration,
  PublishEventInput, OperationLookupInput, PublicFlowRun,
  SoftwareUsageInput, SoftwareUsageSummary, SoftwareLimits,
  FlowTemplateCatalogParams, FlowTemplateCatalog, FlowTemplateImportBody, FlowTemplateImportReceipt,FlowTemplateDeployment,
  PublicBlueprintVersion,DeployBlueprintOptions,
  BlueprintUpdatePreview,BlueprintUpdateReceipt,
} from './types.js';

function pageBound(value: number | undefined): number {
  if (value === undefined) return Infinity;
  if (!Number.isSafeInteger(value) || value < 1) throw new InsideDMConfigurationError('Pagination bounds must be positive safe integers.');
  return value;
}

export function collection<T, P extends PageParams>(transport: Transport, operation: PublicOperationId, path: Record<string, string>,
  project?: (body: unknown, requestId: string) => { data: T[]; page: { nextCursor: string | null } }) {
  const list = async (params: P = {} as P, options: RequestOptions = {}): Promise<PageResult<T>> => {
    if(options!==null&&typeof options==='object'&&'idempotencyKey' in options)throw new InsideDMConfigurationError('Collection reads do not take an idempotency key.');
    const { body, meta } = await (operation === 'listTemplates' ? transport.requestForBusiness(operation, params, options) : transport.request(operation, path, params, options));
    // Transport validates the operation's generated response schema before this type boundary.
    return { ...(project ? project(body, meta.requestId) : body as { data: T[]; page: { nextCursor: string | null } }), meta };
  };
  const pages = (params: P = {} as P, options: PaginationOptions = {}): AsyncIterableIterator<PageResult<T>> => {
    const snapshot = { ...params };
    const { maxPages, maxItems, ...requestOptions } = options;
    const pageLimit = pageBound(maxPages);
    const itemLimit = pageBound(maxItems);
    return (async function* () {
      let cursor = snapshot.cursor;
      let count = 0;
      let pageCount = 0;
      const seen = new Set<string>();
      if (cursor) seen.add(cursor);
      while (pageCount < pageLimit && count < itemLimit) {
        const page = await list({ ...snapshot, ...(cursor === undefined ? {} : { cursor }) }, requestOptions);
        const available = itemLimit - count;
        const selected = page.data.length > available ? page.data.slice(0, available) : page.data;
        count += selected.length;
        pageCount++;
        yield { ...page, data: selected };
        cursor = page.page.nextCursor ?? undefined;
        if (!cursor) break;
        if (seen.has(cursor)) throw new InsideDMProtocolError('InsideDM returned a repeated pagination cursor.', { code: 'repeated_cursor', requestId: page.meta.requestId });
        seen.add(cursor);
      }
    })();
  };
  const iterate = (params: P = {} as P, options: PaginationOptions = {}): AsyncIterableIterator<T> => {
    const source = pages(params, options);
    return (async function* () { for await (const page of source) for (const item of page.data) yield item; })();
  };
  return { list, pages, iterate };
}

function detail<T>(transport: Transport, operation: PublicOperationId, path: Record<string, string>, options?: RequestOptions): Promise<Result<T>> {
  return transport.request(operation, path, {}, options).then(({ body, meta }) => ({ data: (body as { data: T }).data, meta }));
}

/** Business resource surface shared by direct and approved installation clients. */
export class BusinessClient {
  readonly workspace;
  readonly contacts;
  readonly conversations;
  readonly messages;
  readonly operations;
  readonly events;
  readonly flows;
  readonly templates;
  readonly messaging;
  readonly consents;
  readonly orders;
  readonly shipments;
  readonly usage;

  protected constructor(transport:Transport) {
    this.usage = {
      /** Current native plan limits; no remaining quota, configured features or send authority. */
      getLimits: async (options: RequestOptions = {}): Promise<Result<SoftwareLimits>> => {
        if (options !== null && typeof options === 'object' && Object.keys(options).some(key => !['signal','timeoutMs','attemptTimeoutMs','maxRetries'].includes(key))) throw new InsideDMConfigurationError('Software limit reads accept only request options, without dates or an idempotency key.');
        const { body, meta } = await transport.requestForBusiness('getSoftwareUsage', { view: 'software_limits' }, options);
        return { data: (body as { data: SoftwareLimits }).data, meta };
      },
      /** Business-wide observed AI calls/tokens. Provisional; requires usage.read. */
      get: async (input: SoftwareUsageInput, options: RequestOptions = {}): Promise<Result<SoftwareUsageSummary>> => {
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['from','to'].includes(key))
          || options !== null && typeof options === 'object' && 'idempotencyKey' in options) throw new InsideDMConfigurationError('Provide an explicit from/to usage interval without an idempotency key.');
        const date = (value: string | Date): string => {
          if (value instanceof Date) {
            if (!Number.isFinite(value.getTime())) throw new InsideDMConfigurationError('Usage dates must be valid UTC instants.');
            return value.toISOString();
          }
          return value;
        };
        const { body, meta } = await transport.requestForBusiness('getSoftwareUsage', { view: 'software_usage', from: date(input.from), to: date(input.to) }, options);
        return { data: (body as { data: SoftwareUsageSummary }).data, meta };
      },
    };
    this.flows = { blueprints: {
      /** Create a client-owned draft from a saved partner version and reviewed client bindings. */
      deploy: async (blueprint:PublicBlueprintVersion,config:DeployBlueprintOptions={},options?:WriteRequestOptions):Promise<Result<FlowTemplateImportReceipt>> => {
        let source:PublicBlueprintVersion;
        try{
          source=parseBlueprintVersion(blueprint);
          if(!config||typeof config!=='object'||Array.isArray(config)||Object.keys(config).some(key=>!['bindings','overrides'].includes(key)))throw new Error();
        }catch{throw new InsideDMConfigurationError('Provide a saved blueprint version and its client bindings or permitted parameter overrides.');}
        const {body,meta}=await transport.ownerOperation('importFlowTemplate',source.definition.key,{version:String(source.definition.version),
          blueprint:{applicationId:source.applicationId,digest:source.digest},...(config.bindings===undefined?{}:{bindings:config.bindings}),...(config.overrides===undefined?{}:{overrides:config.overrides})},options);
        return {data:(body as {data:FlowTemplateImportReceipt}).data,meta};
      },
    }, deployments: {
      /** Inspect a source update while preserving client overrides; no draft is changed. */
      previewUpdate:async(recipeId:string,blueprint:PublicBlueprintVersion,config:Pick<DeployBlueprintOptions,'bindings'>={},options?:RequestOptions):Promise<Result<BlueprintUpdatePreview>>=>{
        let source:PublicBlueprintVersion;
        try{source=parseBlueprintVersion(blueprint);if(!config||typeof config!=='object'||Array.isArray(config)||Object.keys(config).some(key=>key!=='bindings'))throw new Error();}
        catch{throw new InsideDMConfigurationError('Provide a saved target blueprint and optional reviewed client bindings.');}
        const {body,meta}=await transport.ownerOperation('previewBlueprintUpdate',recipeId,{target:{applicationId:source.applicationId,key:source.definition.key,version:source.definition.version,digest:source.digest},
          ...(config.bindings===undefined?{}:{bindings:config.bindings})},options);
        return {data:(body as {data:BlueprintUpdatePreview}).data,meta};
      },
      /** Apply the reviewed preview to a draft. The server rechecks every pin and current source. */
      applyUpdate:async(preview:BlueprintUpdatePreview,options?:WriteRequestOptions):Promise<Result<BlueprintUpdateReceipt>>=>{
        let captured:BlueprintUpdatePreview;
        try{captured=parseBlueprintUpdatePreview(preview);if(captured.state==='action_required'||captured.draftRevision===null)throw new Error();}
        catch{throw new InsideDMConfigurationError('Resolve action-required items and obtain a current update preview before applying it.');}
        const {body,meta}=await transport.ownerOperation('applyBlueprintUpdate',captured.recipeId,{kind:'blueprint_update',target:captured.target,bindings:captured.bindings,
          expectedDeploymentRevision:captured.deploymentRevision,expectedDraftRevision:captured.draftRevision},options);
        return {data:(body as {data:BlueprintUpdateReceipt}).data,meta};
      },
      /** Immutable template origin and current draft drift for this integration's imported flow. */
      get: async (recipeId: string, options?: RequestOptions): Promise<Result<FlowTemplateDeployment>> => {
        const { body, meta } = await transport.requestForBusiness('getFlowDeployment', {view:'deployment'}, options, {recipeId});
        return {data:(body as {data:FlowTemplateDeployment}).data,meta};
      },
    }, runs: {
      /** Current status of this producer's SDK-started flow; separate from publication and delivery. */
      get: async (runId: string, options?: RequestOptions): Promise<Result<PublicFlowRun>> => {
        const { body, meta } = await transport.requestForBusiness('getFlowRun', { view: 'progress' }, options, { runId });
        return { data: (body as { data: PublicFlowRun }).data, meta };
      },
    }, templates: {
      /** Versioned templates and one page of eligible endpoint references. Requires flows.deploy. */
      catalog: async (params: FlowTemplateCatalogParams = {}, options?: RequestOptions): Promise<Result<FlowTemplateCatalog>> => {
        const { body, meta } = await transport.requestForBusiness('getFlowTemplateCatalog', params, options);
        return { data: (body as { data: FlowTemplateCatalog }).data, meta };
      },
      /** Create a client-owned draft. Publication remains a separate human decision. */
      import: async (packId: string, input: FlowTemplateImportBody, options?: WriteRequestOptions): Promise<Result<FlowTemplateImportReceipt>> => {
        const { body, meta } = await transport.ownerOperation('importFlowTemplate', packId, input, options);
        return { data: (body as { data: FlowTemplateImportReceipt }).data, meta };
      },
    } };
    this.events = {
      /** Publish one stable event to a published from-system flow for a known contact. The event ID is its retry key. */
      publish: async (input: PublishEventInput, options?: RequestOptions): Promise<Result<PublicOperation>> => {
        const { body, meta } = await transport.ownerOperation('publishEvent', null, input, options);
        return { data: (body as { data: PublicOperation }).data, meta };
      },
    };
    this.workspace = { get: (request?: RequestOptions) => detail<PublicWorkspace>(transport, 'getWorkspace', {}, request) };
    this.consents = {
      /** Verify a current customer's explicit request for offers in a retained message, without supplying proof flags or quotes. */
      recordMarketingOptIn: async (input: RecordMarketingOptInInput, options?: WriteRequestOptions): Promise<Result<MarketingOptInRegistration>> => {
        const { body, meta } = await transport.ownerOperation('recordMarketingOptIn', null, input, options);
        return { data: (body as { data: MarketingOptInRegistration }).data, meta };
      },
      /** Current decisions per messaging identity. Send eligibility is checked separately. */
      get: async (contactId: string, options?: RequestOptions): Promise<Result<ContactConsentState>> => {
        const { body, meta } = await transport.requestForBusiness('getConsentState', { view: 'messaging', contactId }, options);
        return { data: (body as { data: ContactConsentState }).data, meta };
      },
      /** Withdraw one WhatsApp purpose without creating a contact or granting consent. */
      withdraw: async (input: WithdrawConsentInput, options?: WriteRequestOptions): Promise<Result<ConsentWithdrawal>> => {
        const { body, meta } = await transport.ownerOperation('withdrawConsent', null, input, options);
        return { data: (body as { data: ConsentWithdrawal }).data, meta };
      },
    };
    this.templates = collection<PublicTemplate, TemplateListParams>(transport, 'listTemplates', {});
    this.messaging = {
      /** Read configured aliases and text-purpose bindings; this does not change settings or grant consent. */
      getConfiguration: async (options?: RequestOptions): Promise<Result<PublicMessagingConfiguration>> => {
        const { body, meta } = await transport.requestForBusiness('getMessagingConfiguration', { view: 'configuration' }, options);
        return { data: (body as { data: PublicMessagingConfiguration }).data, meta };
      },
      /** Read account setup readiness. Use messages.preview() for a particular recipient and content. */
      getReadiness: async (options?: RequestOptions): Promise<Result<MessagingReadiness>> => {
        const { body, meta } = await transport.requestForBusiness('getMessagingReadiness', {}, options);
        return { data: (body as { data: MessagingReadiness }).data, meta };
      },
    };
    this.contacts = {
      ...collection<PublicContactSummary, ContactListParams>(transport, 'listContacts', {}),
      /** Create or find a phone contact without granting consent or replacing an existing name. */
      create: async (input: CreateContactInput, request?: WriteRequestOptions): Promise<Result<ContactReference>> => {
        const { body, meta } = await transport.contactMutation('createContact', null, input, request);
        return { data: (body as { data: ContactReference }).data, meta };
      },
      get: (contactId: string, request?: RequestOptions) => detail<PublicContact>(transport, 'getContact', { contactId }, request),
      /** Change a display name; null clears it. Phone and channel identities require separate verification. */
      update: async (contactId: string, input: UpdateContactInput, request?: WriteRequestOptions): Promise<Result<UpdatedContact>> => {
        const { body, meta } = await transport.contactMutation('updateContact', contactId, input, request);
        return { data: (body as { data: UpdatedContact }).data, meta };
      },
      attributes: {
        update: async (contactId: string, input: UpdateContactAttributesInput, request?: WriteRequestOptions): Promise<Result<UpdatedContactAttributes>> => {
          const { body, meta } = await transport.contactMutation('updateContactAttributes', contactId, input, request);
          return { data: (body as { data: UpdatedContactAttributes }).data, meta };
        },
      },
      tags: {
        /** Replace the entire tag list; an empty list clears it. Reuse the same key only for the same action. */
        replace: async (contactId: string, input: ReplaceContactTagsInput, request?: WriteRequestOptions): Promise<Result<ReplacedContactTags>> => {
          const { body, meta } = await transport.contactMutation('replaceContactTags', contactId, input, request);
          return { data: (body as { data: ReplacedContactTags }).data, meta };
        },
      },
    };
    this.conversations = {
      ...collection<PublicConversationSummary, ConversationListParams>(transport, 'listConversations', {}),
      get: (conversationId: string, request?: RequestOptions) => detail<PublicConversation>(transport, 'getConversation', { conversationId }, request),
      messages: {
        list: (conversationId: string, params?: MessageListParams, request?: RequestOptions) => collection<PublicMessage, MessageListParams>(transport, 'listConversationMessages', { conversationId }).list(params, request),
        pages: (conversationId: string, params?: MessageListParams, request?: PaginationOptions) => collection<PublicMessage, MessageListParams>(transport, 'listConversationMessages', { conversationId }).pages(params, request),
        iterate: (conversationId: string, params?: MessageListParams, request?: PaginationOptions) => collection<PublicMessage, MessageListParams>(transport, 'listConversationMessages', { conversationId }).iterate(params, request),
      },
    };
    this.messages = {
      get: (messageId: string, request?: RequestOptions) => detail<PublicMessage>(transport, 'getMessage', { messageId }, request),
      /**
       * Queue a business notification using the organization's connected account.
       * The returned operation tracks provider submission, not customer delivery.
       * Supply a stable idempotencyKey to recover the same action across restarts.
       */
      send:async(input:NotificationInput,options?:WriteRequestOptions):Promise<Result<PublicOperation>>=>{
        const {body,meta}=await transport.ownerOperation('sendMessage',null,input,options);return {data:(body as {data:PublicOperation}).data,meta};
      },
      /** Check current eligibility with the same input as send(), without sending or creating a recipient. */
      preview:async(input:NotificationInput,options?:RequestOptions):Promise<Result<MessagePreview>>=>{
        const {body,meta}=await transport.ownerOperation('previewMessage',null,input,options);return {data:(body as {data:MessagePreview}).data,meta};
      },
    };
    const operationResult=async(operation:'getOperation'|'lookupOperation'|'cancelOperation',id:string|null,input:unknown,options?:WriteRequestOptions):Promise<Result<PublicOperation>>=>{
      const {body,meta}=await transport.ownerOperation(operation,id,input,options);return {data:(body as {data:PublicOperation}).data,meta};
    };
    this.operations={
      /** Read current progress for an operation created by this integration. */
      get:(id:string,options?:RequestOptions)=>operationResult('getOperation',id,null,options),
      /** Recover an operation using the original send's idempotency key after a lost response. */
      lookup:(input:string|OperationLookupInput,options?:RequestOptions)=>operationResult('lookupOperation',null,typeof input==='string'?{idempotencyKey:input}:input,options),
      /** Cancel work before provider submission starts; use the revision returned by get(). */
      cancel:(id:string,input:{expectedRevision:string},options?:WriteRequestOptions)=>operationResult('cancelOperation',id,input,options),
    };
    this.orders = {
      ...collection<PublicOrderSummary, OrderListParams>(transport, 'listOrders', {}),
      get: (orderId: string, request?: RequestOptions) => detail<PublicOrder>(transport, 'getOrder', { orderId }, request),
      shipments: {
        list: (orderId: string, params?: PageParams, request?: RequestOptions) => collection<PublicShipmentSummary, PageParams>(transport, 'listOrderShipments', { orderId }).list(params, request),
        pages: (orderId: string, params?: PageParams, request?: PaginationOptions) => collection<PublicShipmentSummary, PageParams>(transport, 'listOrderShipments', { orderId }).pages(params, request),
        iterate: (orderId: string, params?: PageParams, request?: PaginationOptions) => collection<PublicShipmentSummary, PageParams>(transport, 'listOrderShipments', { orderId }).iterate(params, request),
      },
    };
    this.shipments = { get: (shipmentId: string, request?: RequestOptions) => detail<PublicShipment>(transport, 'getShipment', { shipmentId }, request) };
  }
}

/** Server-side client. Construction validates configuration without making a network request. */
export class InsideDM extends BusinessClient{
  constructor(options:ClientOptions){super(new Transport(options));}
}
