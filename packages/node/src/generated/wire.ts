// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import type { DeveloperEventType, PublicScope } from "./vocabulary.js";
export const PUBLIC_CHANNELS = ["instagram", "whatsapp", "unknown"] as const;
export type PublicChannel = (typeof PUBLIC_CHANNELS)[number];
export const PUBLIC_CONVERSATION_STATES = ["open", "closed", "unknown"] as const;
export type PublicConversationState = (typeof PUBLIC_CONVERSATION_STATES)[number];
export const PUBLIC_ATTACHMENT_KINDS = ["image", "video", "audio", "document", "unknown"] as const;
export type PublicAttachmentKind = (typeof PUBLIC_ATTACHMENT_KINDS)[number];
export const PUBLIC_MESSAGE_KINDS = ["text", "image", "video", "audio", "document", "unknown"] as const;
export type PublicMessageKind = (typeof PUBLIC_MESSAGE_KINDS)[number];
export const PUBLIC_MESSAGE_CONTENT_STATES = ["present", "edited", "deleted", "redacted", "unknown"] as const;
export type PublicMessageContentState = (typeof PUBLIC_MESSAGE_CONTENT_STATES)[number];
export const PUBLIC_MESSAGE_DELIVERY_STATES = ["pending", "sent", "delivered", "read", "failed", "unknown"] as const;
export type PublicMessageDeliveryState = (typeof PUBLIC_MESSAGE_DELIVERY_STATES)[number];
export const PUBLIC_ORDER_SOURCES = [
    "agent",
    "web_shopify",
    "pos",
    "payment_rail",
    "merchant_entry",
    "customer_claim",
    "import",
    "unknown",
] as const;
export type PublicOrderSource = (typeof PUBLIC_ORDER_SOURCES)[number];
export const PUBLIC_ORDER_STATES = [
    "draft",
    "payment_pending",
    "paid",
    "preparing",
    "ready",
    "dispatched",
    "completed",
    "cancelled",
    "refunded",
    "partially_refunded",
    "unknown",
] as const;
export type PublicOrderState = (typeof PUBLIC_ORDER_STATES)[number];
export const PUBLIC_PAYMENT_STATES = [
    "not_started",
    "pending",
    "paid",
    "partially_refunded",
    "refunded",
    "unknown",
] as const;
export type PublicPaymentState = (typeof PUBLIC_PAYMENT_STATES)[number];
export const PUBLIC_SHIPMENT_JOURNEYS = ["forward", "rto", "customer_return", "unknown"] as const;
export type PublicShipmentJourney = (typeof PUBLIC_SHIPMENT_JOURNEYS)[number];
export const PUBLIC_SHIPMENT_PHASES = [
    "unlinked",
    "booked",
    "pickup_scheduled",
    "picked_up",
    "in_transit",
    "destination_hub",
    "out_for_delivery",
    "delivered",
    "terminal",
    "unknown",
] as const;
export type PublicShipmentPhase = (typeof PUBLIC_SHIPMENT_PHASES)[number];
export const PUBLIC_SHIPMENT_EXCEPTIONS = [
    "none",
    "pickup_error",
    "pickup_exception",
    "undelivered",
    "delayed",
    "partial_delivery",
    "misrouted",
    "handover_exception",
    "packed_exception",
    "qc_failed",
    "recipient_issue",
    "untraceable",
    "lost",
    "damaged",
    "destroyed",
    "unknown",
] as const;
export type PublicShipmentException = (typeof PUBLIC_SHIPMENT_EXCEPTIONS)[number];
export const PUBLIC_SHIPMENT_RESOLUTIONS = [
    "active",
    "delivered",
    "cancelled",
    "rto_in_progress",
    "rto_delivered",
    "return_in_progress",
    "returned",
    "disposed",
    "lost",
    "destroyed",
    "manual_review",
    "unknown",
] as const;
export type PublicShipmentResolution = (typeof PUBLIC_SHIPMENT_RESOLUTIONS)[number];
export const PUBLIC_SHIPMENT_ESTIMATED_DELIVERY_SOURCES = ["provider", "unknown"] as const;
export type PublicShipmentEstimatedDeliverySource = (typeof PUBLIC_SHIPMENT_ESTIMATED_DELIVERY_SOURCES)[number];
export const PUBLIC_SHIPMENT_NEEDS_REVIEW_REASONS = [
    "unknown_provider_status",
    "uncertified_namespace",
    "contradictory_terminal",
    "conflicting_evidence",
    "corpus_changed",
    "unknown",
] as const;
export type PublicShipmentNeedsReviewReason = (typeof PUBLIC_SHIPMENT_NEEDS_REVIEW_REASONS)[number];
export const PUBLIC_SHIPMENT_FRESHNESS = ["current", "aging", "stale", "unknown"] as const;
export type PublicShipmentFreshness = (typeof PUBLIC_SHIPMENT_FRESHNESS)[number];
export const PUBLIC_CLOSED_UNIONS = {
    PublicChannel: PUBLIC_CHANNELS,
    PublicConversationState: PUBLIC_CONVERSATION_STATES,
    PublicAttachmentKind: PUBLIC_ATTACHMENT_KINDS,
    PublicMessageKind: PUBLIC_MESSAGE_KINDS,
    PublicMessageContentState: PUBLIC_MESSAGE_CONTENT_STATES,
    PublicMessageDeliveryState: PUBLIC_MESSAGE_DELIVERY_STATES,
    PublicOrderSource: PUBLIC_ORDER_SOURCES,
    PublicOrderState: PUBLIC_ORDER_STATES,
    PublicPaymentState: PUBLIC_PAYMENT_STATES,
    PublicShipmentJourney: PUBLIC_SHIPMENT_JOURNEYS,
    PublicShipmentPhase: PUBLIC_SHIPMENT_PHASES,
    PublicShipmentException: PUBLIC_SHIPMENT_EXCEPTIONS,
    PublicShipmentResolution: PUBLIC_SHIPMENT_RESOLUTIONS,
    PublicShipmentEstimatedDeliverySource: PUBLIC_SHIPMENT_ESTIMATED_DELIVERY_SOURCES,
    PublicShipmentNeedsReviewReason: PUBLIC_SHIPMENT_NEEDS_REVIEW_REASONS,
    PublicShipmentFreshness: PUBLIC_SHIPMENT_FRESHNESS,
} as const;
export function closedOrUnknown<const T extends readonly string[]>(members: T, raw: unknown): T[number] {
    return typeof raw === "string" && members.includes(raw) ? (raw as T[number]) : "unknown";
}
export interface PublicPage<T> {
    data: T[];
    page: {
        nextCursor: string | null;
    };
}
export interface PublicItem<T> {
    data: T;
}
export type PublicKeyState = "active" | "rotating";
export interface PublicKeySelf {
    id: string;
    label: string;
    scopes: PublicScope[];
    state: PublicKeyState;
    createdAt: string;
    expiresAt: string;
}
export interface PublicWorkspace {
    id: string;
    name: string;
    timeZone: string;
    key: PublicKeySelf | null;
}
export interface PublicContactSummary {
    id: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    channels: Array<{
        channel: PublicChannel;
        handle: string | null;
    }>;
    revision: string;
    createdAt: string;
    updatedAt: string;
}
export interface PublicContact extends PublicContactSummary {
    tags: string[];
}
export interface PublicConversationSummary {
    id: string;
    contactId: string | null;
    channel: PublicChannel;
    state: PublicConversationState;
    lastMessageAt: string | null;
    revision: string;
    createdAt: string;
    updatedAt: string;
}
export type PublicConversation = PublicConversationSummary;
export interface PublicMessageAttachment {
    kind: PublicAttachmentKind;
    mimeType: string | null;
    fileName: string | null;
    sizeBytes: number | null;
}
export interface PublicMessage {
    id: string;
    conversationId: string;
    direction: "inbound" | "outbound";
    kind: PublicMessageKind;
    contentState: PublicMessageContentState;
    text: string | null;
    attachments: PublicMessageAttachment[];
    deliveryState: PublicMessageDeliveryState;
    sequence: string;
    revision: string;
    occurredAt: string;
}
export interface PublicOrderSummary {
    id: string;
    externalReference: string | null;
    contactId: string | null;
    source: PublicOrderSource;
    orderState: PublicOrderState;
    paymentState: PublicPaymentState;
    totalMinor: string;
    currency: string;
    placedAt: string | null;
    revision: string;
    createdAt: string;
    updatedAt: string;
}
export interface PublicOrderItem {
    productId: string | null;
    name: string;
    sku: string | null;
    quantity: number;
    unitAmountMinor: string;
    lineAmountMinor: string;
}
export interface PublicOrder extends PublicOrderSummary {
    items: PublicOrderItem[];
    itemsTruncated: boolean;
}
export interface PublicShipmentSummary {
    id: string;
    orderId: string;
    courierLabel: string | null;
    journey: PublicShipmentJourney;
    phase: PublicShipmentPhase;
    exception: PublicShipmentException;
    resolution: PublicShipmentResolution;
    estimatedDeliveryDate: string | null;
    estimatedDeliverySource: PublicShipmentEstimatedDeliverySource | null;
    confirmedAt: string | null;
    providerCheckedAt: string | null;
    needsReviewReason: PublicShipmentNeedsReviewReason | null;
    freshness: PublicShipmentFreshness;
    revision: string;
    createdAt: string;
    updatedAt: string;
}
export type PublicShipment = PublicShipmentSummary;
export interface DeveloperResourceRef {
    type: "contact" | "conversation" | "message" | "order" | "shipment";
    id: string;
    revision: string;
    deleted: boolean;
    parent: {
        type: "conversation";
        id: string;
    } | {
        type: "order";
        id: string;
    } | null;
    href: string;
}
export interface DeveloperChangedEventEnvelope {
    id: string;
    type: Exclude<DeveloperEventType, "endpoint.test" | "operation.changed" | 'message.delivery_changed'>;
    version: 1;
    occurredAt: string;
    change: "created" | "updated" | "deleted";
    resource: DeveloperResourceRef;
}
export interface EndpointTestEventEnvelope {
    id: string;
    type: "endpoint.test";
    version: 1;
    occurredAt: string;
    change: "test";
    test: {
        endpointId: string;
        challenge: string;
    };
}
export interface MessageDeliveryChangedEventEnvelope {
    id: string;
    type: 'message.delivery_changed';
    version: 1;
    occurredAt: string;
    change: 'updated';
    resource: {
        type: 'message';
        id: string;
        revision: string;
        deleted: false;
        parent: {
            type: 'conversation';
            id: string;
        };
        href: string;
    };
}
export interface OperationChangedEventEnvelope {
    id: string;
    type: 'operation.changed';
    version: 2;
    occurredAt: string;
    change: 'updated';
    businessId: string;
    producer: {
        kind: 'business_key' | 'human';
        id: string;
    } | {
        kind: 'installation';
        id: string;
        authorityVersion: number;
    };
    application?: ApplicationEventContext;
    resource: {
        type: 'operation';
        id: string;
        revision: string;
        deleted: false;
        parent: null;
        href: string;
    };
}
export interface ApplicationEventContext {
    id: string;
    installationId: string;
    authorityVersion: number;
}
export type ApplicationResourceEventEnvelope = (Omit<DeveloperChangedEventEnvelope, 'version'> | Omit<MessageDeliveryChangedEventEnvelope, 'version'>) & {
    version: 2;
    businessId: string;
    application: ApplicationEventContext;
};
export type DeveloperEventEnvelope = DeveloperChangedEventEnvelope | EndpointTestEventEnvelope | OperationChangedEventEnvelope | MessageDeliveryChangedEventEnvelope | ApplicationResourceEventEnvelope;
export interface WebhookVerificationChallenge {
    type: "endpoint.verify";
    version: 1;
    verificationId: string;
    endpointId: string;
    targetGeneration: number;
    secretGeneration: number;
    challenge: string;
    expiresAt: string;
}
export interface WebhookVerificationProof {
    challenge: string;
    proof: string;
}
