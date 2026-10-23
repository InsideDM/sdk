// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseMessagingConfiguration, type MessagingConfiguration } from './messagingConfiguration.js';
export interface PublicTemplate {
    id: string;
    name: string;
    language: string;
    category: string;
    body: string;
    buttons: string[];
    parameterFormat: 'named' | 'positional';
    variables: Array<{
        key: string;
        label: string;
    }>;
    supported: boolean;
    unavailableReason: string | null;
    notificationSupported: boolean;
}
export interface TemplateListParams {
    limit?: number;
    cursor?: string;
    conversationId?: string;
}
export interface TemplatePage {
    data: PublicTemplate[];
    page: {
        nextCursor: string | null;
    };
}
export interface MessagingReadiness {
    channel: 'whatsapp';
    accountReady: boolean;
    reasonCode: 'account_not_connected' | 'account_paused' | 'credentials_unavailable' | 'credentials_expired' | 'account_ambiguous' | 'account_unavailable' | null;
    textPurposeConfigured: boolean;
}
export interface PublicMessagingConfiguration {
    value: MessagingConfiguration;
    version: number | null;
}
const base = { audience: 'conversations', principalKinds: ['business_key', 'delegation', 'user_delegation'], scope: 'workspace', method: 'GET', idempotency: 'none' } as const;
export const LIST_TEMPLATES_OPERATION = { ...base, id: 'listTemplates', name: 'templates.list',
    path: '/api/v1/inbox/{businessId}/templates', pathTemplate: '/api/v1/inbox/:businessId/templates',
    requiredScopes: ['templates.read'], humanPermissions: ['inbox.view', 'inbox.reply'] } as const;
export const MESSAGING_READINESS_OPERATION = { ...base, id: 'getMessagingReadiness', name: 'messaging.getReadiness',
    path: '/api/v1/inbox/{businessId}/messaging-readiness', pathTemplate: '/api/v1/inbox/:businessId/messaging-readiness',
    requiredScopes: ['messaging.read'], humanPermissions: ['connections.view'] } as const;
export const MESSAGING_CONFIGURATION_OPERATION = { ...base, id: 'getMessagingConfiguration', name: 'messaging.getConfiguration',
    path: '/api/v1/dashboard/{businessId}/developer/messaging-settings', pathTemplate: '/api/v1/dashboard/:businessId/developer/messaging-settings',
    requiredScopes: ['messaging.configuration.read'], humanPermissions: ['settings.view'] } as const;
export const MESSAGING_DISCOVERY_OPERATIONS = [LIST_TEMPLATES_OPERATION, MESSAGING_READINESS_OPERATION, MESSAGING_CONFIGURATION_OPERATION] as const;
export class MessagingDiscoveryRequestError extends Error {
    constructor(readonly code: 'invalid_request' | 'invalid_cursor' = 'invalid_request') {
        super('Use a valid template page and the original filters and limit.');
        this.name = 'MessagingDiscoveryRequestError';
    }
}
export function parseMessagingConfigurationQuery(route: string): {
    view: 'configuration';
} {
    const at = route.indexOf('?'), params = new URLSearchParams(at < 0 ? '' : route.slice(at + 1));
    if ([...params].length !== 1 || params.get('view') !== 'configuration')
        throw new MessagingDiscoveryRequestError();
    return { view: 'configuration' };
}
export function parseTemplateListQuery(route: string): Required<Pick<TemplateListParams, 'limit'>> & Omit<TemplateListParams, 'limit'> {
    const at = route.indexOf('?');
    const params = new URLSearchParams(at < 0 ? '' : route.slice(at + 1));
    for (const key of params.keys()) {
        if (!['limit', 'cursor', 'conversationId'].includes(key) || params.getAll(key).length !== 1)
            throw new MessagingDiscoveryRequestError();
    }
    const rawLimit = params.get('limit');
    if (rawLimit !== null && !/^(?:[1-9][0-9]?|100)$/.test(rawLimit))
        throw new MessagingDiscoveryRequestError();
    const cursor = params.get('cursor'), conversationId = params.get('conversationId');
    if (cursor !== null && (!cursor || cursor.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(cursor)))
        throw new MessagingDiscoveryRequestError('invalid_cursor');
    if (conversationId !== null && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(conversationId))
        throw new MessagingDiscoveryRequestError();
    return { limit: rawLimit === null ? 25 : Number(rawLimit), ...(cursor === null ? {} : { cursor }), ...(conversationId === null ? {} : { conversationId }) };
}
export function parseMessagingDiscoveryResponse(operation: 'listTemplates' | 'getMessagingReadiness' | 'getMessagingConfiguration', input: unknown): TemplatePage | {
    data: MessagingReadiness;
} | {
    data: PublicMessagingConfiguration;
} {
    const record = (value: unknown): Record<string, unknown> => {
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new MessagingDiscoveryRequestError();
        return value as Record<string, unknown>;
    };
    const root = record(input);
    const string = (value: unknown, max: number): string => {
        if (typeof value !== 'string' || value.length > max)
            throw new MessagingDiscoveryRequestError();
        return value;
    };
    if (operation === 'getMessagingConfiguration') {
        const data = record(root.data);
        if (data.version !== null && (!Number.isSafeInteger(data.version) || Number(data.version) < 1))
            throw new MessagingDiscoveryRequestError();
        return { data: { value: parseMessagingConfiguration(JSON.stringify(data.value)), version: data.version as number | null } };
    }
    if (operation === 'getMessagingReadiness') {
        const data = record(root.data);
        if (data.channel !== 'whatsapp' || typeof data.accountReady !== 'boolean' || typeof data.textPurposeConfigured !== 'boolean'
            || ![null, 'account_not_connected', 'account_paused', 'credentials_unavailable', 'credentials_expired', 'account_ambiguous', 'account_unavailable'].includes(data.reasonCode as MessagingReadiness['reasonCode'])
            || data.accountReady !== (data.reasonCode === null))
            throw new MessagingDiscoveryRequestError();
        return { data: { channel: 'whatsapp', accountReady: data.accountReady, reasonCode: data.reasonCode as MessagingReadiness['reasonCode'], textPurposeConfigured: data.textPurposeConfigured } };
    }
    const page = record(root.page);
    if (!Array.isArray(root.data) || root.data.length > 100 || page.nextCursor !== null && (typeof page.nextCursor !== 'string' || page.nextCursor.length > 2048))
        throw new MessagingDiscoveryRequestError();
    const data = root.data.map(raw => {
        const row = record(raw), id = string(row.id, 36);
        if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id) || !['named', 'positional'].includes(String(row.parameterFormat))
            || typeof row.supported !== 'boolean' || typeof row.notificationSupported !== 'boolean' || !Array.isArray(row.buttons) || row.buttons.length > 20
            || !Array.isArray(row.variables) || row.variables.length > 100)
            throw new MessagingDiscoveryRequestError();
        return { id, name: string(row.name, 512), language: string(row.language, 64), category: string(row.category, 64), body: string(row.body, 16384),
            buttons: row.buttons.map(button => string(button, 1024)), parameterFormat: row.parameterFormat as 'named' | 'positional',
            variables: row.variables.map(raw => { const variable = record(raw); return { key: string(variable.key, 64), label: string(variable.label, 256) }; }),
            supported: row.supported, notificationSupported: row.notificationSupported, unavailableReason: row.unavailableReason === null ? null : string(row.unavailableReason, 512) };
    });
    return { data, page: { nextCursor: page.nextCursor as string | null } };
}
