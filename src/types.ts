import type { PublicChannel, PublicConversationState, PublicOrderState, PublicPaymentState } from './generated/wire.js';

export interface ClientOptions {
  /** Workspace API key. Keep it on your server. No provider credentials are needed. */
  apiKey: string;
  /** Override the API origin for development. Production callers normally omit this. */
  baseUrl?: string;
  /** Total request budget, including retries and workspace discovery. Default: 20,000 ms. */
  timeoutMs?: number;
  /** Maximum time for one attempt. Default: 10,000 ms. */
  attemptTimeoutMs?: number;
  /** Additional attempts for eligible transient failures. Default: 2. */
  maxRetries?: number;
  /** Trusted Fetch implementation for testing or instrumentation; receives the API key. */
  fetch?: typeof globalThis.fetch;
}

export interface RequestOptions {
  /** Cancel this request with the caller's AbortSignal. */
  signal?: AbortSignal;
  /** Override the client's total request budget for this call. */
  timeoutMs?: number;
  attemptTimeoutMs?: number;
  maxRetries?: number;
}

export interface WriteRequestOptions extends RequestOptions {
  /** Reuse this key and the same input to recover an uncertain result. Defaults to a generated UUID. */
  idempotencyKey?: string;
}

export type WriteRecovery = {operation:'updateContactAttributes';contactId:string;idempotencyKey:string}
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
export type {PublicInstallation,RevokeInstallationInput,InstallationRevocationReason} from './generated/installations.js';
export type {PublicPartnerBusiness,PartnerBusinessListParams} from './generated/partnerPortfolio.js';
export type {PublicPartnerApiUsage} from './generated/partnerUsage.js';
export type { SoftwareUsageSummary, SoftwareLimits } from './generated/softwareUsage.js';
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
export interface CreateInstallationRequestInput{scopes:readonly import('./generated/vocabulary.js').PublicScope[];returnUrl:string}
export type { RecordMarketingOptInInput, MarketingOptInRegistration } from './generated/consents.js';
export type { ReplaceContactTagsInput, ReplacedContactTags } from './generated/contactTags.js';
export type CreateContactInput = Omit<import('./generated/contactCreation.js').CreateContactRequest, 'channel'>;
export type { ContactReference } from './generated/contactCreation.js';
export type { UpdateContactInput, UpdatedContact } from './generated/contactUpdate.js';
type CanonicalNotification=Extract<import('./generated/messageSend.js').MessageSendInput,{intent:'notification'}>;
type TemplateInput=Omit<import('./generated/messageSend.js').MessageTemplateContent,'variables'>&{variables?:Record<string,string>};
/** Send a business notification. The SDK supplies its canonical intent automatically. */
export type NotificationInput=Omit<CanonicalNotification,'content'|'intent'>&{
  intent?:'notification';
  content:import('./generated/messageSend.js').MessageTextContent|TemplateInput;
};
export type {PublicOperation,PublicOperationState,PublicOperationEffects} from './generated/operation.js';
export type {MessagePreview} from './generated/messageOperations.js';
export type {PublicTemplate, TemplateListParams, MessagingReadiness, PublicMessagingConfiguration} from './generated/messagingDiscovery.js';

export interface ResponseMeta {
  requestId: string;
  status: number;
  attempts: number;
  retryAfterSeconds: number | null;
  idempotencyKey?: string;
}

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

export type { PublicScope, DeveloperEventType, DeveloperSubscriptionEventType } from './generated/vocabulary.js';
export type * from './generated/wire.js';
export type { PublicProblem, PublicFieldError, DeveloperProblemCode } from './generated/problem.js';
export type { ContactAttributeValue, UpdateContactAttributesInput, UpdatedContactAttributes } from './generated/contactAttributes.js';
export type { PublishEventInput } from './generated/eventPublish.js';
export type { PublicFlowRun } from './generated/flowRunProgress.js';
export type { OperationLookupInput } from './generated/messageOperations.js';
