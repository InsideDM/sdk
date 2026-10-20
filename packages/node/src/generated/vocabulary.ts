// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export const PUBLIC_API_SCOPES = [
    "contacts.read",
    'contacts.write',
    "conversations.read",
    "messages.read",
    'messages.send',
    'operations.read',
    'events.write',
    'flows.read',
    'flows.deploy',
    'templates.read',
    'messaging.read',
    'messaging.configuration.read',
    'consents.write',
    'consents.read',
    'usage.read',
    "orders.read",
    "shipments.read",
] as const;
export type PublicScope = (typeof PUBLIC_API_SCOPES)[number];
export const DEVELOPER_EVENT_TYPES = [
    'operation.changed',
    "contact.changed",
    "conversation.changed",
    "message.created",
    'message.delivery_changed',
    "order.changed",
    "shipment.changed",
    "endpoint.test",
] as const;
export type DeveloperEventType = (typeof DEVELOPER_EVENT_TYPES)[number];
export type DeveloperSubscriptionEventType = Exclude<DeveloperEventType, "endpoint.test">;
export type PublicScopeParseError = {
    error: "not_a_list";
    scope: null;
} | {
    error: "empty";
    scope: null;
} | {
    error: "too_many";
    scope: null;
} | {
    error: "unknown_scope";
    scope: string;
} | {
    error: "duplicate_scope";
    scope: string;
};
export function parsePublicScopes(input: unknown): PublicScope[] | PublicScopeParseError {
    if (!Array.isArray(input))
        return { error: "not_a_list", scope: null };
    if (input.length === 0)
        return { error: "empty", scope: null };
    if (input.length > PUBLIC_API_SCOPES.length) {
        return { error: "too_many", scope: null };
    }
    const known = new Set<string>(PUBLIC_API_SCOPES);
    const seen = new Set<string>();
    for (const entry of input) {
        if (typeof entry !== "string")
            return { error: "not_a_list", scope: null };
        if (!known.has(entry))
            return { error: "unknown_scope", scope: entry };
        if (seen.has(entry))
            return { error: "duplicate_scope", scope: entry };
        seen.add(entry);
    }
    return PUBLIC_API_SCOPES.filter((scope) => seen.has(scope));
}
