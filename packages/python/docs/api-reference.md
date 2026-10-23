# Python API reference

Generated from the reviewed shared OpenAPI contract. Both clients expose the same
resources; await I/O methods on `AsyncInsideDM` and `AsyncInsideDMPlatform`.

Arguments use snake_case typed dictionaries. Click a request type for its fields.
Every HTTP method returns `Result[T]` or `PageResult[T]`, with `.data` and `.meta`.
Collection iterators fetch lazily and accept `max_pages` and `max_items`.

[Usage, lifecycle and errors](../README.md) · [Webhooks](webhooks.md)

## InsideDM

| Method | Request arguments | Result data |
| --- | --- | --- |
| `workspace.get(**kwargs)` | [`BusinessWorkspaceGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessWorkspaceGetData`](../src/insidedm/_generated/models.py) |
| `contacts.list(**kwargs)` | [`BusinessContactsListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessContactsListData`](../src/insidedm/_generated/models.py) |
| `contacts.get(contact_id, **kwargs)` | [`BusinessContactsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessContactsGetData`](../src/insidedm/_generated/models.py) |
| `contacts.create(**kwargs)` | [`BusinessContactsCreateArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessContactsCreateData`](../src/insidedm/_generated/models.py) |
| `contacts.update(contact_id, **kwargs)` | [`BusinessContactsUpdateArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessContactsUpdateData`](../src/insidedm/_generated/models.py) |
| `contacts.tags.replace(contact_id, **kwargs)` | [`BusinessContactsTagsReplaceArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessContactsTagsReplaceData`](../src/insidedm/_generated/models.py) |
| `contacts.attributes.update(contact_id, **kwargs)` | [`BusinessContactsAttributesUpdateArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessContactsAttributesUpdateData`](../src/insidedm/_generated/models.py) |
| `contacts.fields.list(**kwargs)` | [`BusinessContactsFieldsListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessContactsFieldsListData`](../src/insidedm/_generated/models.py) |
| `flows.steps.list(**kwargs)` | [`BusinessFlowsStepsListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsStepsListData`](../src/insidedm/_generated/models.py) |
| `flows.blocks.list(**kwargs)` | [`BusinessFlowsBlocksListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsBlocksListData`](../src/insidedm/_generated/models.py) |
| `flows.blocks.get(flow_id, **kwargs)` | [`BusinessFlowsBlocksGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsBlocksGetData`](../src/insidedm/_generated/models.py) |
| `knowledge.runs.get(run_id, **kwargs)` | [`BusinessKnowledgeRunsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessKnowledgeRunsGetData`](../src/insidedm/_generated/models.py) |
| `knowledge.runs.list(**kwargs)` | [`BusinessKnowledgeRunsListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessKnowledgeRunsListData`](../src/insidedm/_generated/models.py) |
| `knowledge.sources.list(**kwargs)` | [`BusinessKnowledgeSourcesListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessKnowledgeSourcesListData`](../src/insidedm/_generated/models.py) |
| `knowledge.sections.list(**kwargs)` | [`BusinessKnowledgeSectionsListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessKnowledgeSectionsListData`](../src/insidedm/_generated/models.py) |
| `knowledge.sections.set_override(section_id, **kwargs)` | [`BusinessKnowledgeSectionsSetOverrideArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessKnowledgeSectionsSetOverrideData`](../src/insidedm/_generated/models.py) |
| `knowledge.sections.acknowledge_override(section_id, **kwargs)` | [`BusinessKnowledgeSectionsAcknowledgeOverrideArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessKnowledgeSectionsAcknowledgeOverrideData`](../src/insidedm/_generated/models.py) |
| `knowledge.sources.import_website(**kwargs)` | [`BusinessKnowledgeSourcesImportWebsiteArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessKnowledgeSourcesImportWebsiteData`](../src/insidedm/_generated/models.py) |
| `knowledge.sources.remove_website(**kwargs)` | [`BusinessKnowledgeSourcesRemoveWebsiteArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessKnowledgeSourcesRemoveWebsiteData`](../src/insidedm/_generated/models.py) |
| `knowledge.sources.remove(source_id, **kwargs)` | [`BusinessKnowledgeSourcesRemoveArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessKnowledgeSourcesRemoveData`](../src/insidedm/_generated/models.py) |
| `knowledge.get(**kwargs)` | [`BusinessKnowledgeGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessKnowledgeGetData`](../src/insidedm/_generated/models.py) |
| `loyalty.members.get(contact_id, **kwargs)` | [`BusinessLoyaltyMembersGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessLoyaltyMembersGetData`](../src/insidedm/_generated/models.py) |
| `contacts.fields.create(**kwargs)` | [`BusinessContactsFieldsCreateArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessContactsFieldsCreateData`](../src/insidedm/_generated/models.py) |
| `contacts.fields.archive(definition_id, **kwargs)` | [`BusinessContactsFieldsArchiveArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessContactsFieldsArchiveData`](../src/insidedm/_generated/models.py) |
| `contacts.fields.configure_memory(definition_id, **kwargs)` | [`BusinessContactsFieldsConfigureMemoryArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessContactsFieldsConfigureMemoryData`](../src/insidedm/_generated/models.py) |
| `conversations.list(**kwargs)` | [`BusinessConversationsListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConversationsListData`](../src/insidedm/_generated/models.py) |
| `conversations.get(conversation_id, **kwargs)` | [`BusinessConversationsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConversationsGetData`](../src/insidedm/_generated/models.py) |
| `conversations.messages.list(conversation_id, **kwargs)` | [`BusinessConversationsMessagesListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConversationsMessagesListData`](../src/insidedm/_generated/models.py) |
| `conversations.controls.get(conversation_id, **kwargs)` | [`BusinessConversationsControlsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConversationsControlsGetData`](../src/insidedm/_generated/models.py) |
| `conversations.controls.history(conversation_id, **kwargs)` | [`BusinessConversationsControlsHistoryArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConversationsControlsHistoryData`](../src/insidedm/_generated/models.py) |
| `conversations.controls.take_over(conversation_id, **kwargs)` | [`BusinessConversationsControlsTakeOverArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConversationsControlsTakeOverData`](../src/insidedm/_generated/models.py) |
| `conversations.controls.assign(conversation_id, **kwargs)` | [`BusinessConversationsControlsAssignArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConversationsControlsAssignData`](../src/insidedm/_generated/models.py) |
| `conversations.controls.snooze(conversation_id, **kwargs)` | [`BusinessConversationsControlsSnoozeArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConversationsControlsSnoozeData`](../src/insidedm/_generated/models.py) |
| `conversations.controls.clear_snooze(conversation_id, **kwargs)` | [`BusinessConversationsControlsClearSnoozeArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConversationsControlsClearSnoozeData`](../src/insidedm/_generated/models.py) |
| `conversations.assignees.list(**kwargs)` | [`BusinessConversationsAssigneesListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConversationsAssigneesListData`](../src/insidedm/_generated/models.py) |
| `messages.get(message_id, **kwargs)` | [`BusinessMessagesGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessMessagesGetData`](../src/insidedm/_generated/models.py) |
| `messages.send(**kwargs)` | [`BusinessMessagesSendArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessMessagesSendData`](../src/insidedm/_generated/models.py) |
| `messages.preview(**kwargs)` | [`BusinessMessagesPreviewArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessMessagesPreviewData`](../src/insidedm/_generated/models.py) |
| `messages.prepare(**kwargs)` | [`BusinessMessagesPrepareArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessMessagesPrepareData`](../src/insidedm/_generated/models.py) |
| `messages.preparations.get(preparation_id, **kwargs)` | [`BusinessMessagesPreparationsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessMessagesPreparationsGetData`](../src/insidedm/_generated/models.py) |
| `messages.preparations.apply(preparation_id, **kwargs)` | [`BusinessMessagesPreparationsApplyArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessMessagesPreparationsApplyData`](../src/insidedm/_generated/models.py) |
| `orders.list(**kwargs)` | [`BusinessOrdersListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessOrdersListData`](../src/insidedm/_generated/models.py) |
| `orders.get(order_id, **kwargs)` | [`BusinessOrdersGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessOrdersGetData`](../src/insidedm/_generated/models.py) |
| `orders.shipments.list(order_id, **kwargs)` | [`BusinessOrdersShipmentsListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessOrdersShipmentsListData`](../src/insidedm/_generated/models.py) |
| `shipments.get(shipment_id, **kwargs)` | [`BusinessShipmentsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessShipmentsGetData`](../src/insidedm/_generated/models.py) |
| `templates.list(**kwargs)` | [`BusinessTemplatesListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessTemplatesListData`](../src/insidedm/_generated/models.py) |
| `messaging.get_readiness(**kwargs)` | [`BusinessMessagingGetReadinessArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessMessagingGetReadinessData`](../src/insidedm/_generated/models.py) |
| `messaging.get_configuration(**kwargs)` | [`BusinessMessagingGetConfigurationArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessMessagingGetConfigurationData`](../src/insidedm/_generated/models.py) |
| `messaging.update_configuration(**kwargs)` | [`BusinessMessagingUpdateConfigurationArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessMessagingUpdateConfigurationData`](../src/insidedm/_generated/models.py) |
| `messaging.preparations.create(**kwargs)` | [`BusinessMessagingPreparationsCreateArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessMessagingPreparationsCreateData`](../src/insidedm/_generated/models.py) |
| `messaging.preparations.get(preparation_id, **kwargs)` | [`BusinessMessagingPreparationsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessMessagingPreparationsGetData`](../src/insidedm/_generated/models.py) |
| `messaging.preparations.apply(preparation_id, **kwargs)` | [`BusinessMessagingPreparationsApplyArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessMessagingPreparationsApplyData`](../src/insidedm/_generated/models.py) |
| `consents.get(**kwargs)` | [`BusinessConsentsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConsentsGetData`](../src/insidedm/_generated/models.py) |
| `consents.withdraw(**kwargs)` | [`BusinessConsentsWithdrawArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConsentsWithdrawData`](../src/insidedm/_generated/models.py) |
| `consents.record_marketing_opt_in(**kwargs)` | [`BusinessConsentsRecordMarketingOptInArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessConsentsRecordMarketingOptInData`](../src/insidedm/_generated/models.py) |
| `operations.get(operation_id, **kwargs)` | [`BusinessOperationsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessOperationsGetData`](../src/insidedm/_generated/models.py) |
| `operations.lookup(**kwargs)` | [`BusinessOperationsLookupArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessOperationsLookupData`](../src/insidedm/_generated/models.py) |
| `operations.cancel(operation_id, **kwargs)` | [`BusinessOperationsCancelArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessOperationsCancelData`](../src/insidedm/_generated/models.py) |
| `events.publish(**kwargs)` | [`BusinessEventsPublishArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessEventsPublishData`](../src/insidedm/_generated/models.py) |
| `events.bindings.list(**kwargs)` | [`BusinessEventsBindingsListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessEventsBindingsListData`](../src/insidedm/_generated/models.py) |
| `flows.runs.get(run_id, **kwargs)` | [`BusinessFlowsRunsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsRunsGetData`](../src/insidedm/_generated/models.py) |
| `flows.runs.list(**kwargs)` | [`BusinessFlowsRunsListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsRunsListData`](../src/insidedm/_generated/models.py) |
| `flows.regressions.list_suites(recipe_id, **kwargs)` | [`BusinessFlowsRegressionsListSuitesArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsRegressionsListSuitesData`](../src/insidedm/_generated/models.py) |
| `flows.governance.get(recipe_id, **kwargs)` | [`BusinessFlowsGovernanceGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsGovernanceGetData`](../src/insidedm/_generated/models.py) |
| `flows.regressions.get_configuration(recipe_id, **kwargs)` | [`BusinessFlowsRegressionsGetConfigurationArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsRegressionsGetConfigurationData`](../src/insidedm/_generated/models.py) |
| `flows.regressions.get_suite(recipe_id, **kwargs)` | [`BusinessFlowsRegressionsGetSuiteArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsRegressionsGetSuiteData`](../src/insidedm/_generated/models.py) |
| `flows.regressions.run(recipe_id, **kwargs)` | [`BusinessFlowsRegressionsRunArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsRegressionsRunData`](../src/insidedm/_generated/models.py) |
| `flows.regressions.get(recipe_id, run_id, **kwargs)` | [`BusinessFlowsRegressionsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsRegressionsGetData`](../src/insidedm/_generated/models.py) |
| `flows.templates.catalog(**kwargs)` | [`BusinessFlowsTemplatesCatalogArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsTemplatesCatalogData`](../src/insidedm/_generated/models.py) |
| `flows.templates.import_(pack_id, **kwargs)` | [`BusinessFlowsTemplatesImportArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsTemplatesImportData`](../src/insidedm/_generated/models.py) |
| `flows.deployments.get(recipe_id, **kwargs)` | [`BusinessFlowsDeploymentsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsDeploymentsGetData`](../src/insidedm/_generated/models.py) |
| `flows.drafts.get(recipe_id, **kwargs)` | [`BusinessFlowsDraftsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsDraftsGetData`](../src/insidedm/_generated/models.py) |
| `flows.deployments.list(**kwargs)` | [`BusinessFlowsDeploymentsListArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsDeploymentsListData`](../src/insidedm/_generated/models.py) |
| `flows.deployments.get_publication_request(recipe_id, release_request_id, **kwargs)` | [`BusinessFlowsDeploymentsGetPublicationRequestArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsDeploymentsGetPublicationRequestData`](../src/insidedm/_generated/models.py) |
| `flows.deployments.withdraw_publication(recipe_id, release_request_id, **kwargs)` | [`BusinessFlowsDeploymentsWithdrawPublicationArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessFlowsDeploymentsWithdrawPublicationData`](../src/insidedm/_generated/models.py) |
| `analytics.get(**kwargs)` | [`BusinessAnalyticsGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessAnalyticsGetData`](../src/insidedm/_generated/models.py) |
| `usage.get(**kwargs)` | [`BusinessUsageGetArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessUsageGetData`](../src/insidedm/_generated/models.py) |
| `usage.get_limits(**kwargs)` | [`BusinessUsageGetLimitsArguments`](../src/insidedm/_generated/inputs.py) | [`BusinessUsageGetLimitsData`](../src/insidedm/_generated/models.py) |

## InsideDMPlatform

| Method | Request arguments | Result data |
| --- | --- | --- |
| `self.get(**kwargs)` | [`PlatformSelfGetArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSelfGetData`](../src/insidedm/_generated/models.py) |
| `businesses.list(**kwargs)` | [`PlatformBusinessesListArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformBusinessesListData`](../src/insidedm/_generated/models.py) |
| `businesses.get(business_id, **kwargs)` | [`PlatformBusinessesGetArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformBusinessesGetData`](../src/insidedm/_generated/models.py) |
| `businesses.create(**kwargs)` | [`PlatformBusinessesCreateArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformBusinessesCreateData`](../src/insidedm/_generated/models.py) |
| `business_creations.get(creation_id, **kwargs)` | [`PlatformBusinessCreationsGetArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformBusinessCreationsGetData`](../src/insidedm/_generated/models.py) |
| `business_creations.renew_claim_link(creation_id, **kwargs)` | [`PlatformBusinessCreationsRenewClaimLinkArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformBusinessCreationsRenewClaimLinkData`](../src/insidedm/_generated/models.py) |
| `installation_requests.create(**kwargs)` | [`PlatformInstallationRequestsCreateArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformInstallationRequestsCreateData`](../src/insidedm/_generated/models.py) |
| `installation_requests.get(request_id, **kwargs)` | [`PlatformInstallationRequestsGetArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformInstallationRequestsGetData`](../src/insidedm/_generated/models.py) |
| `installations.get(installation_id, **kwargs)` | [`PlatformInstallationsGetArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformInstallationsGetData`](../src/insidedm/_generated/models.py) |
| `installations.revoke(installation_id, **kwargs)` | [`PlatformInstallationsRevokeArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformInstallationsRevokeData`](../src/insidedm/_generated/models.py) |
| `onboarding.create(**kwargs)` | [`PlatformOnboardingCreateArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformOnboardingCreateData`](../src/insidedm/_generated/models.py) |
| `onboarding.get(session_id, **kwargs)` | [`PlatformOnboardingGetArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformOnboardingGetData`](../src/insidedm/_generated/models.py) |
| `usage.get(business_id, **kwargs)` | [`PlatformUsageGetArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformUsageGetData`](../src/insidedm/_generated/models.py) |
| `blueprints.list_templates(**kwargs)` | [`PlatformBlueprintsListTemplatesArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformBlueprintsListTemplatesData`](../src/insidedm/_generated/models.py) |
| `blueprints.create_version(**kwargs)` | [`PlatformBlueprintsCreateVersionArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformBlueprintsCreateVersionData`](../src/insidedm/_generated/models.py) |
| `blueprints.list_versions(blueprint_key, **kwargs)` | [`PlatformBlueprintsListVersionsArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformBlueprintsListVersionsData`](../src/insidedm/_generated/models.py) |
| `blueprints.get_version(blueprint_key, version, **kwargs)` | [`PlatformBlueprintsGetVersionArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformBlueprintsGetVersionData`](../src/insidedm/_generated/models.py) |
| `subscriptions.list(**kwargs)` | [`PlatformSubscriptionsListArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsListData`](../src/insidedm/_generated/models.py) |
| `subscriptions.get(subscription_id, **kwargs)` | [`PlatformSubscriptionsGetArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsGetData`](../src/insidedm/_generated/models.py) |
| `subscriptions.create(**kwargs)` | [`PlatformSubscriptionsCreateArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsCreateData`](../src/insidedm/_generated/models.py) |
| `subscriptions.update(subscription_id, **kwargs)` | [`PlatformSubscriptionsUpdateArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsUpdateData`](../src/insidedm/_generated/models.py) |
| `subscriptions.verify(subscription_id, **kwargs)` | [`PlatformSubscriptionsVerifyArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsVerifyData`](../src/insidedm/_generated/models.py) |
| `subscriptions.activate(subscription_id, **kwargs)` | [`PlatformSubscriptionsActivateArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsActivateData`](../src/insidedm/_generated/models.py) |
| `subscriptions.pause(subscription_id, **kwargs)` | [`PlatformSubscriptionsPauseArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsPauseData`](../src/insidedm/_generated/models.py) |
| `subscriptions.disable(subscription_id, **kwargs)` | [`PlatformSubscriptionsDisableArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsDisableData`](../src/insidedm/_generated/models.py) |
| `subscriptions.rotate_secret(subscription_id, **kwargs)` | [`PlatformSubscriptionsRotateSecretArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsRotateSecretData`](../src/insidedm/_generated/models.py) |
| `subscriptions.businesses.get_health(subscription_id, business_id, **kwargs)` | [`PlatformSubscriptionsBusinessesGetHealthArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsBusinessesGetHealthData`](../src/insidedm/_generated/models.py) |
| `subscriptions.businesses.recover(subscription_id, business_id, **kwargs)` | [`PlatformSubscriptionsBusinessesRecoverArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsBusinessesRecoverData`](../src/insidedm/_generated/models.py) |
| `subscriptions.businesses.deliveries.list(subscription_id, business_id, **kwargs)` | [`PlatformSubscriptionsBusinessesDeliveriesListArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsBusinessesDeliveriesListData`](../src/insidedm/_generated/models.py) |
| `subscriptions.businesses.deliveries.get(subscription_id, business_id, delivery_id, **kwargs)` | [`PlatformSubscriptionsBusinessesDeliveriesGetArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsBusinessesDeliveriesGetData`](../src/insidedm/_generated/models.py) |
| `subscriptions.businesses.deliveries.replay(subscription_id, business_id, delivery_id, **kwargs)` | [`PlatformSubscriptionsBusinessesDeliveriesReplayArguments`](../src/insidedm/_generated/inputs.py) | [`PlatformSubscriptionsBusinessesDeliveriesReplayData`](../src/insidedm/_generated/models.py) |

## Saved-source helpers

These helpers capture saved typed models, then call the same existing flow APIs:

| Method | Behavior |
| --- | --- |
| `client.flows.drafts.save(draft, definition, **kwargs)` | Save a complete native definition using both pins from an available saved draft. No hidden refresh or merge. |
| `client.flows.drafts.save(recipe_id, definition, expected_deployment_revision=revision, expected_draft_revision=revision, **kwargs)` | Save with explicitly observed pins. Matching retries recover the original receipt; read again for current state. |
| `client.flows.blueprints.deploy(blueprint, **kwargs)` | Import saved version into a business-owned draft. |
| `client.flows.deployments.preview_update(recipe_id, blueprint, **kwargs)` | Read drift and proposed changes from a saved version or exact application/key/version/digest reference. |
| `client.flows.deployments.apply_update(preview, **kwargs)` | Apply the saved revision-pinned preview to its own business draft. |
| `client.flows.deployments.request_publication(deployment, **kwargs)` | Request native human review of the exact observed draft, including customizations. |
| `client.flows.simulate(deployment, **kwargs)` | Evaluate the saved draft with native readiness rules and record successful path coverage without provider actions. |
| `client.flows.simulate(recipe_id, expected_revision=revision, **kwargs)` | Evaluate an explicitly observed draft revision with optional variables and path selection. |
| `client.flows.regressions.save_suite(suite, **changes)` | Edit a saved suite with its own business, flow and revision; preserve fields not changed. |
| `client.flows.regressions.save_suite(recipe_id, **kwargs)` | Create with null suite ID/revision or replace an explicitly observed revision. |
| `platform.for_business(business_id, scopes=None)` | Select a merchant-approved business client; exchange credentials lazily. |
| `platform.blueprints.rollouts.preview(blueprint, clients, **kwargs)` | Read up to 25 explicit business/flow pairs into a saved plan. |
| `platform.blueprints.rollouts.apply(plan, **kwargs)` | Lazily yield serial draft outcomes with stable restart keys. |

Draft creation and update never publish a flow. Persist source and plans with
`model_dump_json(by_alias=True, exclude_unset=True)`. Apply validates saved identity
and revision pins before writing; obtain a new preview after a revision conflict.

An unavailable native draft can be explicitly repaired with known valid replacement content and its positive pins. The saved-draft helper requires an available model. Unsupported builder formats are never converted implicitly.

See `insidedm.types.inputs`, `insidedm.types.responses` and rollout types in
`insidedm.types`. Platform access requires approved application permissions and
merchant authorization. Partner onboarding and deployment guides are distributed
separately to approved partners.
