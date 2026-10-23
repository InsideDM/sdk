// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export interface LoyaltyWallet {
    wallet: 'points' | 'stamps';
    spendable: number;
    pending: number;
    held: number;
    nextExpiry: {
        at: string;
        amount: number;
    } | null;
}
export interface LoyaltyMembershipTier {
    id: string;
    label: string;
    next: {
        id: string;
        label: string;
    } | null;
}
export interface LoyaltyMembership {
    businessId: string;
    contactId: string;
    observedAt: string;
    enrolled: boolean;
    preMember: boolean;
    joinedAt: string | null;
    tier: LoyaltyMembershipTier | null;
    wallets: LoyaltyWallet[];
    openHoldCount: number;
}
