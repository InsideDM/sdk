import type { PublicChannel, PublicConversationState, PublicOrderState, PublicPaymentState } from './generated/wire.js';
export type {BlueprintRolloutClient,BlueprintRolloutFailure,BlueprintRolloutPlan,BlueprintRolloutOutcome} from './blueprintRollouts.js';
export type {ManagedPublicationRequest,FlowPublicationChecks,FlowPublicationBlocker,WithdrawFlowPublicationInput} from './generated/flowPublicationRequests.js';
export type FlowPublicationRequestInput = Omit<import('./generated/flowPublicationRequests.js').ManagedPublicationInput, 'kind'>;
export type { PreparedNotification, PreparedMessagingConfiguration, NotificationPreparationResult, ApplyPreparedNotificationInput, ApplyPreparedMessagingConfigurationInput } from './generated/commandPreparationTypes.js';
export type { ConversationControlState, ConversationTakeoverInput, ConversationTakeoverReceipt, ConversationAssignmentInput, ConversationAssignmentReceipt,
  ConversationSnoozeInput, ConversationSnoozeReceipt, ConversationClearSnoozeReceipt } from './generated/conversationControls.js';
export type { ConversationHandoffReasonCode } from './generated/conversationControls.js';
export type { KnowledgeRunProgress, KnowledgeRunStatus, KnowledgeRunParams, KnowledgeRunPage } from './generated/knowledgeRuns.js';
export type { KnowledgeSourceMetadata, KnowledgeSourceKind, KnowledgeSourceStatus, KnowledgeSourceParams, KnowledgeSourcePage } from './generated/knowledgeSources.js';
export type { ImportWebsiteKnowledgeInput, WebsiteKnowledgeImportReceipt } from './generated/knowledgeWebsiteImports.js';
export type { RemoveWebsiteKnowledgeInput, WebsiteKnowledgeRemovalReceipt } from './generated/knowledgeWebsiteRemovals.js';
export type { RemoveKnowledgeSourceInput, KnowledgeSourceRemovalReceipt } from './generated/knowledgeSourceRemovals.js';
export type { KnowledgeDocumentMetadata } from './generated/knowledgeDocuments.js';
export type { LoyaltyMembership, LoyaltyWallet, LoyaltyMembershipTier } from './generated/loyaltyMembership.js';
export type { KnowledgeSectionContent, KnowledgeSectionContentPage, KnowledgeSectionParams } from './generated/knowledgeSections.js';
export type { SetKnowledgeSectionOverrideInput, AcknowledgeKnowledgeSectionOverrideInput, KnowledgeSectionEditReceipt } from './generated/knowledgeSectionEdits.js';
export type { FlowStep, FlowStepCatalog, SavedFlowBlockParams, SavedFlowBlockReference, SavedFlowBlockPage,
  SavedFlowBlockInterfaceParams, SavedFlowBlockInterface, SavedFlowBlockField } from './generated/flowSteps.js';
export type { ConversationAssignee, ConversationAssigneeParams } from './generated/conversationAssignees.js';
export type { ConversationControlHistoryParams, ConversationControlHistoryPage, ConversationControlHistoryEvent } from './generated/conversationControlHistory.js';

export interface AccessTokenRequest {
  readonly operation: import('./generated/operations.js').PublicOperationId;
  readonly method: string;
  readonly route: string;
  readonly body: string | null;
  readonly idempotencyKey: string | null;
  readonly businessId: string | null;
  readonly grantId: string | null;
  readonly signal: AbortSignal;
}
/** Return an API-resource access token. Called for each attempt within the
 * request deadline; retain refresh tokens in your own trusted token manager. */
export type AccessTokenProvider = (request: AccessTokenRequest) => string | Promise<string>;
export interface ClientSettings {
  /** Total request budget, including retries and workspace discovery. Default: 20,000 ms. */
  timeoutMs?: number;
  /** Maximum time for one attempt. Default: 10,000 ms. */
  attemptTimeoutMs?: number;
  /** Additional attempts for eligible transient failures. Default: 2. */
  maxRetries?: number;
  /** Trusted Fetch implementation for testing or instrumentation; receives the credential. */
  fetch?: typeof globalThis.fetch;
}
export type ClientOptions = ClientSettings & (
  /** Workspace API key. Keep it on your server. */
  { apiKey: string; accessToken?: never }
  /** OAuth is optional. Use only credentials issued for the InsideDM API resource. */
  | { accessToken: string | AccessTokenProvider; apiKey?: never }
);

export interface RequestOptions {
  /** Cancel this request with the caller's AbortSignal. */
  signal?: AbortSignal;
  /** Override the client's total request budget for this call. */
  timeoutMs?: number;
  /** Maximum milliseconds per attempt (1–60000); included in timeoutMs, never added to it. */
  attemptTimeoutMs?: number;
  /** Extra transient retries (0–5); writes retain their original input and retry key. */
  maxRetries?: number;
}

export interface WriteRequestOptions extends RequestOptions {
  /** Save one key per logical action. Reuse it with identical input after a lost response or restart. Defaults to a generated UUID. */
  idempotencyKey?: string;
}

export type WriteRecovery = {operation:'updateContactAttributes';contactId:string;idempotencyKey:string}
  |{operation:'importWebsiteKnowledge'|'removeWebsiteKnowledge';idempotencyKey:string}
  |{operation:'removeKnowledgeSource';sourceId:string;expectedVersion:number;idempotencyKey:string}
  |{operation:'setKnowledgeSectionOverride'|'acknowledgeKnowledgeSectionOverride';sectionId:string;expectedVersion:number;idempotencyKey:string}
  |{operation:'createContactField';idempotencyKey:string}
  |{operation:'archiveContactField';definitionId:string;expectedVersion:number;idempotencyKey:string}
  |{operation:'configureContactFieldMemory';definitionId:string;expectedVersion:number;idempotencyKey:string}
  |{operation:'updateConversationControl';conversationId:string;expectedRevision:string;idempotencyKey:string;action:'take_over'|'snooze'|'clear_snooze'}
  |{operation:'updateConversationControl';conversationId:string;expectedRevision:string;idempotencyKey:string;action:'assign';assigneeUserId:string|null}
  |{operation:'saveFlowRegressionSuite';recipeId:string;suiteId:string|null;expectedRevision:number|null;idempotencyKey:string}
  |{operation:'runFlowRegression';recipeId:string;releaseRequestId:string;suiteId:string;expectedSuiteRevision:number;idempotencyKey:string}
  |{operation:'prepareNotification';idempotencyKey:string}
  |{operation:'updateMessagingConfiguration';idempotencyKey:string}
  |{operation:'prepareMessagingConfiguration';idempotencyKey:string}
  |{operation:'requestFlowPublication';recipeId:string;idempotencyKey:string}
  |{operation:'withdrawFlowPublication';recipeId:string;releaseRequestId:string;idempotencyKey:string}
  |{operation:'createBlueprintVersion';blueprintKey:string;version:number;idempotencyKey:string}
  |{operation:'saveFlowDraft';recipeId:string;idempotencyKey:string}
  |{operation:'importFlowTemplate';packId:string;idempotencyKey:string}
  |{operation:'replayPlatformSubscriptionDelivery';subscriptionId:string;businessId:string;deliveryId:string;idempotencyKey:string}
  |{operation:'recoverPlatformSubscriptionReceiver';subscriptionId:string;businessId:string;idempotencyKey:string}
  |{operation:'createPlatformSubscription';idempotencyKey:string}
  |{operation:'rotatePlatformSubscriptionSecret';subscriptionId:string;idempotencyKey:string}
  |{operation:'createInstallationRequest';idempotencyKey:string}
  |{operation:'createPlatformBusiness';idempotencyKey:string}
  |{operation:'createOnboardingSession';businessId:string;idempotencyKey:string}
  |{operation:'renewBusinessClaimLink';creationId:string;idempotencyKey:string}
  |{operation:'revokeInstallation';installationId:string;idempotencyKey:string}
  |{operation:'createContact';idempotencyKey:string}
  |{operation:'replaceContactTags';contactId:string;idempotencyKey:string}
  |{operation:'updateContact';contactId:string;idempotencyKey:string}
  |{operation:'sendMessage'|'publishEvent';idempotencyKey:string}|{operation:'cancelOperation';operationId:string;idempotencyKey:string}|{operation:'withdrawConsent'|'recordMarketingOptIn';idempotencyKey:string};
export type { WithdrawConsentInput, ConsentWithdrawal, ConsentPurpose, ContactConsentState } from './generated/consents.js';
export type {PublicInstallationRequest,CreatedInstallationRequest} from './generated/installationRequests.js';
export type {PublicApplicationSelf} from './generated/applicationSelf.js';
export type {CreateBlueprintVersionInput,PublicBlueprintVersion,PublicBlueprintTemplate,BlueprintDefinition,BlueprintParameters,BlueprintParameterDefinition} from './generated/partnerBlueprints.js';
export type {BlueprintUpdatePreview,BlueprintUpdateReceipt,BlueprintUpdateTarget,BlueprintUpdateReason} from './generated/flowBlueprintUpdates.js';
export interface DeployBlueprintOptions{
  bindings?:Record<string,import('./generated/flowTemplateDeployments.js').FlowTemplateBinding>;
  overrides?:import('./generated/partnerBlueprints.js').BlueprintParameters;
}
export type {PublicInstallation,RevokeInstallationInput,InstallationRevocationReason} from './generated/installations.js';
export type {PublicPartnerBusiness,PartnerBusinessListParams} from './generated/partnerPortfolio.js';
export type {PublicPartnerApiUsage} from './generated/partnerUsage.js';
export type { SoftwareUsageSummary, SoftwareLimits } from './generated/softwareUsage.js';
export type { FlowTemplateImportBody, FlowTemplateImportReceipt, FlowTemplateCatalog, FlowTemplateSummary, FlowTemplateBinding, FlowTemplateDeployment } from './generated/flowTemplateDeployments.js';
export interface FlowTemplateCatalogParams { limit?: number; cursor?: string }
export type {FlowRegressionSuites,FlowRegressionRun,RunFlowRegressionInput,FlowRegressionConfiguration,FlowRegressionSuite,SaveFlowRegressionSuiteInput,FlowRegressionCase} from './generated/flowRegressionTypes.js';
export type FlowRegressionSuiteEdits=Partial<Pick<import('./generated/flowRegressionTypes.js').SaveFlowRegressionSuiteInput,'name'|'required'|'status'|'cases'>>;
export type {FlowDraftSimulation,SimulateFlowDraftInput} from './generated/flowSimulationTypes.js';
export type {FlowGovernanceConfiguration} from './generated/flowGovernanceTypes.js';
export type {FlowDeploymentCatalog,FlowDeploymentSummary} from './generated/flowDeploymentCatalogTypes.js';
export type {FlowDraftSnapshot,AvailableFlowDraft,ManagedFlowDraftSaveReceipt as FlowDraftSaveReceipt} from './generated/flowDraftTypes.js';
export type SaveFlowDraftInput=Omit<import('./generated/flowDraftTypes.js').ManagedFlowDraftSaveInput,'kind'>;
export type {FlowDefinitionV1 as FlowDraftDefinition,FlowNodeV1,FlowEdgeV1} from './generated/nativeFlowTypes.js';
export type FlowSimulationOptions=Omit<import('./generated/flowSimulationTypes.js').SimulateFlowDraftInput,'expectedRevision'>;
export interface SoftwareUsageInput { from: string | Date; to: string | Date }
export type {CreatePlatformBusinessInput,RenewBusinessClaimLinkInput,PublicBusinessCreation,BusinessCreationLink} from './generated/businessCreations.js';
export type {CreateOnboardingSessionInput,PublicOnboardingSession,CreatedOnboardingSession} from './generated/onboardingSessions.js';
export type {CreatePartnerSubscription,UpdatePartnerSubscription,PartnerSubscriptionDecision,RotatePartnerSubscriptionSecret,PartnerSubscription,PartnerSubscriptionSecret,PartnerSubscriptionStatus} from './generated/partnerSubscriptions.js';
export type {PartnerWebhookDelivery,PartnerWebhookDeliveryDetail,PartnerReceiverHealth,PartnerDeliveryStatus,PartnerDeliveryReplayReason,PartnerDeliveryAttempt} from './generated/partnerSubscriptionDiagnostics.js';
export interface PartnerDeliveryTarget{businessId:string}
export interface PartnerDeliveryListInput extends Omit<import('./generated/partnerSubscriptionDiagnostics.js').PartnerDeliveryListParams,'from'|'to'>{businessId:string;from?:string|Date;to?:string|Date}
export interface PartnerDeliveryReplayInput extends PartnerDeliveryTarget{reason:import('./generated/partnerSubscriptionDiagnostics.js').PartnerDeliveryReplayReason}
export interface PartnerReceiverRecoveryInput extends PartnerDeliveryTarget{expectedRevision:string}
export interface PartnerApiUsageInput{businessId:string;granularity?:'day'|'minute';from?:string|Date;to?:string|Date}
export interface CreateInstallationRequestInput{scopes:readonly import('./generated/vocabulary.js').MachinePublicScope[];returnUrl:string}
export type { RecordMarketingOptInInput, MarketingOptInRegistration } from './generated/consents.js';
export type { ReplaceContactTagsInput, ReplacedContactTags } from './generated/contactTags.js';
export type CreateContactInput = Omit<import('./generated/contactCreation.js').CreateContactRequest, 'channel'>;
export type { ContactReference } from './generated/contactCreation.js';
export type { UpdateContactInput, UpdatedContact } from './generated/contactUpdate.js';
type CanonicalNotification=Extract<import('./generated/messageSend.js').MessageSendInput,{intent:'notification'}>;
type TemplateInput=Omit<import('./generated/messageSend.js').MessageTemplateContent,'variables'>&{variables?:Record<string,string>};
/** Send a business notification. The SDK supplies its canonical intent automatically. */
export type NotificationInput=Omit<CanonicalNotification,'content'|'intent'|'to'>&{
  /** Choose exactly one: E.164 phone, existing contactId, or existing conversationId. */
  to:CanonicalNotification['to'];
  /** Optional; the SDK supplies notification. This client never impersonates an inbox human reply. */
  intent?:'notification';
  /** Approved template and its exact discovered variables, or text under an existing purpose binding. */
  content:import('./generated/messageSend.js').MessageTextContent|TemplateInput;
};
export type {PublicOperation,PublicOperationState,PublicOperationEffects} from './generated/operation.js';
export type {MessagePreview} from './generated/messageOperations.js';
export type {PublicTemplate, TemplateListParams, MessagingReadiness, PublicMessagingConfiguration} from './generated/messagingDiscovery.js';
export type { MessagingConfiguration, MessagingConfigurationUpdate, MessagingConfigurationSnapshot } from './generated/messagingConfiguration.js';

export interface ResponseMeta {
  /** Server correlation ID for support; never a client-generated substitute. */
  requestId: string;
  status: number;
  attempts: number;
  retryAfterSeconds: number | null;
  idempotencyKey?: string;
}

/** Domain result plus request diagnostics. A write receipt establishes only the lifecycle stage documented by that method. */
export interface Result<T> { data: T; meta: ResponseMeta }
export interface PageResult<T> extends Result<T[]> { page: { nextCursor: string | null } }
export interface PageParams { limit?: number; cursor?: string }
export interface ContactListParams extends PageParams { channel?: Exclude<PublicChannel, 'unknown'> }
export interface ConversationListParams extends ContactListParams {
  state?: Exclude<PublicConversationState, 'unknown'>;
  contactId?: string;
}
export interface MessageListParams extends PageParams { direction?: 'inbound' | 'outbound'; before?: string; after?: string }
export interface OrderListParams extends PageParams {
  state?: Exclude<PublicOrderState, 'unknown'>;
  paymentState?: Exclude<PublicPaymentState, 'unknown'>;
  contactId?: string;
}
export interface PaginationOptions extends RequestOptions {
  /** Stop after this many pages. Pages are fetched only as the iterator is consumed. */
  maxPages?: number;
  /** Stop after this many items; the final page may be trimmed. */
  maxItems?: number;
}

export type { PublicScope, MachinePublicScope, DeveloperEventType, DeveloperSubscriptionEventType } from './generated/vocabulary.js';
export type * from './generated/wire.js';
export type { PublicProblem, PublicFieldError, DeveloperProblemCode } from './generated/problem.js';
export type { ContactAttributeValue, UpdateContactAttributesInput, UpdatedContactAttributes } from './generated/contactAttributes.js';
export type { PublishEventInput } from './generated/eventPublish.js';
export type { PublicFlowRun } from './generated/flowRunProgress.js';
export type { FlowRunListParams, FlowRunPage } from './generated/flowRunCatalogTypes.js';
export type {PublicEventBinding,EventBindingParams} from './generated/eventBindings.js';
export type { OperationLookupInput } from './generated/messageOperations.js';
export type * from './generated/analyticsTypes.js';
export type { ContactFieldCatalog, ContactFieldDefinition, CreateContactFieldInput, CreatedContactField, ArchiveContactFieldInput, ArchivedContactField,
  ConfigureContactFieldMemoryInput, ConfiguredContactFieldMemory } from './generated/contactFields.js';
