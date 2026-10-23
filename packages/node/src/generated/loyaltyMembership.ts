// Generated from the authoritative InsideDM public contract. Do not edit by hand.
import { decodeContract } from './contractCodec.js';
import { SCHEMAS as LOYALTY_MEMBERSHIP_SCHEMAS } from './schemas.js';
import type { LoyaltyMembership } from './loyaltyMembershipTypes.js';
export type { LoyaltyMembership, LoyaltyWallet, LoyaltyMembershipTier } from './loyaltyMembershipTypes.js';
export const GET_LOYALTY_MEMBERSHIP_OPERATION = {
    id: 'getLoyaltyMembership', name: 'loyalty.members.get', audience: 'conversations', method: 'GET',
    path: '/api/v1/loyalty/{businessId}/members/{contactId}/summary',
    pathTemplate: '/api/v1/loyalty/:businessId/members/:contactId/summary',
    principalKinds: ['business_key', 'delegation', 'user_delegation'], requiredScopes: ['loyalty.read'], humanPermissions: ['loyalty.view'],
    idempotency: 'none', scope: 'workspace', userExecution: 'direct',
} as const;
export function parseLoyaltyMembership(value: unknown): LoyaltyMembership {
    const data = decodeContract(LOYALTY_MEMBERSHIP_SCHEMAS.LoyaltyMembership!, value, { schemas: LOYALTY_MEMBERSHIP_SCHEMAS }) as LoyaltyMembership;
    if (data.enrolled && data.preMember || !data.enrolled && data.tier !== null
        || new Set(data.wallets.map(wallet => wallet.wallet)).size !== data.wallets.length)
        throw new Error('Invalid loyalty membership.');
    return data;
}
export function parseLoyaltyMembershipRoute(route: string, businessId: string, contactId: string): void {
    const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
    if (!uuid.test(businessId) || !uuid.test(contactId)
        || route !== GET_LOYALTY_MEMBERSHIP_OPERATION.path.replace('{businessId}', businessId).replace('{contactId}', contactId) + '?view=membership')
        throw new Error('Invalid loyalty membership request.');
}
