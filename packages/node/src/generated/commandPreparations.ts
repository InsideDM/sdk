// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
import { parseMessageSendInput } from './messageSend.js';
import type { ApplyPreparedNotificationInput, NotificationPreparationInput } from './commandPreparationTypes.js';
const base = { audience: 'conversations', scope: 'workspace', principalKinds: ['user_delegation'],
    requiredScopes: ['messages.send'], humanPermissions: ['campaigns.send'], userExecution: 'direct' } as const;
export const MESSAGE_PREPARATION_OPERATIONS = [{ ...base,
        id: 'prepareNotification', name: 'messages.preparations.create', method: 'POST', idempotency: 'required',
        path: '/api/v1/inbox/{businessId}/message-preparations', pathTemplate: '/api/v1/inbox/:businessId/message-preparations',
    }, { ...base,
        id: 'getPreparedNotification', name: 'messages.preparations.get', method: 'GET', idempotency: 'none',
        path: '/api/v1/inbox/{businessId}/message-preparations/{preparationId}', pathTemplate: '/api/v1/inbox/:businessId/message-preparations/:preparationId',
    }, { ...base,
        id: 'applyPreparedNotification', name: 'messages.preparations.apply', method: 'POST', idempotency: 'none',
        path: '/api/v1/inbox/{businessId}/message-preparations/{preparationId}/apply', pathTemplate: '/api/v1/inbox/:businessId/message-preparations/:preparationId/apply',
    }] as const;
export class CommandPreparationRequestError extends Error {
    constructor() { super('Provide a notification or the current prepared-command revision.'); this.name = 'CommandPreparationRequestError'; }
}
export function parseNotificationPreparation(raw: string | Uint8Array): NotificationPreparationInput {
    const message = parseMessageSendInput(raw);
    if (message.intent !== 'notification')
        throw new CommandPreparationRequestError();
    return message;
}
export function parseApplyPreparedNotification(raw: string | Uint8Array): ApplyPreparedNotificationInput {
    const value = parseBoundedJson(raw, 1024);
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 1
        || !Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 1 || Number(value.expectedRevision) > 2147483647)
        throw new CommandPreparationRequestError();
    return { expectedRevision: Number(value.expectedRevision) };
}
