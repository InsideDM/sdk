# Generated from the reviewed public contract. Do not edit.
from __future__ import annotations
from typing import Unpack, Iterator, AsyncIterator
from . import models, inputs
from .._models import Result, PageResult
from .._resources import SyncResource, AsyncResource

class AsyncBusinessContactsAttributes(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def update(self, contact_id: str, **kwargs: Unpack[inputs.BusinessContactsAttributesUpdateArguments]) -> Result[models.BusinessContactsAttributesUpdateData]:
        'Update declared custom fields on a contact'
        return await self._invoke('business.contacts.attributes.update', {'contactId': contact_id}, kwargs)
class AsyncBusinessContactsFields(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list(self, **kwargs: Unpack[inputs.BusinessContactsFieldsListArguments]) -> Result[models.BusinessContactsFieldsListData]:
        'Discover configured custom contact fields'
        return await self._invoke('business.contacts.fields.list', {}, kwargs)

    async def create(self, **kwargs: Unpack[inputs.BusinessContactsFieldsCreateArguments]) -> Result[models.BusinessContactsFieldsCreateData]:
        'Create a custom contact field using the native configuration owner'
        return await self._invoke('business.contacts.fields.create', {}, kwargs)

    async def archive(self, definition_id: str, **kwargs: Unpack[inputs.BusinessContactsFieldsArchiveArguments]) -> Result[models.BusinessContactsFieldsArchiveData]:
        'Archive a custom field at an observed native configuration version'
        return await self._invoke('business.contacts.fields.archive', {'definitionId': definition_id}, kwargs)

    async def configure_memory(self, definition_id: str, **kwargs: Unpack[inputs.BusinessContactsFieldsConfigureMemoryArguments]) -> Result[models.BusinessContactsFieldsConfigureMemoryData]:
        "Configure a custom field's agent memory at an observed version"
        return await self._invoke('business.contacts.fields.configure_memory', {'definitionId': definition_id}, kwargs)
class AsyncBusinessContactsTags(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def replace(self, contact_id: str, **kwargs: Unpack[inputs.BusinessContactsTagsReplaceArguments]) -> Result[models.BusinessContactsTagsReplaceData]:
        "Replace a contact's complete tag list"
        return await self._invoke('business.contacts.tags.replace', {'contactId': contact_id}, kwargs)
class AsyncBusinessConversationsAssignees(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list(self, **kwargs: Unpack[inputs.BusinessConversationsAssigneesListArguments]) -> PageResult[models.BusinessConversationsAssigneesListData]:
        'Discover active native conversation-assignment candidates'
        return await self._invoke('business.conversations.assignees.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessConversationsAssigneesListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessConversationsAssigneesListData]]:
        return self._iter_pages('business.conversations.assignees.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessConversationsAssigneesListIteratorArguments]) -> AsyncIterator[models.BusinessConversationsAssigneesListData]:
        return self._iter_items('business.conversations.assignees.list', {}, kwargs)
class AsyncBusinessConversationsControls(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsControlsGetArguments]) -> Result[models.BusinessConversationsControlsGetData]:
        'Inspect native conversation control or its bounded audit history'
        return await self._invoke('business.conversations.controls.get', {'conversationId': conversation_id}, kwargs)

    async def history(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsControlsHistoryArguments]) -> Result[models.BusinessConversationsControlsHistoryData]:
        'Inspect native conversation control or its bounded audit history'
        return await self._invoke('business.conversations.controls.history', {'conversationId': conversation_id}, kwargs)

    async def take_over(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsControlsTakeOverArguments]) -> Result[models.BusinessConversationsControlsTakeOverData]:
        'Change native conversation control as the actual connected user'
        return await self._invoke('business.conversations.controls.take_over', {'conversationId': conversation_id}, kwargs)

    async def assign(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsControlsAssignArguments]) -> Result[models.BusinessConversationsControlsAssignData]:
        'Change native conversation control as the actual connected user'
        return await self._invoke('business.conversations.controls.assign', {'conversationId': conversation_id}, kwargs)

    async def snooze(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsControlsSnoozeArguments]) -> Result[models.BusinessConversationsControlsSnoozeData]:
        'Change native conversation control as the actual connected user'
        return await self._invoke('business.conversations.controls.snooze', {'conversationId': conversation_id}, kwargs)

    async def clear_snooze(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsControlsClearSnoozeArguments]) -> Result[models.BusinessConversationsControlsClearSnoozeData]:
        'Change native conversation control as the actual connected user'
        return await self._invoke('business.conversations.controls.clear_snooze', {'conversationId': conversation_id}, kwargs)
class AsyncBusinessConversationsMessages(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsMessagesListArguments]) -> PageResult[models.BusinessConversationsMessagesListData]:
        "A conversation's messages, newest first"
        return await self._invoke('business.conversations.messages.list', {'conversationId': conversation_id}, kwargs)

    def iter_pages(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsMessagesListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessConversationsMessagesListData]]:
        return self._iter_pages('business.conversations.messages.list', {'conversationId': conversation_id}, kwargs)

    def iter_items(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsMessagesListIteratorArguments]) -> AsyncIterator[models.BusinessConversationsMessagesListData]:
        return self._iter_items('business.conversations.messages.list', {'conversationId': conversation_id}, kwargs)
class AsyncBusinessEventsBindings(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list(self, **kwargs: Unpack[inputs.BusinessEventsBindingsListArguments]) -> PageResult[models.BusinessEventsBindingsListData]:
        'Discover active published from-system flows and input requirements'
        return await self._invoke('business.events.bindings.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessEventsBindingsListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessEventsBindingsListData]]:
        return self._iter_pages('business.events.bindings.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessEventsBindingsListIteratorArguments]) -> AsyncIterator[models.BusinessEventsBindingsListData]:
        return self._iter_items('business.events.bindings.list', {}, kwargs)
class AsyncBusinessFlowsBlocks(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list(self, **kwargs: Unpack[inputs.BusinessFlowsBlocksListArguments]) -> PageResult[models.BusinessFlowsBlocksListData]:
        'Discover saved call and MCP block version references'
        return await self._invoke('business.flows.blocks.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessFlowsBlocksListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessFlowsBlocksListData]]:
        return self._iter_pages('business.flows.blocks.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessFlowsBlocksListIteratorArguments]) -> AsyncIterator[models.BusinessFlowsBlocksListData]:
        return self._iter_items('business.flows.blocks.list', {}, kwargs)

    async def get(self, flow_id: str, **kwargs: Unpack[inputs.BusinessFlowsBlocksGetArguments]) -> Result[models.BusinessFlowsBlocksGetData]:
        "Read an exact saved connector version's declared input/output interface"
        return await self._invoke('business.flows.blocks.get', {'flowId': flow_id}, kwargs)
class AsyncBusinessFlowsDeployments(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsDeploymentsGetArguments]) -> Result[models.BusinessFlowsDeploymentsGetData]:
        'Read managed import origin or the valid native draft definition'
        return await self._invoke('business.flows.deployments.get', {'recipeId': recipe_id}, kwargs)

    async def list(self, **kwargs: Unpack[inputs.BusinessFlowsDeploymentsListArguments]) -> Result[models.BusinessFlowsDeploymentsListData]:
        'Discover versioned templates, endpoint references or managed deployments'
        return await self._invoke('business.flows.deployments.list', {}, kwargs)

    async def _preview_update(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsDeploymentsPreviewUpdateArguments]) -> Result[models.BusinessFlowsDeploymentsPreviewUpdateData]:
        'Preview a managed blueprint update while preserving client overrides'
        return await self._invoke('business.flows.deployments._preview_update', {'recipeId': recipe_id}, kwargs)

    async def _apply_update(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsDeploymentsApplyUpdateArguments]) -> Result[models.BusinessFlowsDeploymentsApplyUpdateData]:
        'Save a managed flow draft or apply a reviewed blueprint update'
        return await self._invoke('business.flows.deployments._apply_update', {'recipeId': recipe_id}, kwargs)

    async def _request_publication(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsDeploymentsRequestPublicationArguments]) -> Result[models.BusinessFlowsDeploymentsRequestPublicationData]:
        "Submit this integration's exact observed managed draft for native human publication"
        return await self._invoke('business.flows.deployments._request_publication', {'recipeId': recipe_id}, kwargs)

    async def get_publication_request(self, recipe_id: str, release_request_id: str, **kwargs: Unpack[inputs.BusinessFlowsDeploymentsGetPublicationRequestArguments]) -> Result[models.BusinessFlowsDeploymentsGetPublicationRequestData]:
        "Observe this integration's managed publication request"
        return await self._invoke('business.flows.deployments.get_publication_request', {'recipeId': recipe_id, 'releaseRequestId': release_request_id}, kwargs)

    async def withdraw_publication(self, recipe_id: str, release_request_id: str, **kwargs: Unpack[inputs.BusinessFlowsDeploymentsWithdrawPublicationArguments]) -> Result[models.BusinessFlowsDeploymentsWithdrawPublicationData]:
        "Withdraw this integration's unpublished release request"
        return await self._invoke('business.flows.deployments.withdraw_publication', {'recipeId': recipe_id, 'releaseRequestId': release_request_id}, kwargs)
class AsyncBusinessFlowsDrafts(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsDraftsGetArguments]) -> Result[models.BusinessFlowsDraftsGetData]:
        'Read managed import origin or the valid native draft definition'
        return await self._invoke('business.flows.drafts.get', {'recipeId': recipe_id}, kwargs)

    async def _save(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsDraftsSaveArguments]) -> Result[models.BusinessFlowsDraftsSaveData]:
        'Save a managed flow draft or apply a reviewed blueprint update'
        return await self._invoke('business.flows.drafts._save', {'recipeId': recipe_id}, kwargs)
class AsyncBusinessFlowsGovernance(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsGovernanceGetArguments]) -> Result[models.BusinessFlowsGovernanceGetData]:
        'Read the native approval and regression policy for a managed flow'
        return await self._invoke('business.flows.governance.get', {'recipeId': recipe_id}, kwargs)
class AsyncBusinessFlowsRegressions(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list_suites(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsRegressionsListSuitesArguments]) -> Result[models.BusinessFlowsRegressionsListSuitesData]:
        'Inspect managed regression configuration or release-bound evidence'
        return await self._invoke('business.flows.regressions.list_suites', {'recipeId': recipe_id}, kwargs)

    async def get_configuration(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsRegressionsGetConfigurationArguments]) -> Result[models.BusinessFlowsRegressionsGetConfigurationData]:
        'Inspect managed regression configuration or release-bound evidence'
        return await self._invoke('business.flows.regressions.get_configuration', {'recipeId': recipe_id}, kwargs)

    async def get_suite(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsRegressionsGetSuiteArguments]) -> Result[models.BusinessFlowsRegressionsGetSuiteData]:
        'Inspect managed regression configuration or release-bound evidence'
        return await self._invoke('business.flows.regressions.get_suite', {'recipeId': recipe_id}, kwargs)

    async def _save_suite(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsRegressionsSaveSuiteArguments]) -> Result[models.BusinessFlowsRegressionsSaveSuiteData]:
        'Create, update or archive a native regression suite'
        return await self._invoke('business.flows.regressions._save_suite', {'recipeId': recipe_id}, kwargs)

    async def run(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsRegressionsRunArguments]) -> Result[models.BusinessFlowsRegressionsRunData]:
        'Evaluate one revision-pinned native suite against the retained release candidate'
        return await self._invoke('business.flows.regressions.run', {'recipeId': recipe_id}, kwargs)

    async def get(self, recipe_id: str, run_id: str, **kwargs: Unpack[inputs.BusinessFlowsRegressionsGetArguments]) -> Result[models.BusinessFlowsRegressionsGetData]:
        'Recover the native result of a release-bound regression run'
        return await self._invoke('business.flows.regressions.get', {'recipeId': recipe_id, 'runId': run_id}, kwargs)
class AsyncBusinessFlowsRuns(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, run_id: str, **kwargs: Unpack[inputs.BusinessFlowsRunsGetArguments]) -> Result[models.BusinessFlowsRunsGetData]:
        'Read permitted native flow execution status'
        return await self._invoke('business.flows.runs.get', {'runId': run_id}, kwargs)

    async def list(self, **kwargs: Unpack[inputs.BusinessFlowsRunsListArguments]) -> PageResult[models.BusinessFlowsRunsListData]:
        'List recent native flow executions'
        return await self._invoke('business.flows.runs.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessFlowsRunsListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessFlowsRunsListData]]:
        return self._iter_pages('business.flows.runs.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessFlowsRunsListIteratorArguments]) -> AsyncIterator[models.BusinessFlowsRunsListData]:
        return self._iter_items('business.flows.runs.list', {}, kwargs)
class AsyncBusinessFlowsSteps(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list(self, **kwargs: Unpack[inputs.BusinessFlowsStepsListArguments]) -> Result[models.BusinessFlowsStepsListData]:
        'Discover native built-in flow steps and bundles'
        return await self._invoke('business.flows.steps.list', {}, kwargs)
class AsyncBusinessFlowsTemplates(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def catalog(self, **kwargs: Unpack[inputs.BusinessFlowsTemplatesCatalogArguments]) -> Result[models.BusinessFlowsTemplatesCatalogData]:
        'Discover versioned templates, endpoint references or managed deployments'
        return await self._invoke('business.flows.templates.catalog', {}, kwargs)

    async def import_(self, pack_id: str, **kwargs: Unpack[inputs.BusinessFlowsTemplatesImportArguments]) -> Result[models.BusinessFlowsTemplatesImportData]:
        'Create a client-owned draft from an exact flow template version'
        return await self._invoke('business.flows.templates.import_', {'packId': pack_id}, kwargs)
class AsyncBusinessKnowledgeRuns(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, run_id: str, **kwargs: Unpack[inputs.BusinessKnowledgeRunsGetArguments]) -> Result[models.BusinessKnowledgeRunsGetData]:
        'Inspect one native website-indexing execution'
        return await self._invoke('business.knowledge.runs.get', {'runId': run_id}, kwargs)

    async def list(self, **kwargs: Unpack[inputs.BusinessKnowledgeRunsListArguments]) -> PageResult[models.BusinessKnowledgeRunsListData]:
        'Discover native website-indexing execution progress'
        return await self._invoke('business.knowledge.runs.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessKnowledgeRunsListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessKnowledgeRunsListData]]:
        return self._iter_pages('business.knowledge.runs.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessKnowledgeRunsListIteratorArguments]) -> AsyncIterator[models.BusinessKnowledgeRunsListData]:
        return self._iter_items('business.knowledge.runs.list', {}, kwargs)
class AsyncBusinessKnowledgeSections(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list(self, **kwargs: Unpack[inputs.BusinessKnowledgeSectionsListArguments]) -> PageResult[models.BusinessKnowledgeSectionsListData]:
        'Read current generated knowledge and merchant corrections'
        return await self._invoke('business.knowledge.sections.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessKnowledgeSectionsListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessKnowledgeSectionsListData]]:
        return self._iter_pages('business.knowledge.sections.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessKnowledgeSectionsListIteratorArguments]) -> AsyncIterator[models.BusinessKnowledgeSectionsListData]:
        return self._iter_items('business.knowledge.sections.list', {}, kwargs)

    async def set_override(self, section_id: str, **kwargs: Unpack[inputs.BusinessKnowledgeSectionsSetOverrideArguments]) -> Result[models.BusinessKnowledgeSectionsSetOverrideData]:
        'Set or clear a verbatim knowledge correction'
        return await self._invoke('business.knowledge.sections.set_override', {'sectionId': section_id}, kwargs)

    async def acknowledge_override(self, section_id: str, **kwargs: Unpack[inputs.BusinessKnowledgeSectionsAcknowledgeOverrideArguments]) -> Result[models.BusinessKnowledgeSectionsAcknowledgeOverrideData]:
        'Keep a correction and acknowledge the current generated change'
        return await self._invoke('business.knowledge.sections.acknowledge_override', {'sectionId': section_id}, kwargs)
class AsyncBusinessKnowledgeSources(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list(self, **kwargs: Unpack[inputs.BusinessKnowledgeSourcesListArguments]) -> PageResult[models.BusinessKnowledgeSourcesListData]:
        'Discover registered knowledge sources and removal state'
        return await self._invoke('business.knowledge.sources.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessKnowledgeSourcesListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessKnowledgeSourcesListData]]:
        return self._iter_pages('business.knowledge.sources.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessKnowledgeSourcesListIteratorArguments]) -> AsyncIterator[models.BusinessKnowledgeSourcesListData]:
        return self._iter_items('business.knowledge.sources.list', {}, kwargs)

    async def import_website(self, **kwargs: Unpack[inputs.BusinessKnowledgeSourcesImportWebsiteArguments]) -> Result[models.BusinessKnowledgeSourcesImportWebsiteData]:
        'Import or refresh website knowledge using the native ingestion owner'
        return await self._invoke('business.knowledge.sources.import_website', {}, kwargs)

    async def remove_website(self, **kwargs: Unpack[inputs.BusinessKnowledgeSourcesRemoveWebsiteArguments]) -> Result[models.BusinessKnowledgeSourcesRemoveWebsiteData]:
        'Remove website knowledge and cancel its pending imports'
        return await self._invoke('business.knowledge.sources.remove_website', {}, kwargs)

    async def remove(self, source_id: str, **kwargs: Unpack[inputs.BusinessKnowledgeSourcesRemoveArguments]) -> Result[models.BusinessKnowledgeSourcesRemoveData]:
        'Remove a registered note, document or website from knowledge'
        return await self._invoke('business.knowledge.sources.remove', {'sourceId': source_id}, kwargs)
class AsyncBusinessLoyaltyMembers(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, contact_id: str, **kwargs: Unpack[inputs.BusinessLoyaltyMembersGetArguments]) -> Result[models.BusinessLoyaltyMembersGetData]:
        'Read current loyalty membership and wallet balances'
        return await self._invoke('business.loyalty.members.get', {'contactId': contact_id}, kwargs)
class AsyncBusinessMessagesPreparations(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, preparation_id: str, **kwargs: Unpack[inputs.BusinessMessagesPreparationsGetArguments]) -> Result[models.BusinessMessagesPreparationsGetData]:
        'Read the original preparation and accepted operation'
        return await self._invoke('business.messages.preparations.get', {'preparationId': preparation_id}, kwargs)

    async def apply(self, preparation_id: str, **kwargs: Unpack[inputs.BusinessMessagesPreparationsApplyArguments]) -> Result[models.BusinessMessagesPreparationsApplyData]:
        'Apply the exact natively reviewed notification once'
        return await self._invoke('business.messages.preparations.apply', {'preparationId': preparation_id}, kwargs)
class AsyncBusinessMessagingPreparations(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def create(self, **kwargs: Unpack[inputs.BusinessMessagingPreparationsCreateArguments]) -> Result[models.BusinessMessagingPreparationsCreateData]:
        'Prepare a versioned messaging-settings replacement for human review'
        return await self._invoke('business.messaging.preparations.create', {}, kwargs)

    async def get(self, preparation_id: str, **kwargs: Unpack[inputs.BusinessMessagingPreparationsGetArguments]) -> Result[models.BusinessMessagingPreparationsGetData]:
        'Recover the original settings review or accepted result'
        return await self._invoke('business.messaging.preparations.get', {'preparationId': preparation_id}, kwargs)

    async def apply(self, preparation_id: str, **kwargs: Unpack[inputs.BusinessMessagingPreparationsApplyArguments]) -> Result[models.BusinessMessagingPreparationsApplyData]:
        'Apply the exact human-approved messaging configuration'
        return await self._invoke('business.messaging.preparations.apply', {'preparationId': preparation_id}, kwargs)
class AsyncBusinessOrdersShipments(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list(self, order_id: str, **kwargs: Unpack[inputs.BusinessOrdersShipmentsListArguments]) -> PageResult[models.BusinessOrdersShipmentsListData]:
        "An order's shipments"
        return await self._invoke('business.orders.shipments.list', {'orderId': order_id}, kwargs)

    def iter_pages(self, order_id: str, **kwargs: Unpack[inputs.BusinessOrdersShipmentsListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessOrdersShipmentsListData]]:
        return self._iter_pages('business.orders.shipments.list', {'orderId': order_id}, kwargs)

    def iter_items(self, order_id: str, **kwargs: Unpack[inputs.BusinessOrdersShipmentsListIteratorArguments]) -> AsyncIterator[models.BusinessOrdersShipmentsListData]:
        return self._iter_items('business.orders.shipments.list', {'orderId': order_id}, kwargs)
class AsyncBusinessAnalytics(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, **kwargs: Unpack[inputs.BusinessAnalyticsGetArguments]) -> Result[models.BusinessAnalyticsGetData]:
        'Read the business analytics report for a calendar window'
        return await self._invoke('business.analytics.get', {}, kwargs)
class AsyncBusinessConsents(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, **kwargs: Unpack[inputs.BusinessConsentsGetArguments]) -> Result[models.BusinessConsentsGetData]:
        "Read a contact's current messaging consent decisions"
        return await self._invoke('business.consents.get', {}, kwargs)

    async def withdraw(self, **kwargs: Unpack[inputs.BusinessConsentsWithdrawArguments]) -> Result[models.BusinessConsentsWithdrawData]:
        'Withdraw one WhatsApp messaging purpose'
        return await self._invoke('business.consents.withdraw', {}, kwargs)

    async def record_marketing_opt_in(self, **kwargs: Unpack[inputs.BusinessConsentsRecordMarketingOptInArguments]) -> Result[models.BusinessConsentsRecordMarketingOptInData]:
        "Verify a customer's current message asking for marketing offers"
        return await self._invoke('business.consents.record_marketing_opt_in', {}, kwargs)
class AsyncBusinessContacts(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.attributes = AsyncBusinessContactsAttributes(transport)
        self.fields = AsyncBusinessContactsFields(transport)
        self.tags = AsyncBusinessContactsTags(transport)

    async def list(self, **kwargs: Unpack[inputs.BusinessContactsListArguments]) -> PageResult[models.BusinessContactsListData]:
        'List contacts, newest first'
        return await self._invoke('business.contacts.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessContactsListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessContactsListData]]:
        return self._iter_pages('business.contacts.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessContactsListIteratorArguments]) -> AsyncIterator[models.BusinessContactsListData]:
        return self._iter_items('business.contacts.list', {}, kwargs)

    async def get(self, contact_id: str, **kwargs: Unpack[inputs.BusinessContactsGetArguments]) -> Result[models.BusinessContactsGetData]:
        'One contact'
        return await self._invoke('business.contacts.get', {'contactId': contact_id}, kwargs)

    async def create(self, **kwargs: Unpack[inputs.BusinessContactsCreateArguments]) -> Result[models.BusinessContactsCreateData]:
        'Create or resolve one phone contact'
        return await self._invoke('business.contacts.create', {}, kwargs)

    async def update(self, contact_id: str, **kwargs: Unpack[inputs.BusinessContactsUpdateArguments]) -> Result[models.BusinessContactsUpdateData]:
        "Change a contact's display name"
        return await self._invoke('business.contacts.update', {'contactId': contact_id}, kwargs)
class AsyncBusinessConversations(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.assignees = AsyncBusinessConversationsAssignees(transport)
        self.controls = AsyncBusinessConversationsControls(transport)
        self.messages = AsyncBusinessConversationsMessages(transport)

    async def list(self, **kwargs: Unpack[inputs.BusinessConversationsListArguments]) -> PageResult[models.BusinessConversationsListData]:
        'List conversations, newest first'
        return await self._invoke('business.conversations.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessConversationsListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessConversationsListData]]:
        return self._iter_pages('business.conversations.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessConversationsListIteratorArguments]) -> AsyncIterator[models.BusinessConversationsListData]:
        return self._iter_items('business.conversations.list', {}, kwargs)

    async def get(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsGetArguments]) -> Result[models.BusinessConversationsGetData]:
        'One conversation'
        return await self._invoke('business.conversations.get', {'conversationId': conversation_id}, kwargs)
class AsyncBusinessEvents(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.bindings = AsyncBusinessEventsBindings(transport)

    async def publish(self, **kwargs: Unpack[inputs.BusinessEventsPublishArguments]) -> Result[models.BusinessEventsPublishData]:
        'Start a published from-system flow for a known contact'
        return await self._invoke('business.events.publish', {}, kwargs)
class AsyncBusinessFlows(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.blocks = AsyncBusinessFlowsBlocks(transport)
        self.deployments = AsyncBusinessFlowsDeployments(transport)
        self.drafts = AsyncBusinessFlowsDrafts(transport)
        self.governance = AsyncBusinessFlowsGovernance(transport)
        self.regressions = AsyncBusinessFlowsRegressions(transport)
        self.runs = AsyncBusinessFlowsRuns(transport)
        self.steps = AsyncBusinessFlowsSteps(transport)
        self.templates = AsyncBusinessFlowsTemplates(transport)

    async def _simulate(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsSimulateArguments]) -> Result[models.BusinessFlowsSimulateData]:
        'Simulate one selected native draft path and record successful coverage'
        return await self._invoke('business.flows._simulate', {'recipeId': recipe_id}, kwargs)
class AsyncBusinessKnowledge(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.runs = AsyncBusinessKnowledgeRuns(transport)
        self.sections = AsyncBusinessKnowledgeSections(transport)
        self.sources = AsyncBusinessKnowledgeSources(transport)

    async def get(self, **kwargs: Unpack[inputs.BusinessKnowledgeGetArguments]) -> Result[models.BusinessKnowledgeGetData]:
        'Read the current knowledge document identity and version'
        return await self._invoke('business.knowledge.get', {}, kwargs)
class AsyncBusinessLoyalty(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.members = AsyncBusinessLoyaltyMembers(transport)
class AsyncBusinessMessages(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.preparations = AsyncBusinessMessagesPreparations(transport)

    async def get(self, message_id: str, **kwargs: Unpack[inputs.BusinessMessagesGetArguments]) -> Result[models.BusinessMessagesGetData]:
        'One message'
        return await self._invoke('business.messages.get', {'messageId': message_id}, kwargs)

    async def send(self, **kwargs: Unpack[inputs.BusinessMessagesSendArguments]) -> Result[models.BusinessMessagesSendData]:
        'Submit one notification using the shared message owner'
        return await self._invoke('business.messages.send', {}, kwargs)

    async def preview(self, **kwargs: Unpack[inputs.BusinessMessagesPreviewArguments]) -> Result[models.BusinessMessagesPreviewData]:
        'Observe notification eligibility without creating or reserving anything'
        return await self._invoke('business.messages.preview', {}, kwargs)

    async def prepare(self, **kwargs: Unpack[inputs.BusinessMessagesPrepareArguments]) -> Result[models.BusinessMessagesPrepareData]:
        "Prepare a notification for the connected user's exact review"
        return await self._invoke('business.messages.prepare', {}, kwargs)
class AsyncBusinessMessaging(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.preparations = AsyncBusinessMessagingPreparations(transport)

    async def get_readiness(self, **kwargs: Unpack[inputs.BusinessMessagingGetReadinessArguments]) -> Result[models.BusinessMessagingGetReadinessData]:
        'Read WhatsApp account setup readiness'
        return await self._invoke('business.messaging.get_readiness', {}, kwargs)

    async def get_configuration(self, **kwargs: Unpack[inputs.BusinessMessagingGetConfigurationArguments]) -> Result[models.BusinessMessagingGetConfigurationData]:
        'Discover merchant-managed template aliases and text-purpose bindings'
        return await self._invoke('business.messaging.get_configuration', {}, kwargs)

    async def update_configuration(self, **kwargs: Unpack[inputs.BusinessMessagingUpdateConfigurationArguments]) -> Result[models.BusinessMessagingUpdateConfigurationData]:
        'Update messaging aliases and purpose bindings'
        return await self._invoke('business.messaging.update_configuration', {}, kwargs)
class AsyncBusinessOperations(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, operation_id: str, **kwargs: Unpack[inputs.BusinessOperationsGetArguments]) -> Result[models.BusinessOperationsGetData]:
        'Read progress of an operation owned by this integration'
        return await self._invoke('business.operations.get', {'operationId': operation_id}, kwargs)

    async def lookup(self, **kwargs: Unpack[inputs.BusinessOperationsLookupArguments]) -> Result[models.BusinessOperationsLookupData]:
        'Recover an operation after a lost submission response'
        return await self._invoke('business.operations.lookup', {}, kwargs)

    async def cancel(self, operation_id: str, **kwargs: Unpack[inputs.BusinessOperationsCancelArguments]) -> Result[models.BusinessOperationsCancelData]:
        'Cancel before provider sending begins, using the observed revision'
        return await self._invoke('business.operations.cancel', {'operationId': operation_id}, kwargs)
class AsyncBusinessOrders(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.shipments = AsyncBusinessOrdersShipments(transport)

    async def list(self, **kwargs: Unpack[inputs.BusinessOrdersListArguments]) -> PageResult[models.BusinessOrdersListData]:
        'List orders taken through InsideDM, newest first'
        return await self._invoke('business.orders.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessOrdersListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessOrdersListData]]:
        return self._iter_pages('business.orders.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessOrdersListIteratorArguments]) -> AsyncIterator[models.BusinessOrdersListData]:
        return self._iter_items('business.orders.list', {}, kwargs)

    async def get(self, order_id: str, **kwargs: Unpack[inputs.BusinessOrdersGetArguments]) -> Result[models.BusinessOrdersGetData]:
        'One order, with up to 100 items'
        return await self._invoke('business.orders.get', {'orderId': order_id}, kwargs)
class AsyncBusinessShipments(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, shipment_id: str, **kwargs: Unpack[inputs.BusinessShipmentsGetArguments]) -> Result[models.BusinessShipmentsGetData]:
        'One shipment of an order taken through InsideDM'
        return await self._invoke('business.shipments.get', {'shipmentId': shipment_id}, kwargs)
class AsyncBusinessTemplates(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list(self, **kwargs: Unpack[inputs.BusinessTemplatesListArguments]) -> PageResult[models.BusinessTemplatesListData]:
        'Discover approved WhatsApp templates and their variables'
        return await self._invoke('business.templates.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessTemplatesListIteratorArguments]) -> AsyncIterator[PageResult[models.BusinessTemplatesListData]]:
        return self._iter_pages('business.templates.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessTemplatesListIteratorArguments]) -> AsyncIterator[models.BusinessTemplatesListData]:
        return self._iter_items('business.templates.list', {}, kwargs)
class AsyncBusinessUsage(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, **kwargs: Unpack[inputs.BusinessUsageGetArguments]) -> Result[models.BusinessUsageGetData]:
        'Read business software usage or current native plan limits'
        return await self._invoke('business.usage.get', {}, kwargs)

    async def get_limits(self, **kwargs: Unpack[inputs.BusinessUsageGetLimitsArguments]) -> Result[models.BusinessUsageGetLimitsData]:
        'Read business software usage or current native plan limits'
        return await self._invoke('business.usage.get_limits', {}, kwargs)
class AsyncBusinessWorkspace(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, **kwargs: Unpack[inputs.BusinessWorkspaceGetArguments]) -> Result[models.BusinessWorkspaceGetData]:
        'The workspace this key belongs to, and the key itself'
        return await self._invoke('business.workspace.get', {}, kwargs)

class AsyncBusinessResources:
    def _init_resources(self, transport):
        self.analytics = AsyncBusinessAnalytics(transport)
        self.consents = AsyncBusinessConsents(transport)
        self.contacts = AsyncBusinessContacts(transport)
        self.conversations = AsyncBusinessConversations(transport)
        self.events = AsyncBusinessEvents(transport)
        self.flows = AsyncBusinessFlows(transport)
        self.knowledge = AsyncBusinessKnowledge(transport)
        self.loyalty = AsyncBusinessLoyalty(transport)
        self.messages = AsyncBusinessMessages(transport)
        self.messaging = AsyncBusinessMessaging(transport)
        self.operations = AsyncBusinessOperations(transport)
        self.orders = AsyncBusinessOrders(transport)
        self.shipments = AsyncBusinessShipments(transport)
        self.templates = AsyncBusinessTemplates(transport)
        self.usage = AsyncBusinessUsage(transport)
        self.workspace = AsyncBusinessWorkspace(transport)

class AsyncPlatformSubscriptionsBusinessesDeliveries(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list(self, subscription_id: str, business_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesDeliveriesListArguments]) -> PageResult[models.PlatformSubscriptionsBusinessesDeliveriesListData]:
        'Read bounded thin delivery history'
        return await self._invoke('platform.subscriptions.businesses.deliveries.list', {'subscriptionId': subscription_id, 'businessId': business_id}, kwargs)

    def iter_pages(self, subscription_id: str, business_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesDeliveriesListIteratorArguments]) -> AsyncIterator[PageResult[models.PlatformSubscriptionsBusinessesDeliveriesListData]]:
        return self._iter_pages('platform.subscriptions.businesses.deliveries.list', {'subscriptionId': subscription_id, 'businessId': business_id}, kwargs)

    def iter_items(self, subscription_id: str, business_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesDeliveriesListIteratorArguments]) -> AsyncIterator[models.PlatformSubscriptionsBusinessesDeliveriesListData]:
        return self._iter_items('platform.subscriptions.businesses.deliveries.list', {'subscriptionId': subscription_id, 'businessId': business_id}, kwargs)

    async def get(self, subscription_id: str, business_id: str, delivery_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesDeliveriesGetArguments]) -> Result[models.PlatformSubscriptionsBusinessesDeliveriesGetData]:
        'Read a delivery and safe attempt metadata'
        return await self._invoke('platform.subscriptions.businesses.deliveries.get', {'subscriptionId': subscription_id, 'businessId': business_id, 'deliveryId': delivery_id}, kwargs)

    async def replay(self, subscription_id: str, business_id: str, delivery_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesDeliveriesReplayArguments]) -> Result[models.PlatformSubscriptionsBusinessesDeliveriesReplayData]:
        'Explicitly replay one retained application delivery'
        return await self._invoke('platform.subscriptions.businesses.deliveries.replay', {'subscriptionId': subscription_id, 'businessId': business_id, 'deliveryId': delivery_id}, kwargs)
class AsyncPlatformSubscriptionsBusinesses(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.deliveries = AsyncPlatformSubscriptionsBusinessesDeliveries(transport)

    async def get_health(self, subscription_id: str, business_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesGetHealthArguments]) -> Result[models.PlatformSubscriptionsBusinessesGetHealthData]:
        "Observe this merchant receiver's current health"
        return await self._invoke('platform.subscriptions.businesses.get_health', {'subscriptionId': subscription_id, 'businessId': business_id}, kwargs)

    async def recover(self, subscription_id: str, business_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesRecoverArguments]) -> Result[models.PlatformSubscriptionsBusinessesRecoverData]:
        'Recover one merchant receiver from a native health pause'
        return await self._invoke('platform.subscriptions.businesses.recover', {'subscriptionId': subscription_id, 'businessId': business_id}, kwargs)
class AsyncPlatformBlueprints(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list_templates(self, **kwargs: Unpack[inputs.PlatformBlueprintsListTemplatesArguments]) -> Result[models.PlatformBlueprintsListTemplatesData]:
        'Discover portable template sources and typed customization parameters'
        return await self._invoke('platform.blueprints.list_templates', {}, kwargs)

    async def create_version(self, **kwargs: Unpack[inputs.PlatformBlueprintsCreateVersionArguments]) -> Result[models.PlatformBlueprintsCreateVersionData]:
        'Create an immutable application-owned portable blueprint version'
        return await self._invoke('platform.blueprints.create_version', {}, kwargs)

    async def list_versions(self, blueprint_key: str, **kwargs: Unpack[inputs.PlatformBlueprintsListVersionsArguments]) -> Result[models.PlatformBlueprintsListVersionsData]:
        "List this application's immutable versions for a blueprint key"
        return await self._invoke('platform.blueprints.list_versions', {'blueprintKey': blueprint_key}, kwargs)

    async def get_version(self, blueprint_key: str, version: int, **kwargs: Unpack[inputs.PlatformBlueprintsGetVersionArguments]) -> Result[models.PlatformBlueprintsGetVersionData]:
        'Read one exact application-owned portable version'
        return await self._invoke('platform.blueprints.get_version', {'blueprintKey': blueprint_key, 'version': version}, kwargs)
class AsyncPlatformBusinessCreations(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, creation_id: str, **kwargs: Unpack[inputs.PlatformBusinessCreationsGetArguments]) -> Result[models.PlatformBusinessCreationsGetData]:
        "Authenticate this application's own creation outcome"
        return await self._invoke('platform.business_creations.get', {'creationId': creation_id}, kwargs)

    async def renew_claim_link(self, creation_id: str, **kwargs: Unpack[inputs.PlatformBusinessCreationsRenewClaimLinkArguments]) -> Result[models.PlatformBusinessCreationsRenewClaimLinkData]:
        'Replace a pending ownership claim link on the same workspace'
        return await self._invoke('platform.business_creations.renew_claim_link', {'creationId': creation_id}, kwargs)
class AsyncPlatformBusinesses(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def list(self, **kwargs: Unpack[inputs.PlatformBusinessesListArguments]) -> PageResult[models.PlatformBusinessesListData]:
        'Discover businesses with a current installation of this application'
        return await self._invoke('platform.businesses.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.PlatformBusinessesListIteratorArguments]) -> AsyncIterator[PageResult[models.PlatformBusinessesListData]]:
        return self._iter_pages('platform.businesses.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.PlatformBusinessesListIteratorArguments]) -> AsyncIterator[models.PlatformBusinessesListData]:
        return self._iter_items('platform.businesses.list', {}, kwargs)

    async def get(self, business_id: str, **kwargs: Unpack[inputs.PlatformBusinessesGetArguments]) -> Result[models.PlatformBusinessesGetData]:
        "Read profile metadata for a business with this application's active installation"
        return await self._invoke('platform.businesses.get', {'businessId': business_id}, kwargs)

    async def create(self, **kwargs: Unpack[inputs.PlatformBusinessesCreateArguments]) -> Result[models.PlatformBusinessesCreateData]:
        'Provision a separate merchant workspace and its ownership claim'
        return await self._invoke('platform.businesses.create', {}, kwargs)
class AsyncPlatformInstallationRequests(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def create(self, **kwargs: Unpack[inputs.PlatformInstallationRequestsCreateArguments]) -> Result[models.PlatformInstallationRequestsCreateData]:
        'Ask a merchant to approve application access'
        return await self._invoke('platform.installation_requests.create', {}, kwargs)

    async def get(self, request_id: str, **kwargs: Unpack[inputs.PlatformInstallationRequestsGetArguments]) -> Result[models.PlatformInstallationRequestsGetData]:
        "Check this application's merchant approval request"
        return await self._invoke('platform.installation_requests.get', {'requestId': request_id}, kwargs)
class AsyncPlatformInstallations(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, installation_id: str, **kwargs: Unpack[inputs.PlatformInstallationsGetArguments]) -> Result[models.PlatformInstallationsGetData]:
        "Inspect this application's client installation"
        return await self._invoke('platform.installations.get', {'installationId': installation_id}, kwargs)

    async def revoke(self, installation_id: str, **kwargs: Unpack[inputs.PlatformInstallationsRevokeArguments]) -> Result[models.PlatformInstallationsRevokeData]:
        "Revoke this application's access to one client"
        return await self._invoke('platform.installations.revoke', {'installationId': installation_id}, kwargs)
class AsyncPlatformOnboarding(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def create(self, **kwargs: Unpack[inputs.PlatformOnboardingCreateArguments]) -> Result[models.PlatformOnboardingCreateData]:
        'Request private merchant-hosted WhatsApp setup for an installed business'
        return await self._invoke('platform.onboarding.create', {}, kwargs)

    async def get(self, session_id: str, **kwargs: Unpack[inputs.PlatformOnboardingGetArguments]) -> Result[models.PlatformOnboardingGetData]:
        "Read this application's own setup-session outcome"
        return await self._invoke('platform.onboarding.get', {'sessionId': session_id}, kwargs)
class AsyncPlatformSelf(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, **kwargs: Unpack[inputs.PlatformSelfGetArguments]) -> Result[models.PlatformSelfGetData]:
        'Check application identity and effective configuration'
        return await self._invoke('platform.self.get', {}, kwargs)
class AsyncPlatformSubscriptions(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.businesses = AsyncPlatformSubscriptionsBusinesses(transport)

    async def list(self, **kwargs: Unpack[inputs.PlatformSubscriptionsListArguments]) -> Result[models.PlatformSubscriptionsListData]:
        'List current application-owned webhook receivers'
        return await self._invoke('platform.subscriptions.list', {}, kwargs)

    async def get(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsGetArguments]) -> Result[models.PlatformSubscriptionsGetData]:
        'Read an application-owned webhook receiver'
        return await self._invoke('platform.subscriptions.get', {'subscriptionId': subscription_id}, kwargs)

    async def create(self, **kwargs: Unpack[inputs.PlatformSubscriptionsCreateArguments]) -> Result[models.PlatformSubscriptionsCreateData]:
        'Create an application-owned webhook receiver'
        return await self._invoke('platform.subscriptions.create', {}, kwargs)

    async def update(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsUpdateArguments]) -> Result[models.PlatformSubscriptionsUpdateData]:
        'Update the reviewed receiver configuration'
        return await self._invoke('platform.subscriptions.update', {'subscriptionId': subscription_id}, kwargs)

    async def verify(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsVerifyArguments]) -> Result[models.PlatformSubscriptionsVerifyData]:
        'Verify an application-owned receiver'
        return await self._invoke('platform.subscriptions.verify', {'subscriptionId': subscription_id}, kwargs)

    async def activate(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsActivateArguments]) -> Result[models.PlatformSubscriptionsActivateData]:
        'Activate a verified receiver configuration'
        return await self._invoke('platform.subscriptions.activate', {'subscriptionId': subscription_id}, kwargs)

    async def pause(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsPauseArguments]) -> Result[models.PlatformSubscriptionsPauseData]:
        'Pause the receiver configuration'
        return await self._invoke('platform.subscriptions.pause', {'subscriptionId': subscription_id}, kwargs)

    async def disable(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsDisableArguments]) -> Result[models.PlatformSubscriptionsDisableData]:
        'Disable the receiver configuration'
        return await self._invoke('platform.subscriptions.disable', {'subscriptionId': subscription_id}, kwargs)

    async def rotate_secret(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsRotateSecretArguments]) -> Result[models.PlatformSubscriptionsRotateSecretData]:
        'Rotate the application-owned signing secret'
        return await self._invoke('platform.subscriptions.rotate_secret', {'subscriptionId': subscription_id}, kwargs)
class AsyncPlatformUsage(AsyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    async def get(self, business_id: str, **kwargs: Unpack[inputs.PlatformUsageGetArguments]) -> Result[models.PlatformUsageGetData]:
        "Read this application's own client API telemetry"
        return await self._invoke('platform.usage.get', {'businessId': business_id}, kwargs)

class AsyncPlatformResources:
    def _init_resources(self, transport):
        self.blueprints = AsyncPlatformBlueprints(transport)
        self.business_creations = AsyncPlatformBusinessCreations(transport)
        self.businesses = AsyncPlatformBusinesses(transport)
        self.installation_requests = AsyncPlatformInstallationRequests(transport)
        self.installations = AsyncPlatformInstallations(transport)
        self.onboarding = AsyncPlatformOnboarding(transport)
        self.self = AsyncPlatformSelf(transport)
        self.subscriptions = AsyncPlatformSubscriptions(transport)
        self.usage = AsyncPlatformUsage(transport)
