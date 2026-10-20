// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export const PARTNER_PLATFORM_SCOPES = [
    'platform.businesses.read', 'platform.businesses.create', 'platform.businesses.link',
    'platform.installations.manage', 'platform.onboarding.create', 'platform.sessions.create',
    'platform.delegations.create',
    'platform.subscriptions.manage', 'platform.usage.read', 'platform.branding.manage',
] as const;
export type PartnerPlatformScope = (typeof PARTNER_PLATFORM_SCOPES)[number];
export function parsePartnerPlatformScopes(value: unknown): PartnerPlatformScope[] | null {
    if (!Array.isArray(value) || !value.length || value.length > PARTNER_PLATFORM_SCOPES.length
        || new Set(value).size !== value.length || value.some(scope => !(PARTNER_PLATFORM_SCOPES as readonly unknown[]).includes(scope)))
        return null;
    return PARTNER_PLATFORM_SCOPES.filter(scope => value.includes(scope));
}
