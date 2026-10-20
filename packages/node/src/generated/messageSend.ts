// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson, type JsonValue } from './boundedJson.js';
export const MESSAGE_SEND_BODY_LIMIT = 64 * 1024;
export const MESSAGE_TEXT_MAX_LENGTH = 1000;
export const MESSAGE_TEMPLATE_VARIABLE_MAX_LENGTH = 1024;
export type MessageRecipient = {
    contactId: string;
} | {
    phone: string;
} | {
    conversationId: string;
};
export type MessageTemplateRef = {
    id: string;
} | {
    alias: string;
};
export type MessageTextContent = {
    type: 'text';
    text: string;
};
export type MessageTemplateContent = {
    type: 'template';
    template: MessageTemplateRef;
    variables: Record<string, string>;
    locale?: string;
};
export type MessageCatalogContent = {
    type: 'catalog';
    productIds: string[];
};
interface SendContext {
    purposeBinding?: string;
    expiresAt?: string;
    clientReference?: string;
}
export type MessageSendInput = SendContext & ({
    intent: 'reply';
    to: {
        conversationId: string;
    };
    content: MessageTextContent | MessageTemplateContent | MessageCatalogContent;
    replyGuard?: string;
    aiDraft?: JsonValue;
} | {
    intent: 'notification';
    to: MessageRecipient;
    content: MessageTextContent | MessageTemplateContent;
});
export const MESSAGE_SEND_OPERATION = {
    id: 'sendMessage', name: 'messages.send', audience: 'conversations', method: 'POST',
    path: '/api/v1/inbox/{businessId}/messages', pathTemplate: '/api/v1/inbox/:businessId/messages',
    principalKinds: ['business_key', 'delegation'], requiredScopes: ['messages.send'],
    humanPermissions: ['inbox.view', 'inbox.reply'], idempotency: 'required', scope: 'workspace',
} as const;
export class MessageSendRequestError extends Error {
    constructor() { super('Provide a valid message recipient, intent and supported content.'); this.name = 'MessageSendRequestError'; }
}
function refuse(): never { throw new MessageSendRequestError(); }
function record(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : refuse();
}
function keys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): void {
    if (required.some((key) => !Object.hasOwn(value, key)) || Object.keys(value).some((key) => !required.includes(key) && !optional.includes(key)))
        refuse();
}
function text(value: unknown, max: number): string {
    if (typeof value !== 'string')
        return refuse();
    const result = value.trim();
    return result.length > 0 && result.length <= max ? result : refuse();
}
function id(value: unknown): string {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : refuse();
}
function recipient(value: unknown): MessageRecipient {
    const input = record(value);
    if (Object.keys(input).length !== 1)
        return refuse();
    if (Object.hasOwn(input, 'conversationId'))
        return { conversationId: id(input.conversationId) };
    if (Object.hasOwn(input, 'contactId'))
        return { contactId: id(input.contactId) };
    if (Object.hasOwn(input, 'phone') && typeof input.phone === 'string' && /^\+[1-9]\d{7,14}$/.test(input.phone))
        return { phone: input.phone };
    return refuse();
}
function content(value: unknown): MessageTextContent | MessageTemplateContent | MessageCatalogContent {
    const input = record(value);
    if (input.type === 'text') {
        keys(input, ['type', 'text']);
        return { type: 'text', text: text(input.text, MESSAGE_TEXT_MAX_LENGTH) };
    }
    if (input.type === 'catalog') {
        keys(input, ['type', 'productIds']);
        if (!Array.isArray(input.productIds) || input.productIds.length < 1 || input.productIds.length > 10)
            return refuse();
        const productIds = input.productIds.map(id);
        if (new Set(productIds).size !== productIds.length)
            return refuse();
        return { type: 'catalog', productIds };
    }
    if (input.type !== 'template')
        return refuse();
    keys(input, ['type', 'template'], ['variables', 'locale']);
    const reference = record(input.template);
    if (Object.keys(reference).length !== 1)
        return refuse();
    let template: MessageTemplateRef;
    if (Object.hasOwn(reference, 'id'))
        template = { id: id(reference.id) };
    else if (Object.hasOwn(reference, 'alias') && typeof reference.alias === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(reference.alias))
        template = { alias: reference.alias };
    else
        return refuse();
    const variables = input.variables === undefined ? {} : record(input.variables);
    const entries = Object.entries(variables);
    if (entries.length > 100)
        return refuse();
    const normalized = Object.fromEntries(entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => {
        if (!/^(?:[A-Za-z_][A-Za-z0-9_]{0,63}|[1-9]\d{0,2})$/.test(key))
            return refuse();
        return [key, text(value, MESSAGE_TEMPLATE_VARIABLE_MAX_LENGTH)];
    }));
    let locale: string | undefined;
    if (input.locale !== undefined) {
        if (typeof input.locale !== 'string' || input.locale.length > 35 || !/^[a-z]{2,3}(?:[_-][A-Za-z0-9]{2,8})*$/.test(input.locale))
            return refuse();
        locale = input.locale;
    }
    return { type: 'template', template, variables: normalized, ...(locale === undefined ? {} : { locale }) };
}
export function parseMessageSendInput(raw: string | Uint8Array): MessageSendInput {
    try {
        const input = record(parseBoundedJson(raw, MESSAGE_SEND_BODY_LIMIT));
        keys(input, ['intent', 'to', 'content'], ['purposeBinding', 'expiresAt', 'clientReference', 'replyGuard', 'aiDraft']);
        if (input.intent !== 'reply' && input.intent !== 'notification')
            return refuse();
        const to = recipient(input.to);
        const message = content(input.content);
        const context: SendContext = {};
        if (input.purposeBinding !== undefined) {
            if (typeof input.purposeBinding !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/.test(input.purposeBinding))
                return refuse();
            context.purposeBinding = input.purposeBinding;
        }
        if (input.clientReference !== undefined)
            context.clientReference = text(input.clientReference, 128);
        if (input.expiresAt !== undefined) {
            if (typeof input.expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(input.expiresAt))
                return refuse();
            const instant = new Date(input.expiresAt);
            if (!Number.isFinite(instant.getTime()) || instant.toISOString().slice(0, 19) !== input.expiresAt.slice(0, 19))
                return refuse();
            context.expiresAt = instant.toISOString();
        }
        if (input.intent === 'notification') {
            if (Object.hasOwn(input, 'replyGuard') || Object.hasOwn(input, 'aiDraft') || message.type === 'catalog')
                return refuse();
            return { intent: 'notification', to, content: message, ...context };
        }
        if (!('conversationId' in to))
            return refuse();
        let replyGuard: string | undefined;
        if (input.replyGuard !== undefined) {
            if (typeof input.replyGuard !== 'string' || input.replyGuard.length < 1 || input.replyGuard.length > 4096)
                return refuse();
            replyGuard = input.replyGuard;
        }
        return { intent: 'reply', to, content: message, ...context,
            ...(replyGuard === undefined ? {} : { replyGuard }),
            ...(Object.hasOwn(input, 'aiDraft') ? { aiDraft: input.aiDraft as JsonValue } : {}) };
    }
    catch {
        return refuse();
    }
}
export function messageSendIntent(input: MessageSendInput): string {
    const { intent, to, content, purposeBinding, expiresAt, clientReference } = parseMessageSendInput(JSON.stringify(input));
    return JSON.stringify({ intent, to, content,
        ...(purposeBinding === undefined ? {} : { purposeBinding }), ...(expiresAt === undefined ? {} : { expiresAt }),
        ...(clientReference === undefined ? {} : { clientReference }) });
}
