// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as CONVERSATION_ASSIGNEE_SCHEMAS } from './schemas.js';
export const LIST_CONVERSATION_ASSIGNEES_OPERATION = {
    id: 'listConversationAssignees', name: 'conversations.assignees.list', audience: 'conversations', method: 'GET',
    path: '/api/v1/inbox/{businessId}', pathTemplate: '/api/v1/inbox/:businessId',
    principalKinds: ['user_delegation'], requiredScopes: ['conversations.read'], humanPermissions: ['inbox.view', 'inbox.assign'],
    idempotency: 'none', scope: 'workspace', userExecution: 'direct',
} as const;
export interface ConversationAssigneeParams {
    limit?: number;
    cursor?: string;
}
export interface ConversationAssignee {
    userId: string;
    displayName: string;
    isCurrentUser: boolean;
    canReply: boolean;
}
export interface ConversationAssigneePage {
    businessId: string;
    data: ConversationAssignee[];
    page: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}
export class ConversationAssigneeRequestError extends Error {
    constructor() { super('Use the documented conversation assignee view, limit and cursor.'); this.name = 'ConversationAssigneeRequestError'; }
}
export function parseConversationAssigneeQuery(route: string): {
    limit: number;
    cursor?: string;
} {
    const params = new URL(route, 'https://api.insidedm.io').searchParams;
    if (params.get('view') !== 'assignees' || [...params.keys()].some(key => !['view', 'limit', 'cursor'].includes(key))
        || ['view', 'limit', 'cursor'].some(key => params.getAll(key).length > 1))
        throw new ConversationAssigneeRequestError();
    const limit = params.get('limit'), cursor = params.get('cursor');
    if (limit !== null && (!/^[1-9]\d{0,2}$/.test(limit) || Number(limit) > 100)
        || cursor !== null && (!/^[A-Za-z0-9_.-]{1,2048}$/.test(cursor)))
        throw new ConversationAssigneeRequestError();
    return { limit: limit === null ? 25 : Number(limit), ...(cursor === null ? {} : { cursor }) };
}
export function parseConversationAssigneePage(value: unknown): ConversationAssigneePage {
    const data = decodeContract(CONVERSATION_ASSIGNEE_SCHEMAS.ConversationAssigneePage!, value, { schemas: CONVERSATION_ASSIGNEE_SCHEMAS }) as ConversationAssigneePage;
    if (data.page.hasMore !== (data.page.nextCursor !== null) || new Set(data.data.map(member => member.userId)).size !== data.data.length
        || data.data.filter(member => member.isCurrentUser).length > 1
        || data.data.some(member => !member.displayName.trim() || /\p{Cc}/u.test(member.displayName)))
        throw new ConversationAssigneeRequestError();
    return data;
}
