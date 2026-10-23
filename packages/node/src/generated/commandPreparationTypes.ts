// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import type { MessageSendInput } from './messageSend.js';
import type { MessagePreview } from './messageOperations.js';
import type { PublicOperation } from './operation.js';
export type NotificationPreparationInput = Extract<MessageSendInput, {
    intent: 'notification';
}>;
export interface PreparedNotification {
    id: string;
    businessId: string;
    kind: 'notification';
    state: 'awaiting_review' | 'ready' | 'submitted' | 'rejected' | 'expired' | 'stale' | 'unknown';
    revision: number;
    intentDigest: string;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    reviewedAt: string | null;
    reasonCode: 'user_rejected' | 'preparation_expired' | 'configuration_changed' | 'eligibility_changed' | 'recipient_changed' | 'unknown' | null;
    review: {
        url: string;
        expiresAt: string;
    } | null;
    operation: PublicOperation | null;
}
export interface NotificationPreparationResult {
    preview: MessagePreview | null;
    preparation: PreparedNotification | null;
}
export interface ApplyPreparedNotificationInput {
    expectedRevision: number;
}
export interface ApplyPreparedMessagingConfigurationInput extends ApplyPreparedNotificationInput {
}
export interface PreparedMessagingConfiguration extends Omit<PreparedNotification, 'kind' | 'state' | 'operation' | 'reasonCode'> {
    kind: 'messaging_configuration';
    state: 'awaiting_review' | 'ready' | 'applied' | 'rejected' | 'expired' | 'stale' | 'unknown';
    reasonCode: 'user_rejected' | 'preparation_expired' | 'configuration_changed' | 'eligibility_changed' | 'unknown' | null;
    result: {
        auditId: string;
        appliedVersion: number | null;
        requestId: string;
        changed: boolean;
    } | null;
}
