// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { parseBoundedJson } from './boundedJson.js';
export const MESSAGING_SETTINGS_BODY_LIMIT = 68 * 1024;
export const UPDATE_MESSAGING_CONFIGURATION_OPERATION = {
    id: 'updateMessagingConfiguration', name: 'messaging.updateConfiguration', audience: 'conversations', method: 'PATCH',
    path: '/api/v1/dashboard/{businessId}/developer/messaging-settings',
    pathTemplate: '/api/v1/dashboard/:businessId/developer/messaging-settings',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['messaging.configuration.write'],
    humanPermissions: ['developer.manage', 'settings.edit'], idempotency: 'required', scope: 'workspace',
    userExecution: 'direct',
    maxRequestBodyBytes: MESSAGING_SETTINGS_BODY_LIMIT,
    resultProperty: 'configuration',
} as const;
export interface MessagingConfiguration {
    defaultTextPurposeBinding: string | null;
    templateAliases: Record<string, string>;
    textPurposeBindings: Record<string, {
        purpose: 'service' | 'marketing';
    }>;
}
export interface MessagingConfigurationUpdate {
    configuration: MessagingConfiguration;
    expectedVersion: number | null;
}
export interface MessagingConfigurationSnapshot {
    value: MessagingConfiguration;
    version: number | null;
}
export interface MessagingConfigurationUpdateResult {
    configuration: MessagingConfigurationSnapshot;
}
export function parseMessagingConfigurationUpdateResult(input: unknown): MessagingConfigurationUpdateResult {
    const root = record(input), configuration = record(root.configuration);
    return { configuration: { value: parseMessagingConfiguration(JSON.stringify(configuration.value)), version: version(configuration.version) } };
}
export type MessagingConfigurationReason = 'configuration_invalid' | 'configuration_changed' | 'sender_ambiguous' | 'channel_not_ready' | 'template_not_approved' | 'template_unsupported' | 'template_locale_mismatch' | 'template_variables_invalid' | 'template_alias_unconfigured' | 'sender_template_mismatch' | 'purpose_binding_required' | 'purpose_binding_invalid' | 'recipient_unavailable' | 'sender_recipient_mismatch';
export class MessagingConfigurationError extends Error {
    constructor(readonly reason: MessagingConfigurationReason) {
        super('Review the integration sender, approved template and purpose bindings in settings.');
        this.name = 'MessagingConfigurationError';
    }
}
export interface MessagingSettingsSetup {
    configuration: {
        value: MessagingConfiguration;
        version: number | null;
    };
    canManage: boolean;
    senders: Array<{
        id: string;
        label: string;
        channel: 'whatsapp' | 'instagram';
        ready: boolean;
    }>;
    templates: Array<{
        id: string;
        name: string;
        locale: string;
        senderId: string;
        purpose: 'utility' | 'marketing';
        variables: string[];
    }>;
    templatesLimited: boolean;
    sendersLimited: boolean;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function refuse(): never { throw new MessagingConfigurationError('configuration_invalid'); }
function record(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : refuse();
}
function exact(value: Record<string, unknown>, keys: readonly string[]): void {
    if (Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key)))
        refuse();
}
function id(value: unknown): string { return typeof value === 'string' && UUID.test(value) ? value.toLowerCase() : refuse(); }
function binding(value: unknown): string { return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/.test(value) ? value : refuse(); }
function version(value: unknown): number | null { return value === null || Number.isSafeInteger(value) && Number(value) > 0 ? value as number | null : refuse(); }
export function parseMessagingConfiguration(raw: string | Uint8Array): MessagingConfiguration {
    let value: Record<string, unknown>;
    try {
        value = record(parseBoundedJson(raw, 64 * 1024));
    }
    catch {
        return refuse();
    }
    exact(value, ['defaultTextPurposeBinding', 'templateAliases', 'textPurposeBindings']);
    const aliases = record(value.templateAliases), purposes = record(value.textPurposeBindings);
    if (Object.keys(aliases).length > 100 || Object.keys(purposes).length > 50)
        refuse();
    const templateAliases = Object.fromEntries(Object.entries(aliases).map(([alias, target]) => {
        if (!/^[a-z][a-z0-9_]{0,63}$/.test(alias))
            return refuse();
        return [alias, id(target)];
    }));
    const textPurposeBindings = Object.fromEntries(Object.entries(purposes).map(([name, input]) => {
        binding(name);
        const entry = record(input);
        exact(entry, ['purpose']);
        if (entry.purpose !== 'service' && entry.purpose !== 'marketing')
            return refuse();
        return [name, { purpose: entry.purpose }];
    })) as MessagingConfiguration['textPurposeBindings'];
    const defaultTextPurposeBinding = value.defaultTextPurposeBinding === null ? null : binding(value.defaultTextPurposeBinding);
    if (defaultTextPurposeBinding !== null && !Object.hasOwn(textPurposeBindings, defaultTextPurposeBinding))
        refuse();
    return { defaultTextPurposeBinding, templateAliases, textPurposeBindings };
}
export function parseMessagingSettingsUpdate(raw: string | Uint8Array): MessagingConfigurationUpdate {
    const input = record(parseBoundedJson(raw, MESSAGING_SETTINGS_BODY_LIMIT));
    exact(input, ['configuration', 'expectedVersion']);
    return { configuration: parseMessagingConfiguration(JSON.stringify(input.configuration)), expectedVersion: version(input.expectedVersion) };
}
export function parseMessagingSettingsSetup(input: unknown): MessagingSettingsSetup | null {
    try {
        const root = record(input), config = record(root.configuration);
        if (typeof root.canManage !== 'boolean' || typeof root.templatesLimited !== 'boolean' || typeof root.sendersLimited !== 'boolean' || !Array.isArray(root.senders)
            || !Array.isArray(root.templates) || root.senders.length > 200 || root.templates.length > 500)
            return null;
        const senders = root.senders.map((raw) => {
            const value = record(raw);
            if (typeof value.label !== 'string' || !value.label || value.label.length > 256 || !['whatsapp', 'instagram'].includes(String(value.channel)) || typeof value.ready !== 'boolean')
                return refuse();
            return { id: id(value.id), label: value.label, channel: value.channel as 'whatsapp' | 'instagram', ready: value.ready };
        });
        const templates = root.templates.map((raw) => {
            const value = record(raw);
            if (typeof value.name !== 'string' || value.name.length > 120 || typeof value.locale !== 'string' || value.locale.length > 35
                || !['utility', 'marketing'].includes(String(value.purpose)) || !Array.isArray(value.variables) || value.variables.length > 100
                || value.variables.some((name) => typeof name !== 'string' || name.length > 64))
                return refuse();
            return { id: id(value.id), senderId: id(value.senderId), name: value.name, locale: value.locale, purpose: value.purpose as 'utility' | 'marketing', variables: value.variables as string[] };
        });
        return { configuration: { value: parseMessagingConfiguration(JSON.stringify(config.value)), version: version(config.version) },
            canManage: root.canManage, templatesLimited: root.templatesLimited, sendersLimited: root.sendersLimited, senders, templates };
    }
    catch {
        return null;
    }
}
