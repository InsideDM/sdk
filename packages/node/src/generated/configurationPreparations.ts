// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as COMMAND_PREPARATION_SCHEMAS } from './schemas.js';
import type { PreparedMessagingConfiguration, ApplyPreparedMessagingConfigurationInput } from './commandPreparationTypes.js';
import { MESSAGING_SETTINGS_BODY_LIMIT } from './messagingConfiguration.js';
import { parseApplyPreparedNotification } from './commandPreparations.js';
export type { PreparedMessagingConfiguration, ApplyPreparedMessagingConfigurationInput } from './commandPreparationTypes.js';
export function parseApplyPreparedMessagingConfiguration(raw: string | Uint8Array): ApplyPreparedMessagingConfigurationInput {
    return parseApplyPreparedNotification(raw);
}
const base = { audience: 'conversations', scope: 'workspace', principalKinds: ['user_delegation'],
    requiredScopes: ['messaging.configuration.write', 'messaging.configuration.read'], humanPermissions: ['developer.manage', 'settings.edit', 'settings.view'],
    userExecution: 'direct', bodyLimit: MESSAGING_SETTINGS_BODY_LIMIT } as const;
const route = '/api/v1/dashboard/{businessId}/developer/messaging-settings/preparations';
const template = '/api/v1/dashboard/:businessId/developer/messaging-settings/preparations';
export const CONFIGURATION_PREPARATION_OPERATIONS = [
    { ...base, id: 'prepareMessagingConfiguration', name: 'messaging.preparations.create', method: 'POST', idempotency: 'required', path: route, pathTemplate: template },
    { ...base, id: 'getPreparedMessagingConfiguration', name: 'messaging.preparations.get', method: 'GET', idempotency: 'none', path: route + '/{preparationId}', pathTemplate: template + '/:preparationId' },
    { ...base, id: 'applyPreparedMessagingConfiguration', name: 'messaging.preparations.apply', method: 'POST', idempotency: 'none', path: route + '/{preparationId}/apply', pathTemplate: template + '/:preparationId/apply' },
] as const;
export class ConfigurationPreparationError extends Error {
    constructor() { super('The prepared settings request or result is invalid.'); this.name = 'ConfigurationPreparationError'; }
}
export function parsePreparedMessagingConfiguration(value: unknown): PreparedMessagingConfiguration {
    try {
        const row = decodeContract(COMMAND_PREPARATION_SCHEMAS.PreparedMessagingConfiguration!, value, { schemas: COMMAND_PREPARATION_SCHEMAS }) as PreparedMessagingConfiguration;
        const created = Date.parse(row.createdAt), updated = Date.parse(row.updatedAt), expires = Date.parse(row.expiresAt);
        if (!/^[a-f0-9]{64}$/.test(row.intentDigest) || updated < created || expires <= created || expires > created + 15 * 60000
            || (row.state === 'applied') !== (row.result !== null) || ['ready', 'applied', 'rejected'].includes(row.state) && row.reviewedAt === null
            || row.state === 'awaiting_review' && row.reviewedAt !== null || (row.state === 'awaiting_review') !== (row.review !== null))
            throw new Error();
        if (row.review) {
            const url = new URL(row.review.url);
            if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
                || url.href !== row.review.url || url.pathname !== `/approve/settings/${row.businessId}/${row.id}` || row.review.expiresAt !== row.expiresAt)
                throw new Error();
        }
        if (['awaiting_review', 'ready', 'applied'].includes(row.state) ? row.reasonCode !== null : row.state !== 'unknown' && row.reasonCode === null)
            throw new Error();
        if (row.reviewedAt !== null && (Date.parse(row.reviewedAt) < created || Date.parse(row.reviewedAt) > updated))
            throw new Error();
        if (row.state === 'rejected' && row.reasonCode !== 'user_rejected' || row.state === 'expired' && row.reasonCode !== 'preparation_expired'
            || row.state === 'stale' && !['configuration_changed', 'eligibility_changed'].includes(row.reasonCode ?? ''))
            throw new Error();
        return row;
    }
    catch {
        throw new ConfigurationPreparationError();
    }
}
