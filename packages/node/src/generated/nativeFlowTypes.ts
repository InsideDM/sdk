// Generated from the authoritative InsideDM public contract. Do not edit by hand.
export const FLOW_DEFINITION_SCHEMA_V1 = "inside-flow/v1" as const;
export const FLOW_COMMENT_INTENTS_V1 = [
    "product_interest", "product_question", "guide_request",
] as const;
export type FlowCommentIntentV1 = (typeof FLOW_COMMENT_INTENTS_V1)[number];
export const FLOW_SPECIALIST_KNOWLEDGE_SOURCE_TYPES_V1 = [
    "website",
    "pdf",
    "manual",
    "faq",
    "shopify_product",
] as const;
export type FlowChannelV1 = "instagram" | "whatsapp" | "unified";
export type FlowConcreteChannelV1 = Exclude<FlowChannelV1, "unified">;
export type FlowValueTypeV1 = "string" | "number" | "boolean" | "datetime" | "json" | "string_list";
export type FlowVariableScopeV1 = "system" | "contact" | "run" | "business" | "business_secret";
export type FlowApprovalModeV1 = "auto" | "manual";
export type FlowSpecialistKnowledgeSourceTypeV1 = (typeof FLOW_SPECIALIST_KNOWLEDGE_SOURCE_TYPES_V1)[number];
export type FlowSpecialistApprovalModeV1 = "auto" | "manual_on_low_confidence";
export type FlowSpecialistLowConfidenceModeV1 = "handoff" | "safe_reply";
export type FlowRecipeStatusV1 = "draft" | "active" | "disabled" | "archived";
export type FlowRecipeKindV1 = "product_finder" | "quote_request" | "booking_request" | "handoff" | "comment_to_dm" | "whatsapp_template" | "whatsapp_flow" | "instagram_ice_breaker";
export type FlowLiteralV1 = {
    type: "string";
    value: string;
} | {
    type: "number";
    value: number;
} | {
    type: "boolean";
    value: boolean;
} | {
    type: "datetime";
    value: string;
} | {
    type: "json";
    value: unknown;
} | {
    type: "string_list";
    value: string[];
};
export const FLOW_COMPARISON_OPS_V1 = ["gt", "gte", "lt", "lte"] as const;
export type FlowComparisonOpV1 = (typeof FLOW_COMPARISON_OPS_V1)[number];
export type FlowPredicateV1 = {
    op: "exists";
    variableId: string;
} | {
    op: "equals" | "contains";
    variableId: string;
    value: FlowLiteralV1;
} | {
    op: FlowComparisonOpV1;
    variableId: string;
    value: Extract<FlowLiteralV1, {
        type: "number";
    }>;
} | {
    op: "and" | "or";
    operands: FlowPredicateV1[];
} | {
    op: "not";
    operand: FlowPredicateV1;
};
export interface WhatsAppTemplateFlowButtonConfigV1 {
    index?: string;
    flowToken?: string;
    flowData?: Record<string, unknown> | null;
}
export interface FlowResponseFieldMatchV1 {
    field: string;
    exists?: boolean;
    equals?: string | string[];
    contains?: string | string[];
}
export type FlowValueBindingV1 = {
    source: "literal";
    value: FlowLiteralV1;
} | {
    source: "variable";
    variableId: string;
};
export interface FlowInputValidationV1 {
    valueType: Exclude<FlowValueTypeV1, "json">;
    trim?: boolean;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    pattern?: string;
    allowedValues?: string[];
}
export interface FlowRetryPolicyV1 {
    maxAttempts: number;
    backoffMs: number;
}
export interface FlowWebhookResponseMappingV1 {
    jsonPointer: string;
    variableId: string;
    required: boolean;
}
export interface FlowWebhookBodyFieldV1 {
    field: string;
    value: FlowValueBindingV1;
    required?: boolean;
}
export interface FlowSubflowInputMappingV1 {
    targetVariableId: string;
    value: FlowValueBindingV1;
}
export interface FlowSubflowOutputMappingV1 {
    sourceVariableId: string;
    targetVariableId: string;
    required: boolean;
}
export interface FlowReplyOptionV1 {
    id: string;
    title: string;
}
export interface FlowInterfaceFieldV1 {
    variableId: string;
    required: boolean;
}
export interface FlowInterfaceV1 {
    inputs: FlowInterfaceFieldV1[];
    outputs: FlowInterfaceFieldV1[];
}
export interface FlowSpecialistPolicyV1 {
    businessGoal: string;
    allowedTools: string[];
    knowledgeSourceTypes: FlowSpecialistKnowledgeSourceTypeV1[];
    minimumConfidence?: number;
    onLowConfidence: FlowSpecialistLowConfidenceModeV1;
    approvalMode: FlowSpecialistApprovalModeV1;
    maxCustomerVisibleActions: 1;
}
export const FLOW_CONTACT_IDENTITY_KINDS_V1 = [
    "phone",
    "email",
    "ig_username",
    "bsuid",
    "external_id",
] as const;
export type FlowContactIdentityKindV1 = (typeof FLOW_CONTACT_IDENTITY_KINDS_V1)[number];
export type FlowEndpointPurposeV1 = "transactional" | "marketing";
export interface FlowEndpointFieldV1 {
    pointer: string;
    valueType: FlowValueTypeV1;
}
export interface FlowEndpointMappingV1 {
    pointer: string;
    variableId: string;
    required: boolean;
}
export interface FlowEndpointContactIdentityV1 {
    pointer: string;
    kind: FlowContactIdentityKindV1;
}
export type FlowTriggerConfigV1 = {
    type: "inbound_endpoint";
    channel: FlowConcreteChannelV1;
    purpose: FlowEndpointPurposeV1;
    fields: FlowEndpointFieldV1[];
    contactIdentities: FlowEndpointContactIdentityV1[];
    namePointer?: string;
    mappings: FlowEndpointMappingV1[];
    dedupeKeyPointer?: string;
} | {
    type: "inbound_message";
    channel?: FlowChannelV1;
    keywords?: string[];
    intents?: string[];
} | {
    type: "comment";
    channel?: "instagram";
    keywords?: string[];
    intents?: FlowCommentIntentV1[];
    mediaIds?: string[];
    posts?: FlowCommentPostsV1;
} | {
    type: "postback";
    channel?: FlowChannelV1;
    payloads?: string[];
} | {
    type: "flow_response";
    channel?: "whatsapp";
    flowTokens?: string[];
    requiredFields?: string[];
    fieldMatches?: FlowResponseFieldMatchV1[];
} | {
    type: "connector_event";
    channel: FlowConcreteChannelV1;
    connectorId: string;
    eventId: string;
} | {
    type: "scheduled";
    channel: FlowConcreteChannelV1;
    schedule: FlowScheduleV1;
    audienceId?: string;
} | {
    type: "agent_call";
    channel?: FlowChannelV1;
    useWhen: string;
    inputs: FlowAgentCallInputV1[];
} | {
    type: "agent_handoff";
    channel?: FlowChannelV1;
    fromAgentKeys: FlowHandoffFromAgentKeyV1[];
    useWhen: string;
    bulk?: boolean;
} | {
    type: "called";
    channel?: FlowChannelV1;
};
export type FlowCommentPostsV1 = "all" | string[];
export const FLOW_HANDOFF_FROM_AGENT_KEYS_V1 = ["sales", "support", "booking", "feedback"] as const;
export type FlowHandoffFromAgentKeyV1 = (typeof FLOW_HANDOFF_FROM_AGENT_KEYS_V1)[number];
export type FlowTimeOfDayV1 = string;
export type FlowScheduleV1 = {
    kind: "once";
    at: string;
} | {
    kind: "weekly";
    weekdays: number[];
    time: FlowTimeOfDayV1;
} | {
    kind: "contact_date";
    variableId: string;
    offsetDays: number;
    time: FlowTimeOfDayV1;
    yearly: boolean;
};
export interface FlowAgentCallInputV1 {
    variableId: string;
    description: string;
    required: boolean;
}
export type FlowWaitUntilV1 = {
    kind: "variable";
    variableId: string;
} | {
    kind: "weekday";
    weekday: number;
    time: FlowTimeOfDayV1;
} | {
    kind: "open";
};
export const FLOW_WAIT_EVENTS_V1 = ["paid", "ordered", "form_filled"] as const;
export type FlowWaitEventV1 = (typeof FLOW_WAIT_EVENTS_V1)[number];
export const FLOW_CONVERSION_EVENTS_V1 = ["purchase", "lead"] as const;
export type FlowConversionEventV1 = (typeof FLOW_CONVERSION_EVENTS_V1)[number];
export const FLOW_MCP_TOOL_EFFECTS_V1 = ["read", "write"] as const;
export type FlowMcpToolEffectV1 = (typeof FLOW_MCP_TOOL_EFFECTS_V1)[number];
export type FlowActionConfigV1 = {
    type: "send_reply";
    text: string;
    options?: FlowReplyOptionV1[];
} | {
    type: "route_node";
    node: string;
    specialistPolicy?: FlowSpecialistPolicyV1;
} | {
    type: "start_order";
} | {
    type: "handoff";
    reason?: string;
} | {
    type: "send_template";
    templateId: string;
    language?: string;
    purpose?: string;
    components?: unknown[] | null;
    flowButton?: WhatsAppTemplateFlowButtonConfigV1 | null;
} | {
    type: "send_whatsapp_flow";
    flowId: string;
    flowCta: string;
    flowAction?: "navigate" | "data_exchange";
    flowScreen?: string;
    flowToken?: string;
    flowData?: Record<string, unknown> | null;
    body?: string;
    footer?: string;
    purpose?: string;
} | {
    type: "reply_comment";
} | {
    type: "move_to_dm";
    text?: string;
} | {
    type: "collect_input";
    variableId: string;
    statusVariableId: string;
    prompt: string;
    retryPrompt: string;
    exhaustedReply?: string;
    maxAttempts: number;
    timeoutSeconds?: number;
    validation: FlowInputValidationV1;
    options?: FlowReplyOptionV1[];
    askVia?: "prompt" | "previous_message";
} | {
    type: "set_variable";
    variableId: string;
    value: FlowValueBindingV1;
} | {
    type: "webhook";
    endpointId: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path?: string;
    pathValues?: Record<string, FlowValueBindingV1>;
    headers?: Record<string, FlowValueBindingV1>;
    bodyFields?: FlowWebhookBodyFieldV1[];
    body?: FlowValueBindingV1;
    timeoutMs: number;
    retry: FlowRetryPolicyV1;
    responseMappings: FlowWebhookResponseMappingV1[];
    statusVariableId: string;
} | {
    type: "delay";
    durationSeconds: number;
    statusVariableId?: string;
} | {
    type: "subflow";
    flowId: string;
    versionId: string;
    inputMappings: FlowSubflowInputMappingV1[];
    outputMappings: FlowSubflowOutputMappingV1[];
    statusVariableId: string;
} | {
    type: "jump";
    targetNodeId: string;
    maxTimes: number;
} | {
    type: "send_products";
    text: string;
    productIds: string[];
} | {
    type: "send_link";
    text: string;
    buttonText: string;
    url: string;
} | {
    type: "request_location";
    prompt: string;
    variableId: string;
    statusVariableId: string;
    timeoutSeconds?: number;
} | {
    type: "ask_photo";
    prompt: string;
    variableId: string;
    statusVariableId: string;
    timeoutSeconds?: number;
} | {
    type: "tag";
    tagId: string;
} | {
    type: "untag";
    tagId: string;
} | {
    type: "note";
    text: string;
} | {
    type: "calculate";
    expression: string;
    variableId: string;
} | {
    type: "conversion";
    event: FlowConversionEventV1;
    valuePaise?: FlowValueBindingV1;
} | {
    type: "wait_until";
    until: FlowWaitUntilV1;
    statusVariableId?: string;
} | {
    type: "wait_for_event";
    event: FlowWaitEventV1;
    timeoutSeconds: number;
    statusVariableId: string;
    resultVariableId?: string;
    orderVariableId?: string;
} | {
    type: "open_closed";
    statusVariableId: string;
} | {
    type: "collect_address";
    prompt: string;
    variableId: string;
    statusVariableId: string;
    timeoutSeconds?: number;
} | {
    type: "request_payment";
    orderVariableId: string;
    timeoutSeconds: number;
    statusVariableId: string;
} | {
    type: "find_order";
    orderNumber?: FlowValueBindingV1;
    resultVariableId: string;
    statusVariableId: string;
} | {
    type: "connector_action";
    connectorId: string;
    actionId: string;
    inputs: Record<string, FlowValueBindingV1>;
    responseMappings: FlowWebhookResponseMappingV1[];
    statusVariableId: string;
} | {
    type: "mcp_tool_call";
    connectionId: string;
    toolName: string;
    inputSchemaHash: string;
    effect: FlowMcpToolEffectV1;
    askBeforeRun: boolean;
    inputs: Record<string, FlowValueBindingV1>;
    responseMappings: FlowWebhookResponseMappingV1[];
    timeoutMs?: number;
    statusVariableId: string;
};
export interface FlowPortV1 {
    id: string;
    direction: "input" | "output";
    kind: "control" | "value";
    valueType?: FlowValueTypeV1;
    cardinality: "one" | "many";
    required: boolean;
    outcome?: string;
    isDefault?: boolean;
}
export interface FlowNodeBaseV1 {
    id: string;
    label: string;
    ports: FlowPortV1[];
}
export interface FlowTriggerNodeV1 extends FlowNodeBaseV1 {
    kind: "trigger";
    config: FlowTriggerConfigV1;
}
export interface FlowActionNodeV1 extends FlowNodeBaseV1 {
    kind: "action";
    config: FlowActionConfigV1;
}
export interface FlowDecisionCaseV1 {
    portId: string;
    priority: number;
    when: FlowPredicateV1;
}
export interface FlowDecisionNodeV1 extends FlowNodeBaseV1 {
    kind: "decision";
    config: {
        cases: FlowDecisionCaseV1[];
        defaultPortId: string;
    };
}
export interface FlowTerminalNodeV1 extends FlowNodeBaseV1 {
    kind: "terminal";
    config: {
        outcomeId: string;
    };
}
export type FlowNodeV1 = FlowTriggerNodeV1 | FlowActionNodeV1 | FlowDecisionNodeV1 | FlowTerminalNodeV1;
export interface FlowEdgeV1 {
    id: string;
    kind: "control" | "value";
    source: {
        nodeId: string;
        portId: string;
    };
    target: {
        nodeId: string;
        portId: string;
    };
}
export interface FlowVariableDefinitionV1 {
    id: string;
    key: string;
    label: string;
    type: FlowValueTypeV1;
    scope: FlowVariableScopeV1;
    required: boolean;
    mutable: boolean;
    defaultValue?: FlowLiteralV1;
}
export interface FlowOutcomeV1 {
    id: string;
    kind: "success" | "handoff" | "stopped" | "failed";
    label: string;
}
export interface FlowPolicyV1 {
    approvalMode: FlowApprovalModeV1;
    allowedChannels: FlowConcreteChannelV1[];
    crossChannel: "forbid" | "require_explicit_opt_in";
    whatsappOutsideWindow: "block" | "approved_template_only";
    onUnhandledError: {
        mode: "stop" | "handoff";
        outcomeId: string;
    };
    limits: {
        maxNodeExecutions: number;
        maxBillableMessages?: number;
    };
    prerequisites: {
        tools: string[];
        providers: string[];
        templates: string[];
    };
}
export interface FlowDefinitionV1 {
    schemaVersion: typeof FLOW_DEFINITION_SCHEMA_V1;
    id: string;
    businessId: string;
    name: string;
    recipeKind: FlowRecipeKindV1;
    status: FlowRecipeStatusV1;
    version: number;
    channel: FlowChannelV1;
    nodes: FlowNodeV1[];
    edges: FlowEdgeV1[];
    variables: FlowVariableDefinitionV1[];
    outcomes: FlowOutcomeV1[];
    policy: FlowPolicyV1;
    interface?: FlowInterfaceV1;
}
