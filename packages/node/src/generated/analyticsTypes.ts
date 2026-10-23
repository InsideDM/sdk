// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export const ANALYTICS_CHANNELS = ['all', 'instagram', 'whatsapp'] as const;
export const ANALYTICS_RANGES = ['week', 'month', 'quarter', 'custom'] as const;
export const ANALYTICS_ORIGINS = ['comment', 'ads', 'campaign', 'story', 'post', 'direct'] as const;
export type AnalyticsChannel = typeof ANALYTICS_CHANNELS[number];
export type AnalyticsRange = typeof ANALYTICS_RANGES[number];
export type AnalyticsOrigin = typeof ANALYTICS_ORIGINS[number];
type Channel = Exclude<AnalyticsChannel, 'all'>;
export interface BusinessAnalyticsQuery {
    channel?: AnalyticsChannel;
    range?: AnalyticsRange;
    start?: string;
    end?: string;
}
export interface BusinessKpis {
    conversations: number;
    conversationsDelta: number | null;
    revenue: string;
    revenueDelta: number | null;
    automationRate: number;
    openConversations: number;
    activeContacts: number;
    contactsDelta: number | null;
    comparisons: {
        conversations: BusinessMetricComparison;
        revenue: BusinessMetricComparison;
        automationRate: BusinessMetricComparison;
        openConversations: BusinessMetricComparison;
        activeContacts: BusinessMetricComparison;
    };
}
export type BusinessComparisonBasis = "conversation_activity_cohort_current_state" | "order_timestamp_cohort_current_net" | "standing_state";
export type BusinessMetricComparison = {
    basis: BusinessComparisonBasis;
} & ({
    value: number;
    unit: "relative_change" | "percentage_points";
    reason: null;
} | {
    value: null;
    unit: "relative_change" | "percentage_points";
    reason: "no_previous_window" | "previous_zero" | "current_denominator_zero" | "previous_denominator_zero" | "noncomparable_currency";
} | {
    value: null;
    unit: null;
    reason: "current_state_only" | "not_applicable";
});
export interface BusinessSeriesPoint {
    label: string;
    all: number;
    instagram: number;
    whatsapp: number;
}
export interface BusinessRevenueDriver {
    id: string;
    label: string;
    value: number;
    amount: string;
}
export interface BusinessMetric {
    value: string | null;
    label: string;
    sub: string;
    comparison: BusinessMetricComparison;
}
export interface BusinessEntryPoint {
    id: string;
    origin: AnalyticsOrigin;
    label: string;
    channel: Channel;
    conversations: number;
    revenue: string | null;
}
export type BusinessOutcomeStatus = "paid" | "pending" | "cod" | "cancelled" | "with_team";
export interface BusinessOutcome {
    id: string;
    kind: "order" | "handoff";
    label: string;
    channel: Channel;
    status: BusinessOutcomeStatus;
    result: string;
    revenue: string | null;
    occurredAt: string;
    href: {
        screen: "inbox" | "orders";
        id: string;
    } | null;
}
export interface BusinessAnalyticsReport {
    kpis: BusinessKpis;
    conversationsSeries: BusinessSeriesPoint[];
    revenueSeries: BusinessSeriesPoint[];
    revenueDrivers: BusinessRevenueDriver[];
    intentBreakdown: {
        label: string;
        value: number;
    }[];
    channelMetrics: {
        instagram: BusinessMetric[];
        whatsapp: BusinessMetric[];
    };
    aiPerformance: BusinessMetric[];
    replyTimes: BusinessReplyTimes;
    customerSignals: BusinessCustomerSignals;
    generatedAt: string;
    channel: AnalyticsChannel;
    range: AnalyticsRange;
    currency: string;
    window: {
        start: string;
        end: string;
        label: string;
        timezone: string;
        partial: boolean;
    };
    comparison: {
        start: string;
        end: string;
        label: string;
    } | null;
    availableRanges: AnalyticsRange[];
    entryPoints: BusinessEntryPoint[];
    outcomes: BusinessOutcome[];
    outcomesTotal: number;
}
export interface BusinessReplyTimeGroup {
    replies: number;
    measured: number;
    medianSeconds: number | null;
    p90Seconds: number | null;
}
export interface BusinessReplyTimes {
    conversations: number;
    unanswered: number;
    unmeasurable: number;
    all: BusinessReplyTimeGroup;
    agent: BusinessReplyTimeGroup;
    team: BusinessReplyTimeGroup;
}
export interface BusinessCustomerSignals {
    sentiment: {
        conversations: number;
        positive: number;
        neutral: number;
        negative: number;
        unknown: number;
    };
    objections: {
        conversations: number;
        rows: Array<{
            reason: "price" | "cod" | "delivery" | "sizing" | "trust" | "unknown";
            conversations: number;
            confidenceSamples: number;
            averageConfidence: number | null;
        }>;
    };
}
