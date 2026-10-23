// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as CONVERSATION_CONTROL_SCHEMAS } from './schemas.js';
import { parseBoundedJson } from './boundedJson.js';
export const CONVERSATION_SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000;
export const CONVERSATION_HANDOFF_REASON_CODES = [
    'TOOL_GAP', 'LOW_CONFIDENCE', 'RETRY_EXHAUSTED', 'MANUAL_APPROVAL', 'SCAM', 'SPAM',
    'SAFETY', 'SENTIMENT', 'USER_REQUESTED', 'AGENT_PAUSED', 'HANDOVER_RULE', 'UNKNOWN',
] as const;
export type ConversationHandoffReasonCode = (typeof CONVERSATION_HANDOFF_REASON_CODES)[number];
export function conversationHandoffReasonCode(value: unknown): ConversationHandoffReasonCode {
    const code = typeof value === 'string' && value.length <= 64 ? value.toUpperCase() : '';
    return (CONVERSATION_HANDOFF_REASON_CODES as readonly string[]).includes(code) ? code as ConversationHandoffReasonCode : 'UNKNOWN';
}
export const GET_CONVERSATION_CONTROL_OPERATION = {
    id: 'getConversationControl', name: 'conversations.controls.get', audience: 'conversations', method: 'GET',
    path: '/api/v1/inbox/{businessId}/{conversationId}', pathTemplate: '/api/v1/inbox/:businessId/:conversationId',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['conversations.read'],
    humanPermissions: ['inbox.view'], idempotency: 'none', scope: 'workspace', userExecution: 'direct',
} as const;
export const CONVERSATION_CONTROL_ACTIONS = [
    { action: 'take_over', requiredScopes: ['conversations.read', 'conversations.takeover'],
        humanPermissions: ['inbox.view', 'inbox.reply', 'inbox.assign', 'inbox.manage'] },
    { action: 'assign', requiredScopes: ['conversations.read', 'conversations.assign'], humanPermissions: ['inbox.view', 'inbox.assign'] },
    { action: 'snooze', requiredScopes: ['conversations.read', 'conversations.snooze'], humanPermissions: ['inbox.view', 'inbox.reply', 'inbox.manage'] },
    { action: 'clear_snooze', requiredScopes: ['conversations.read', 'conversations.snooze'], humanPermissions: ['inbox.view', 'inbox.reply', 'inbox.manage'] },
] as const;
export function conversationControlActionPolicy(action: ConversationControlCommand['action']) {
    return CONVERSATION_CONTROL_ACTIONS.find(candidate => candidate.action === action)!;
}
export const UPDATE_CONVERSATION_CONTROL_OPERATION = {
    id: 'updateConversationControl', name: 'conversations.controls.update', audience: 'conversations', method: 'PATCH',
    path: '/api/v1/inbox/{businessId}/{conversationId}', pathTemplate: '/api/v1/inbox/:businessId/:conversationId',
    principalKinds: ['user_delegation'], requiredScopes: ['conversations.read'], humanPermissions: ['inbox.view'],
    actions: CONVERSATION_CONTROL_ACTIONS,
    idempotency: 'required', scope: 'workspace', userExecution: 'direct', bodyLimit: 1024,
} as const;
export interface ConversationTakeoverInput {
    expectedRevision: string;
}
export interface ConversationTakeoverCommand extends ConversationTakeoverInput {
    action: 'take_over';
}
export interface ConversationAssignmentInput extends ConversationTakeoverInput {
    assigneeUserId: string | null;
}
export interface ConversationAssignmentCommand extends ConversationAssignmentInput {
    action: 'assign';
}
export type ConversationSnoozeInput = ConversationTakeoverInput;
export interface ConversationSnoozeCommand extends ConversationSnoozeInput {
    action: 'snooze';
}
export interface ConversationClearSnoozeCommand extends ConversationSnoozeInput {
    action: 'clear_snooze';
}
export type ConversationControlCommand = ConversationTakeoverCommand | ConversationAssignmentCommand | ConversationSnoozeCommand | ConversationClearSnoozeCommand;
export interface ConversationControlReceipt {
    businessId: string;
    conversationId: string;
    auditId: string;
    requestId: string;
    action: 'take_over' | 'assign' | 'snooze' | 'clear_snooze';
    assigneeUserId: string | null;
    snoozedUntil: string | null;
    changed: boolean;
    appliedRevision: string;
}
export interface ConversationTakeoverReceipt extends Omit<ConversationControlReceipt, 'action' | 'assigneeUserId'> {
    action: 'take_over';
    assigneeUserId: string;
}
export interface ConversationAssignmentReceipt extends Omit<ConversationControlReceipt, 'action'> {
    action: 'assign';
}
export interface ConversationSnoozeReceipt extends Omit<ConversationControlReceipt, 'action' | 'snoozedUntil'> {
    action: 'snooze';
    snoozedUntil: string;
}
export interface ConversationClearSnoozeReceipt extends Omit<ConversationControlReceipt, 'action' | 'snoozedUntil'> {
    action: 'clear_snooze';
    snoozedUntil: null;
}
export function parseConversationControlCommand(raw: string | Uint8Array): ConversationControlCommand {
    try {
        const command = decodeContract(CONVERSATION_CONTROL_SCHEMAS.ConversationControlCommand!, parseBoundedJson(raw, 1024), { schemas: CONVERSATION_CONTROL_SCHEMAS }) as ConversationControlCommand;
        return command.action === 'assign' && command.assigneeUserId !== null ? { ...command, assigneeUserId: command.assigneeUserId.toLowerCase() } : command;
    }
    catch {
        throw new ConversationControlRequestError();
    }
}
export function parseConversationControlReceipt(value: unknown): ConversationControlReceipt {
    const data = decodeContract(CONVERSATION_CONTROL_SCHEMAS.ConversationControlReceipt!, value, { schemas: CONVERSATION_CONTROL_SCHEMAS }) as ConversationControlReceipt;
    if (data.action === 'take_over' && data.assigneeUserId === null)
        throw new ConversationControlRequestError();
    if (data.action === 'snooze' && data.snoozedUntil === null || data.action === 'clear_snooze' && data.snoozedUntil !== null)
        throw new ConversationControlRequestError();
    return data;
}
export interface ConversationControlState {
    businessId: string;
    conversationId: string;
    revision: string;
    channel: 'whatsapp' | 'instagram' | 'unknown';
    lifecycle: 'open' | 'waiting_customer' | 'resolved' | 'archived' | 'spam' | 'unknown';
    owner: {
        kind: 'agent' | 'human' | 'unassigned' | 'unknown';
        userId: string | null;
    };
    automation: {
        paused: boolean;
        pausedAt: string | null;
    };
    snoozedUntil: string | null;
    handoff: {
        status: 'pending' | 'assigned' | 'unknown';
        reasonCode: ConversationHandoffReasonCode;
        requestedAt: string | null;
        assignedToUserId: string | null;
    } | null;
    updatedAt: string;
}
export class ConversationControlRequestError extends Error {
    constructor() { super('Use the documented conversation control command and view=control.'); this.name = 'ConversationControlRequestError'; }
}
export function parseConversationControlQuery(route: string) {
    const params = new URL(route, 'https://api.insidedm.io').searchParams;
    if ([...params].length !== 1 || params.get('view') !== 'control')
        throw new ConversationControlRequestError();
    return { view: 'control' as const };
}
export function parseConversationControlState(value: unknown): ConversationControlState {
    const data = decodeContract(CONVERSATION_CONTROL_SCHEMAS.ConversationControlState!, value, { schemas: CONVERSATION_CONTROL_SCHEMAS }) as ConversationControlState;
    if (data.owner.kind !== 'human' && data.owner.userId !== null
        || data.owner.kind === 'human' && data.owner.userId === null
        || data.owner.kind === 'human' && !data.automation.paused
        || data.automation.pausedAt !== null && !data.automation.paused)
        throw new ConversationControlRequestError();
    return data;
}
