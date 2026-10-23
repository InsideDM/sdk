import { Transport } from './transport.js';
import type { KnowledgeRunProgress, KnowledgeRunParams } from './generated/knowledgeRuns.js';
import type { KnowledgeSourceMetadata, KnowledgeSourceParams } from './generated/knowledgeSources.js';
import type { KnowledgeDocumentMetadata } from './generated/knowledgeDocuments.js';
import type { LoyaltyMembership } from './generated/loyaltyMembership.js';
import type { ImportWebsiteKnowledgeInput, WebsiteKnowledgeImportReceipt } from './generated/knowledgeWebsiteImports.js';
import type { RemoveWebsiteKnowledgeInput, WebsiteKnowledgeRemovalReceipt } from './generated/knowledgeWebsiteRemovals.js';
import type { RemoveKnowledgeSourceInput, KnowledgeSourceRemovalReceipt } from './generated/knowledgeSourceRemovals.js';
import type { KnowledgeSectionContent, KnowledgeSectionParams } from './generated/knowledgeSections.js';
import type { SetKnowledgeSectionOverrideInput, AcknowledgeKnowledgeSectionOverrideInput, KnowledgeSectionEditReceipt } from './generated/knowledgeSectionEdits.js';
import type { FlowStepCatalog, SavedFlowBlockParams, SavedFlowBlockReference, SavedFlowBlockInterface, SavedFlowBlockInterfaceParams } from './generated/flowSteps.js';
import type { PublicOperationId } from './generated/operations.js';
import { InsideDMConfigurationError, InsideDMProtocolError } from './errors.js';
import {parseBlueprintVersion} from './generated/partnerBlueprints.js';
import { parseMessagingSettingsUpdate } from './generated/messagingConfiguration.js';
import type { MessagingConfigurationUpdate, MessagingConfigurationSnapshot } from './generated/messagingConfiguration.js';
import type { NotificationPreparationResult, PreparedNotification, PreparedMessagingConfiguration, ApplyPreparedNotificationInput, ApplyPreparedMessagingConfigurationInput } from './generated/commandPreparationTypes.js';
import type { ContactFieldCatalog, CreateContactFieldInput, CreatedContactField, ArchiveContactFieldInput, ArchivedContactField,
  ConfigureContactFieldMemoryInput, ConfiguredContactFieldMemory } from './generated/contactFields.js';
import type { ConversationControlState, ConversationTakeoverInput, ConversationTakeoverReceipt, ConversationAssignmentInput, ConversationAssignmentReceipt,
  ConversationSnoozeInput, ConversationSnoozeReceipt, ConversationClearSnoozeReceipt } from './generated/conversationControls.js';
import type { ConversationAssignee, ConversationAssigneeParams } from './generated/conversationAssignees.js';
import type { ConversationControlHistoryParams, ConversationControlHistoryPage } from './generated/conversationControlHistory.js';
import { parseBusinessAnalyticsQuery } from './generated/analytics.js';
import type { BusinessAnalyticsQuery, BusinessAnalyticsReport } from './generated/analyticsTypes.js';
import {parseBlueprintUpdatePreview,parsePreviewBlueprintUpdate} from './generated/flowBlueprintUpdates.js';
import {createPublicationRequester} from './flowPublication.js';
import {createRegressionSuiteSaver} from './flowRegressionSuite.js';
import {createFlowSimulator} from './flowSimulation.js';
import {createFlowDraftSaver} from './flowDrafts.js';
import {parseManagedPublicationWithdrawal,type ManagedPublicationRequest,type WithdrawFlowPublicationInput} from './generated/flowPublicationRequests.js';
import type {FlowRegressionSuites,FlowRegressionRun,RunFlowRegressionInput,FlowRegressionConfiguration,FlowRegressionSuite} from './generated/flowRegressionTypes.js';
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
  PublicEventBinding,EventBindingParams,
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
function flowCatalogQuery(params:FlowTemplateCatalogParams,view?:'flow_deployments'){
  if(!params||typeof params!=='object'||Array.isArray(params)||Object.keys(params).some(key=>!['limit','cursor'].includes(key)))throw new InsideDMConfigurationError('Flow catalog pages accept only limit and cursor.');
  return {...params,...(view?{view}:{})};
}

interface Collection<T, P extends PageParams> {
  /** Read one page. Continue with page.nextCursor, or use iterate() to traverse lazily. */
  list(params?: P, options?: RequestOptions): Promise<PageResult<T>>;
  /** Fetch pages lazily; set maxPages/maxItems and signal to bound the work. Empty continuation pages are valid. */
  pages(params?: P, options?: PaginationOptions): AsyncIterableIterator<PageResult<T>>;
  /** Yield records lazily; more pages are fetched as consumed. Set maxPages/maxItems or break to stop. */
  iterate(params?: P, options?: PaginationOptions): AsyncIterableIterator<T>;
}

export function collection<T, P extends PageParams>(transport: Transport, operation: PublicOperationId, path: Record<string, string>,
  project?: (body: unknown, requestId: string) => { data: T[]; page: { nextCursor: string | null } }): Collection<T, P> {
  const list = async (params: P = {} as P, options: RequestOptions = {}): Promise<PageResult<T>> => {
    if(options!==null&&typeof options==='object'&&'idempotencyKey' in options)throw new InsideDMConfigurationError('Collection reads do not take an idempotency key.');
    const { body, meta } = await (operation === 'listFlowRuns'||operation === 'listTemplates'||operation==='listEventBindings'||operation==='listConversationAssignees'||operation==='listSavedFlowBlocks'||operation==='listKnowledgeRuns'||operation==='listKnowledgeSources'||operation==='listKnowledgeSections' ? transport.requestForBusiness(operation, params, options) : transport.request(operation, path, params, options));
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
  /** This key's business and current granted scopes. The client discovers it automatically when needed. */
  readonly workspace;
  /** Customer records, display names, tags and custom fields; creation grants no messaging consent. */
  readonly contacts;
  /** Authorized conversation history and its messages. */
  readonly conversations;
  /** Preview/send notifications and read messages. Submission success and customer delivery are separate. */
  readonly messages;
  /** Track, recover or cancel this integration's submitted work. */
  readonly operations;
  /** Discover published flow inputs and submit business events to start them. */
  readonly events;
  /** Native flow templates, client-owned drafts, human publication review and execution progress. */
  readonly flows;
  /** Discover approved WhatsApp templates and their exact variable keys. */
  readonly templates;
  /** Read WhatsApp account setup and optional aliases; use messages.preview() for recipient eligibility. */
  readonly messaging;
  /** Inspect current consent, record a verified native request for offers, or withdraw one purpose. */
  readonly consents;
  /** Authorized order visibility; no order/payment mutation. */
  readonly orders;
  /** Authorized shipment visibility. */
  readonly shipments;
  /** Observed business AI usage and current plan limits, separately granted through usage.read. */
  readonly usage;
  /** Native business performance, resolved in the business timezone. Requires analytics.read. */
  readonly analytics;
  /** Document/source/progress metadata, explicit text access, website imports and registered source removal. */
  readonly knowledge;
  /** Current native membership and wallet balances; requires loyalty.read. */
  readonly loyalty;

  protected constructor(transport:Transport) {
    this.loyalty = { members: {
      /** Read one known contact. Held value is already excluded from spendable. */
      get: async (contactId: string, options?: RequestOptions): Promise<Result<LoyaltyMembership>> => {
        const { body, meta } = await transport.requestForBusiness('getLoyaltyMembership', {}, options, { contactId });
        return { data: (body as { data: LoyaltyMembership }).data, meta };
      },
    } };
    this.knowledge = {
      /** Bounded document identity/version, including when there are no section rows. */
      get: async (options?: RequestOptions): Promise<Result<KnowledgeDocumentMetadata>> => {
        const { body, meta } = await transport.requestForBusiness('getKnowledgeDocument', {}, options);
        return { data: (body as { data: KnowledgeDocumentMetadata }).data, meta };
      },
      sections: { ...collection<KnowledgeSectionContent,KnowledgeSectionParams>(transport,'listKnowledgeSections',{}),
      /** Store verbatim text, suppress with an empty string, or accept generated text with null. */
      setOverride: async (sectionId: string, input: SetKnowledgeSectionOverrideInput, options?: WriteRequestOptions): Promise<Result<KnowledgeSectionEditReceipt>> => {
        const { body, meta } = await transport.ownerOperation('setKnowledgeSectionOverride', sectionId, input, options);
        return { data: (body as { data: KnowledgeSectionEditReceipt }).data, meta };
      },
      /** Keep existing correction text and acknowledge the reviewed generated revision. */
      acknowledgeOverride: async (sectionId: string, input: AcknowledgeKnowledgeSectionOverrideInput, options?: WriteRequestOptions): Promise<Result<KnowledgeSectionEditReceipt>> => {
        const { body, meta } = await transport.ownerOperation('acknowledgeKnowledgeSectionOverride', sectionId, input, options);
        return { data: (body as { data: KnowledgeSectionEditReceipt }).data, meta };
      },
    },
      sources: { ...collection<KnowledgeSourceMetadata,KnowledgeSourceParams>(transport,'listKnowledgeSources',{}),
      /** Remove a registered note, document or website against its reviewed document version. Corrections survive. */
      remove: async (sourceId: string, input: RemoveKnowledgeSourceInput, options?: WriteRequestOptions): Promise<Result<KnowledgeSourceRemovalReceipt>> => {
        const { body, meta } = await transport.ownerOperation('removeKnowledgeSource', sourceId, input, options);
        return { data: (body as { data: KnowledgeSourceRemovalReceipt }).data, meta };
      },
      /** Import or refresh a website. Retain the same input/key after uncertainty; inspect runs for execution progress. */
      importWebsite: async (input: ImportWebsiteKnowledgeInput, options?: WriteRequestOptions): Promise<Result<WebsiteKnowledgeImportReceipt>> => {
        const { body, meta } = await transport.ownerOperation('importWebsiteKnowledge', null, input, options);
        return { data: (body as { data: WebsiteKnowledgeImportReceipt }).data, meta };
      },
      /** Remove generated website claims and cancel imports; corrections/history survive. Retry the original key after uncertainty. */
      removeWebsite: async (input: RemoveWebsiteKnowledgeInput, options?: WriteRequestOptions): Promise<Result<WebsiteKnowledgeRemovalReceipt>> => {
        const { body, meta } = await transport.ownerOperation('removeWebsiteKnowledge', null, input, options);
        return { data: (body as { data: WebsiteKnowledgeRemovalReceipt }).data, meta };
      },
    },
      runs: { ...collection<KnowledgeRunProgress,KnowledgeRunParams>(transport,'listKnowledgeRuns',{}), get: async (runId: string, options?: RequestOptions): Promise<Result<KnowledgeRunProgress>> => {
      const { body, meta } = await transport.requestForBusiness('getKnowledgeRun', { view: 'progress' }, options, { runId });
      return { data: (body as { data: KnowledgeRunProgress }).data, meta };
    } } };
    this.analytics = {
      get: async (query: BusinessAnalyticsQuery = {}, options: RequestOptions = {}): Promise<Result<BusinessAnalyticsReport>> => {
        if (!query || typeof query !== 'object' || Array.isArray(query)) throw new InsideDMConfigurationError('Provide analytics query fields.');
        if (options && typeof options === 'object' && 'idempotencyKey' in options) throw new InsideDMConfigurationError('Analytics reads accept request options without an idempotency key.');
        let normalized: BusinessAnalyticsQuery;
        try {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(query)) {
            if (typeof value !== 'string') throw new Error('Expected a string query value.');
            params.set(key, value);
          }
          normalized = parseBusinessAnalyticsQuery('?' + params);
        } catch { throw new InsideDMConfigurationError('Choose a channel and calendar range; custom ranges require start and end dates.'); }
        const { body, meta } = await transport.requestForBusiness('getBusinessAnalytics', normalized, options);
        return { data: body as BusinessAnalyticsReport, meta };
      },
    };
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
    this.flows = {blocks:{...collection<SavedFlowBlockReference,SavedFlowBlockParams>(transport,'listSavedFlowBlocks',{}),
      get:async(flowId:string,params:SavedFlowBlockInterfaceParams,options?:RequestOptions):Promise<Result<SavedFlowBlockInterface>>=>{
        const {body,meta}=await transport.requestForBusiness('getSavedFlowBlockInterface',{...params,view:'interface'},options,{flowId});
        return {data:(body as {data:SavedFlowBlockInterface}).data,meta};
      }},steps:{list:async(options?:RequestOptions):Promise<Result<FlowStepCatalog>>=>{
      const {body,meta}=await transport.requestForBusiness('listFlowSteps',{view:'built_in_steps'},options);
      return {data:(body as {data:FlowStepCatalog}).data,meta};
    }},simulate:createFlowSimulator(transport),drafts:{save:createFlowDraftSaver(transport),
      /** Valid native authoring definition and exact revision pins; never a readiness grant. */
      get:async(recipeId:string,options?:RequestOptions):Promise<Result<import('./types.js').FlowDraftSnapshot>>=>{
        const {body,meta}=await transport.requestForBusiness('getFlowDeployment',{view:'draft'},options,{recipeId});
        return {data:(body as {data:import('./types.js').FlowDraftSnapshot}).data,meta};
      },
    }, governance:{
      /** Observe current native rules; this grants no approval/publication authority. */
      get:async(recipeId:string,options?:RequestOptions):Promise<Result<import('./types.js').FlowGovernanceConfiguration>>=>{
        const {body,meta}=await transport.requestForBusiness('getFlowGovernance',{view:'managed'},options,{recipeId});
        return {data:(body as {data:import('./types.js').FlowGovernanceConfiguration}).data,meta};
      },
    }, regressions: {
      /** Inspect current suite IDs/revisions before creating or editing checks. */
      getConfiguration:async(recipeId:string,options?:RequestOptions):Promise<Result<FlowRegressionConfiguration>>=>{
        const {body,meta}=await transport.requestForBusiness('listFlowRegressionSuites',{view:'configuration'},options,{recipeId});
        return {data:(body as {data:FlowRegressionConfiguration}).data,meta};
      },
      /** Read one complete, credential-free native fixture definition for revision-safe editing. */
      getSuite:async(recipeId:string,suiteId:string,options?:RequestOptions):Promise<Result<FlowRegressionSuite>>=>{
        const {body,meta}=await transport.requestForBusiness('listFlowRegressionSuites',{view:'configuration',suiteId},options,{recipeId});
        return {data:(body as {data:FlowRegressionSuite}).data,meta};
      },
      /** Edit a saved suite with its own revision, or provide an explicit create/update intent. */
      saveSuite:createRegressionSuiteSaver(transport),
      /** Inspect suites bound to this connection's retained release, without fixture contents. */
      listSuites:async(recipeId:string,releaseRequestId:string,options?:RequestOptions):Promise<Result<FlowRegressionSuites>>=>{
        const {body,meta}=await transport.requestForBusiness('listFlowRegressionSuites',{view:'managed',releaseRequestId},options,{recipeId});
        return {data:(body as {data:FlowRegressionSuites}).data,meta};
      },
      /** Run native, side-effect-free checks. A pass is evidence, never publication authority. */
      run:async(recipeId:string,input:RunFlowRegressionInput,options?:WriteRequestOptions):Promise<Result<FlowRegressionRun>>=>{
        if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['releaseRequestId','suiteId','expectedSuiteRevision'].includes(key)))throw new InsideDMConfigurationError('Provide the release, bound suite and its exact current revision.');
        const {body,meta}=await transport.ownerOperation('runFlowRegression',recipeId,{...input,kind:'managed_deployment'},options);
        return {data:(body as {data:FlowRegressionRun}).data,meta};
      },
      /** Recover an exact run by its flow, release and run IDs. */
      get:async(recipeId:string,releaseRequestId:string,runId:string,options?:RequestOptions):Promise<Result<FlowRegressionRun>>=>{
        const {body,meta}=await transport.requestForBusiness('getFlowRegressionRun',{view:'managed',releaseRequestId},options,{recipeId,runId});
        return {data:(body as {data:FlowRegressionRun}).data,meta};
      },
    }, blueprints: {
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
      /** Submit the exact observed managed draft to native release review. Never publishes. */
      requestPublication:createPublicationRequester(transport),
      /** Observe this integration's native release request without receiving graphs or private evidence. */
      getPublicationRequest:async(recipeId:string,releaseRequestId:string,options?:RequestOptions):Promise<Result<ManagedPublicationRequest>>=>{
        const {body,meta}=await transport.requestForBusiness('getFlowPublicationRequest',{view:'managed'},options,{recipeId,releaseRequestId});
        return {data:(body as {data:ManagedPublicationRequest}).data,meta};
      },
      /** Close this connection's pending/approved review. Never unpublishes a live flow. */
      withdrawPublication:async(recipeId:string,releaseRequestId:string,input:WithdrawFlowPublicationInput,options?:WriteRequestOptions):Promise<Result<ManagedPublicationRequest>>=>{
        let command:ReturnType<typeof parseManagedPublicationWithdrawal>;
        try{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==1||!Object.hasOwn(input,'expectedDecisionRevision'))throw new Error();
          command=parseManagedPublicationWithdrawal(JSON.stringify({...input,kind:'managed_deployment'}));}
        catch{throw new InsideDMConfigurationError('Provide the current pending or approved decision revision before withdrawing a release.');}
        const {body,meta}=await transport.ownerOperation('withdrawFlowPublication',recipeId,command,options,undefined,{releaseRequestId});
        return {data:(body as {data:ManagedPublicationRequest}).data,meta};
      },
      /** Inspect a source update while preserving client overrides; no draft is changed. */
      previewUpdate:async(recipeId:string,blueprint:PublicBlueprintVersion|import('./types.js').BlueprintUpdateTarget,config:Pick<DeployBlueprintOptions,'bindings'>={},options?:RequestOptions):Promise<Result<BlueprintUpdatePreview>>=>{
        let target:import('./types.js').BlueprintUpdateTarget;
        try{
          if(!blueprint||typeof blueprint!=='object'||Array.isArray(blueprint)||!config||typeof config!=='object'||Array.isArray(config)||Object.keys(config).some(key=>key!=='bindings'))throw new Error();
          if('definition' in blueprint){const source=parseBlueprintVersion(blueprint);target={applicationId:source.applicationId,key:source.definition.key,version:source.definition.version,digest:source.digest};}
          else target=parsePreviewBlueprintUpdate(JSON.stringify({target:blueprint})).target;
        }catch{throw new InsideDMConfigurationError('Provide a saved target blueprint or exact application/key/version/digest reference, with optional reviewed client bindings.');}
        const {body,meta}=await transport.ownerOperation('previewBlueprintUpdate',recipeId,{target,
          ...(config.bindings===undefined?{}:{bindings:config.bindings})},options);
        return {data:(body as {data:BlueprintUpdatePreview}).data,meta};
      },
      /** Apply the reviewed preview to a draft. The server rechecks every pin and current source. */
      applyUpdate:async(preview:BlueprintUpdatePreview,options?:WriteRequestOptions):Promise<Result<BlueprintUpdateReceipt>>=>{
        let captured:BlueprintUpdatePreview;
        try{captured=parseBlueprintUpdatePreview(preview);if(captured.state==='action_required'||captured.draftRevision===null)throw new Error();}
        catch{throw new InsideDMConfigurationError('Resolve action-required items and obtain a current update preview before applying it.');}
        const {body,meta}=await transport.ownerOperation('saveFlowDraft',captured.recipeId,{kind:'blueprint_update',target:captured.target,bindings:captured.bindings,
          expectedDeploymentRevision:captured.deploymentRevision,expectedDraftRevision:captured.draftRevision},options,captured.businessId);
        return {data:(body as {data:BlueprintUpdateReceipt}).data,meta};
      },
      /** Discover one page of this connection's current managed flows. */
      list:async(params:FlowTemplateCatalogParams={},options?:RequestOptions):Promise<Result<import('./types.js').FlowDeploymentCatalog>>=>{
        const {body,meta}=await transport.requestForBusiness('getFlowTemplateCatalog',flowCatalogQuery(params,'flow_deployments'),options);
        return {data:(body as {data:import('./types.js').FlowDeploymentCatalog}).data,meta};
      },
      /** Immutable template origin and current draft drift for this integration's imported flow. */
      get: async (recipeId: string, options?: RequestOptions): Promise<Result<FlowTemplateDeployment>> => {
        const { body, meta } = await transport.requestForBusiness('getFlowDeployment', {view:'deployment'}, options, {recipeId});
        return {data:(body as {data:FlowTemplateDeployment}).data,meta};
      },
    }, runs: {
      ...collection<PublicFlowRun, import('./types.js').FlowRunListParams>(transport, 'listFlowRuns', {}),
      /** Native workspace status for connected users, or this integration's own SDK-started run. Separate from delivery. */
      get: async (runId: string, options?: RequestOptions): Promise<Result<PublicFlowRun>> => {
        const { body, meta } = await transport.requestForBusiness('getFlowRun', { view: 'progress' }, options, { runId });
        return { data: (body as { data: PublicFlowRun }).data, meta };
      },
    }, templates: {
      /** Versioned templates and one page of eligible endpoint references. Requires flows.deploy. */
      catalog: async (params: FlowTemplateCatalogParams = {}, options?: RequestOptions): Promise<Result<FlowTemplateCatalog>> => {
        const { body, meta } = await transport.requestForBusiness('getFlowTemplateCatalog', flowCatalogQuery(params), options);
        return { data: (body as { data: FlowTemplateCatalog }).data, meta };
      },
      /** Create a client-owned draft. Publication remains a separate human decision. */
      import: async (packId: string, input: FlowTemplateImportBody, options?: WriteRequestOptions): Promise<Result<FlowTemplateImportReceipt>> => {
        const { body, meta } = await transport.ownerOperation('importFlowTemplate', packId, input, options);
        return { data: (body as { data: FlowTemplateImportReceipt }).data, meta };
      },
    } };
    this.events = {
      /** Active published flows and mapped input requirements. Use a returned id as events.publish input.binding. */
      bindings:collection<PublicEventBinding,EventBindingParams>(transport,'listEventBindings',{}),
      /**
       * Retain one event to start an active published flow for an existing contact.
       * binding is the flow ID from events.bindings; id is your saved logical event/retry key.
       * Acceptance does not mean execution or delivery. Track the operation, then flows.runs.get().
       * Requires events.write; progress reads separately need operations.read and flows.read.
       */
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
      preparations: {
        /** Prepare the complete versioned configuration for the connected user's native review. */
        create: async (input: MessagingConfigurationUpdate, options?: WriteRequestOptions): Promise<Result<PreparedMessagingConfiguration>> => {
          const { body, meta } = await transport.ownerOperation('prepareMessagingConfiguration', null, input, options);
          return { data: (body as { data: PreparedMessagingConfiguration }).data, meta };
        },
        /** Recover this connection's original review state and native acceptance result. */
        get: async (preparationId: string, options?: RequestOptions): Promise<Result<PreparedMessagingConfiguration>> => {
          const { body, meta } = await transport.requestForBusiness('getPreparedMessagingConfiguration', {}, options, { preparationId });
          return { data: (body as { data: PreparedMessagingConfiguration }).data, meta };
        },
        /** Apply the exact ready revision once. Retrying recovers the original audit result. */
        apply: async (preparationId: string, input: ApplyPreparedMessagingConfigurationInput, options?: RequestOptions): Promise<Result<PreparedMessagingConfiguration>> => {
          const { body, meta } = await transport.ownerOperation('applyPreparedMessagingConfiguration', preparationId, input, options);
          return { data: (body as { data: PreparedMessagingConfiguration }).data, meta };
        },
      },
      /** Replace aliases and purpose bindings using the version from getConfiguration().
       * Requires messaging.configuration.write. Retries never repeat the change. */
      updateConfiguration: async (input: MessagingConfigurationUpdate, options?: WriteRequestOptions): Promise<Result<MessagingConfigurationSnapshot>> => {
        let captured: MessagingConfigurationUpdate;
        try { captured = parseMessagingSettingsUpdate(JSON.stringify(input)); }
        catch { throw new InsideDMConfigurationError('Provide the complete messaging configuration and its current expectedVersion.'); }
        const { body, meta } = await transport.ownerOperation('updateMessagingConfiguration', null, captured, options);
        return { data: (body as { configuration: MessagingConfigurationSnapshot }).configuration, meta };
      },
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
      fields: {
        /** Configure native agent memory at the observed catalog version. Omitted hint is preserved; null clears it. */
        configureMemory: async (definitionId: string, input: ConfigureContactFieldMemoryInput, options?: WriteRequestOptions): Promise<Result<ConfiguredContactFieldMemory>> => {
          const { body, meta } = await transport.ownerOperation('configureContactFieldMemory', definitionId, input, options);
          return { data: (body as { data: ConfiguredContactFieldMemory }).data, meta };
        },
        /** Archive at the observed catalog version. Keeps contact values and permanently reserves the key. */
        archive: async (definitionId: string, input: ArchiveContactFieldInput, options?: WriteRequestOptions): Promise<Result<ArchivedContactField>> => {
          const { body, meta } = await transport.ownerOperation('archiveContactField', definitionId, input, options);
          return { data: (body as { data: ArchivedContactField }).data, meta };
        },
        /** Create a permanent typed field with agent memory off. Retain the original input/key after uncertainty. */
        create: async (input: CreateContactFieldInput, options?: WriteRequestOptions): Promise<Result<CreatedContactField>> => {
          const { body, meta } = await transport.ownerOperation('createContactField', null, input, options);
          return { data: (body as { data: CreatedContactField }).data, meta };
        },
        /** Discover live custom-field keys and types before updating attributes. */
        list: async (options?: RequestOptions): Promise<Result<ContactFieldCatalog>> => {
          const { body, meta } = await transport.requestForBusiness('listContactFields', {}, options);
          return { data: body as ContactFieldCatalog, meta };
        },
      },
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
      assignees: collection<ConversationAssignee, ConversationAssigneeParams>(transport, 'listConversationAssignees', {}),
      controls: {
        /** One newest-first page of native control evidence. Follow data.page.nextCursor with the same limit. */
        history: async (conversationId: string, params: ConversationControlHistoryParams = {}, options?: RequestOptions): Promise<Result<ConversationControlHistoryPage>> => {
          if (!params || typeof params !== 'object' || Array.isArray(params) || Object.keys(params).some(key => !['limit', 'cursor'].includes(key)))
            throw new InsideDMConfigurationError('Control history accepts only limit and cursor.');
          const { body, meta } = await transport.requestForBusiness('getConversationControl', { ...params, view: 'control_history' }, options, { conversationId });
          return { data: (body as { data: ConversationControlHistoryPage }).data, meta };
        },
        /** Put aside for 24 hours and pause automation, retaining current ownership. Expiry does not resume the agent. */
        snooze: async (conversationId: string, input: ConversationSnoozeInput, options?: WriteRequestOptions): Promise<Result<ConversationSnoozeReceipt>> => {
          const { body, meta } = await transport.conversationControl('snooze', conversationId, input, options);
          return { data: (body as { data: ConversationSnoozeReceipt }).data, meta };
        },
        /** Clear only the snooze time. Retains ownership, pause and open handoff; sends no reply. */
        clearSnooze: async (conversationId: string, input: ConversationSnoozeInput, options?: WriteRequestOptions): Promise<Result<ConversationClearSnoozeReceipt>> => {
          const { body, meta } = await transport.conversationControl('clear_snooze', conversationId, input, options);
          return { data: (body as { data: ConversationClearSnoozeReceipt }).data, meta };
        },
        /** Pause automation and take ownership as the connected user. Reuse the original revision and key after uncertainty. */
        takeOver: async (conversationId: string, input: ConversationTakeoverInput, options?: WriteRequestOptions): Promise<Result<ConversationTakeoverReceipt>> => {
          const { body, meta } = await transport.conversationControl('take_over', conversationId, input, options);
          return { data: (body as { data: ConversationTakeoverReceipt }).data, meta };
        },
        /** Assign an unowned conversation or one you handle; null returns it to the paused human queue. */
        assign: async (conversationId: string, input: ConversationAssignmentInput, options?: WriteRequestOptions): Promise<Result<ConversationAssignmentReceipt>> => {
          const { body, meta } = await transport.conversationControl('assign', conversationId, input, options);
          return { data: (body as { data: ConversationAssignmentReceipt }).data, meta };
        },
        /** Inspect native ownership, pause, snooze and live handoff facts. This changes no control or sending eligibility. */
        get: async (conversationId: string, options?: RequestOptions): Promise<Result<ConversationControlState>> => {
          const { body, meta } = await transport.requestForBusiness('getConversationControl', { view: 'control' }, options, { conversationId });
          return { data: (body as { data: ConversationControlState }).data, meta };
        },
      },
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
      /** Prepare this exact notification for native user review. Requires user
       * access; opening its review URL grants no delivery guarantee. */
      prepare:async(input:NotificationInput,options?:WriteRequestOptions):Promise<Result<NotificationPreparationResult>>=>{
        const {body,meta}=await transport.ownerOperation('prepareNotification',null,input,options);
        return {data:(body as {data:NotificationPreparationResult}).data,meta};
      },
      preparations:{
        /** Read review state and recover the original accepted operation. */
        get:async(preparationId:string,options?:RequestOptions):Promise<Result<PreparedNotification>>=>{
          const {body,meta}=await transport.requestForBusiness('getPreparedNotification',{},options,{preparationId});
          return {data:(body as {data:PreparedNotification}).data,meta};
        },
        /** Apply the current ready revision of the immutable reviewed intent.
         * Retrying this preparation recovers its original operation. */
        apply:async(preparationId:string,input:ApplyPreparedNotificationInput,options?:RequestOptions):Promise<Result<PreparedNotification>>=>{
          const {body,meta}=await transport.ownerOperation('applyPreparedNotification',preparationId,input,options);
          return {data:(body as {data:PreparedNotification}).data,meta};
        },
      },
    };
    const operationResult=async(operation:'getOperation'|'lookupOperation'|'cancelOperation',id:string|null,input:unknown,options?:WriteRequestOptions):Promise<Result<PublicOperation>>=>{
      const {body,meta}=await transport.ownerOperation(operation,id,input,options);return {data:(body as {data:PublicOperation}).data,meta};
    };
    this.operations={
      /** Read this integration's operation by ID. Requires operations.read; message success means provider submission, not delivery. */
      get:(id:string,options?:RequestOptions)=>operationResult('getOperation',id,null,options),
      /**
       * Recover a lost response without submitting new work. Requires operations.read.
       * Pass the original message key, or {kind:'events.publish', idempotencyKey: originalEventId}.
       * Keep the original intent; a fresh key creates another action rather than recovering it.
       */
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
