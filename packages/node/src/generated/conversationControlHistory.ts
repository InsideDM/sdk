// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as CONVERSATION_CONTROL_HISTORY_SCHEMAS } from './schemas.js';
import { parseConversationControlQuery } from './conversationControls.js';
import type { ConversationHandoffReasonCode } from './conversationControls.js';
export interface ConversationControlHistoryParams {
    limit?: number;
    cursor?: string;
}
export interface ConversationControlHistoryEvent {
    id: string;
    occurredAt: string;
    action: 'handoff_requested' | 'assigned' | 'unassigned' | 'handed_back' | 'held_reply_dismissed' | 'snoozed' | 'snooze_cleared';
    actorKind: 'user' | 'integration' | 'system' | 'agent' | 'unknown';
    reasonCode: ConversationHandoffReasonCode | null;
    via: 'take_over' | 'typing' | 'pause' | 'assign' | 'native_app' | 'routing' | 'hand_back' | 'dismiss_hold' | 'expiry' | 'snooze' | 'clear_snooze' | 'unknown';
}
export interface ConversationControlHistoryPage {
    businessId: string;
    conversationId: string;
    events: ConversationControlHistoryEvent[];
    page: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}
export class ConversationControlHistoryRequestError extends Error {
    constructor() { super('Use the documented control_history view, limit and cursor.'); this.name = 'ConversationControlHistoryRequestError'; }
}
export function parseConversationControlHistoryQuery(route: string): {
    limit: number;
    cursor?: string;
} {
    const params = new URL(route, 'https://api.insidedm.io').searchParams;
    if (params.get('view') !== 'control_history' || [...params.keys()].some(key => !['view', 'limit', 'cursor'].includes(key))
        || ['view', 'limit', 'cursor'].some(key => params.getAll(key).length > 1))
        throw new ConversationControlHistoryRequestError();
    const limit = params.get('limit'), cursor = params.get('cursor');
    if (limit !== null && (!/^[1-9]\d{0,2}$/.test(limit) || Number(limit) > 100)
        || cursor !== null && !/^[A-Za-z0-9_.-]{1,2048}$/.test(cursor))
        throw new ConversationControlHistoryRequestError();
    return { limit: limit === null ? 25 : Number(limit), ...(cursor === null ? {} : { cursor }) };
}
export function parseConversationControlHistoryPage(value: unknown): ConversationControlHistoryPage {
    const page = decodeContract(CONVERSATION_CONTROL_HISTORY_SCHEMAS.ConversationControlHistoryPage!, value, { schemas: CONVERSATION_CONTROL_HISTORY_SCHEMAS }) as ConversationControlHistoryPage;
    if (page.page.hasMore !== (page.page.nextCursor !== null) || new Set(page.events.map(event => event.id)).size !== page.events.length)
        throw new ConversationControlHistoryRequestError();
    if (page.events.some(event => (event.action === 'handoff_requested') !== (event.reasonCode !== null)))
        throw new ConversationControlHistoryRequestError();
    if (page.events.some((event, index) => index > 0 && (page.events[index - 1]!.occurredAt < event.occurredAt
        || page.events[index - 1]!.occurredAt === event.occurredAt && page.events[index - 1]!.id <= event.id)))
        throw new ConversationControlHistoryRequestError();
    return page;
}
export function parseConversationControlReadQuery(route: string) {
    return new URL(route, 'https://api.insidedm.io').searchParams.get('view') === 'control_history'
        ? parseConversationControlHistoryQuery(route) : parseConversationControlQuery(route);
}
