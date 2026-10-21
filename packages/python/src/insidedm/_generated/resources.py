# Generated from the reviewed public contract. Do not edit.
from __future__ import annotations
from typing import Unpack, Iterator, AsyncIterator
from . import models, inputs
from .._models import Result, PageResult
from .._resources import SyncResource, AsyncResource

class BusinessContactsAttributes(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def update(self, contact_id: str, **kwargs: Unpack[inputs.BusinessContactsAttributesUpdateArguments]) -> Result[models.BusinessContactsAttributesUpdateData]:
        'Update declared custom fields on a contact'
        return self._invoke('business.contacts.attributes.update', {'contactId': contact_id}, kwargs)
class BusinessContactsTags(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def replace(self, contact_id: str, **kwargs: Unpack[inputs.BusinessContactsTagsReplaceArguments]) -> Result[models.BusinessContactsTagsReplaceData]:
        "Replace a contact's complete tag list"
        return self._invoke('business.contacts.tags.replace', {'contactId': contact_id}, kwargs)
class BusinessConversationsMessages(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def list(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsMessagesListArguments]) -> PageResult[models.BusinessConversationsMessagesListData]:
        "A conversation's messages, newest first"
        return self._invoke('business.conversations.messages.list', {'conversationId': conversation_id}, kwargs)

    def iter_pages(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsMessagesListIteratorArguments]) -> Iterator[PageResult[models.BusinessConversationsMessagesListData]]:
        return self._iter_pages('business.conversations.messages.list', {'conversationId': conversation_id}, kwargs)

    def iter_items(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsMessagesListIteratorArguments]) -> Iterator[models.BusinessConversationsMessagesListData]:
        return self._iter_items('business.conversations.messages.list', {'conversationId': conversation_id}, kwargs)
class BusinessEventsBindings(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def list(self, **kwargs: Unpack[inputs.BusinessEventsBindingsListArguments]) -> PageResult[models.BusinessEventsBindingsListData]:
        'Discover active published from-system flows and input requirements'
        return self._invoke('business.events.bindings.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessEventsBindingsListIteratorArguments]) -> Iterator[PageResult[models.BusinessEventsBindingsListData]]:
        return self._iter_pages('business.events.bindings.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessEventsBindingsListIteratorArguments]) -> Iterator[models.BusinessEventsBindingsListData]:
        return self._iter_items('business.events.bindings.list', {}, kwargs)
class BusinessFlowsDeployments(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsDeploymentsGetArguments]) -> Result[models.BusinessFlowsDeploymentsGetData]:
        'Read immutable import origin and current draft drift'
        return self._invoke('business.flows.deployments.get', {'recipeId': recipe_id}, kwargs)

    def _preview_update(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsDeploymentsPreviewUpdateArguments]) -> Result[models.BusinessFlowsDeploymentsPreviewUpdateData]:
        'Preview a managed blueprint update while preserving client overrides'
        return self._invoke('business.flows.deployments._preview_update', {'recipeId': recipe_id}, kwargs)

    def _apply_update(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsDeploymentsApplyUpdateArguments]) -> Result[models.BusinessFlowsDeploymentsApplyUpdateData]:
        'Apply a reviewed blueprint update to its current client draft'
        return self._invoke('business.flows.deployments._apply_update', {'recipeId': recipe_id}, kwargs)

    def _request_publication(self, recipe_id: str, **kwargs: Unpack[inputs.BusinessFlowsDeploymentsRequestPublicationArguments]) -> Result[models.BusinessFlowsDeploymentsRequestPublicationData]:
        "Submit this integration's unchanged managed draft for native human publication"
        return self._invoke('business.flows.deployments._request_publication', {'recipeId': recipe_id}, kwargs)

    def get_publication_request(self, recipe_id: str, release_request_id: str, **kwargs: Unpack[inputs.BusinessFlowsDeploymentsGetPublicationRequestArguments]) -> Result[models.BusinessFlowsDeploymentsGetPublicationRequestData]:
        "Observe this integration's managed publication request"
        return self._invoke('business.flows.deployments.get_publication_request', {'recipeId': recipe_id, 'releaseRequestId': release_request_id}, kwargs)
class BusinessFlowsRuns(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get(self, run_id: str, **kwargs: Unpack[inputs.BusinessFlowsRunsGetArguments]) -> Result[models.BusinessFlowsRunsGetData]:
        'Read the current status of an SDK-started flow'
        return self._invoke('business.flows.runs.get', {'runId': run_id}, kwargs)
class BusinessFlowsTemplates(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def catalog(self, **kwargs: Unpack[inputs.BusinessFlowsTemplatesCatalogArguments]) -> Result[models.BusinessFlowsTemplatesCatalogData]:
        'Discover versioned flow templates and eligible client endpoint references'
        return self._invoke('business.flows.templates.catalog', {}, kwargs)

    def import_(self, pack_id: str, **kwargs: Unpack[inputs.BusinessFlowsTemplatesImportArguments]) -> Result[models.BusinessFlowsTemplatesImportData]:
        'Create a client-owned draft from an exact flow template version'
        return self._invoke('business.flows.templates.import_', {'packId': pack_id}, kwargs)
class BusinessOrdersShipments(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def list(self, order_id: str, **kwargs: Unpack[inputs.BusinessOrdersShipmentsListArguments]) -> PageResult[models.BusinessOrdersShipmentsListData]:
        "An order's shipments"
        return self._invoke('business.orders.shipments.list', {'orderId': order_id}, kwargs)

    def iter_pages(self, order_id: str, **kwargs: Unpack[inputs.BusinessOrdersShipmentsListIteratorArguments]) -> Iterator[PageResult[models.BusinessOrdersShipmentsListData]]:
        return self._iter_pages('business.orders.shipments.list', {'orderId': order_id}, kwargs)

    def iter_items(self, order_id: str, **kwargs: Unpack[inputs.BusinessOrdersShipmentsListIteratorArguments]) -> Iterator[models.BusinessOrdersShipmentsListData]:
        return self._iter_items('business.orders.shipments.list', {'orderId': order_id}, kwargs)
class BusinessConsents(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get(self, **kwargs: Unpack[inputs.BusinessConsentsGetArguments]) -> Result[models.BusinessConsentsGetData]:
        "Read a contact's current messaging consent decisions"
        return self._invoke('business.consents.get', {}, kwargs)

    def withdraw(self, **kwargs: Unpack[inputs.BusinessConsentsWithdrawArguments]) -> Result[models.BusinessConsentsWithdrawData]:
        'Withdraw one WhatsApp messaging purpose'
        return self._invoke('business.consents.withdraw', {}, kwargs)

    def record_marketing_opt_in(self, **kwargs: Unpack[inputs.BusinessConsentsRecordMarketingOptInArguments]) -> Result[models.BusinessConsentsRecordMarketingOptInData]:
        "Verify a customer's current message asking for marketing offers"
        return self._invoke('business.consents.record_marketing_opt_in', {}, kwargs)
class BusinessContacts(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.attributes = BusinessContactsAttributes(transport)
        self.tags = BusinessContactsTags(transport)

    def list(self, **kwargs: Unpack[inputs.BusinessContactsListArguments]) -> PageResult[models.BusinessContactsListData]:
        'List contacts, newest first'
        return self._invoke('business.contacts.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessContactsListIteratorArguments]) -> Iterator[PageResult[models.BusinessContactsListData]]:
        return self._iter_pages('business.contacts.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessContactsListIteratorArguments]) -> Iterator[models.BusinessContactsListData]:
        return self._iter_items('business.contacts.list', {}, kwargs)

    def get(self, contact_id: str, **kwargs: Unpack[inputs.BusinessContactsGetArguments]) -> Result[models.BusinessContactsGetData]:
        'One contact'
        return self._invoke('business.contacts.get', {'contactId': contact_id}, kwargs)

    def create(self, **kwargs: Unpack[inputs.BusinessContactsCreateArguments]) -> Result[models.BusinessContactsCreateData]:
        'Create or resolve one phone contact'
        return self._invoke('business.contacts.create', {}, kwargs)

    def update(self, contact_id: str, **kwargs: Unpack[inputs.BusinessContactsUpdateArguments]) -> Result[models.BusinessContactsUpdateData]:
        "Change a contact's display name"
        return self._invoke('business.contacts.update', {'contactId': contact_id}, kwargs)
class BusinessConversations(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.messages = BusinessConversationsMessages(transport)

    def list(self, **kwargs: Unpack[inputs.BusinessConversationsListArguments]) -> PageResult[models.BusinessConversationsListData]:
        'List conversations, newest first'
        return self._invoke('business.conversations.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessConversationsListIteratorArguments]) -> Iterator[PageResult[models.BusinessConversationsListData]]:
        return self._iter_pages('business.conversations.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessConversationsListIteratorArguments]) -> Iterator[models.BusinessConversationsListData]:
        return self._iter_items('business.conversations.list', {}, kwargs)

    def get(self, conversation_id: str, **kwargs: Unpack[inputs.BusinessConversationsGetArguments]) -> Result[models.BusinessConversationsGetData]:
        'One conversation'
        return self._invoke('business.conversations.get', {'conversationId': conversation_id}, kwargs)
class BusinessEvents(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.bindings = BusinessEventsBindings(transport)

    def publish(self, **kwargs: Unpack[inputs.BusinessEventsPublishArguments]) -> Result[models.BusinessEventsPublishData]:
        'Start a published from-system flow for a known contact'
        return self._invoke('business.events.publish', {}, kwargs)
class BusinessFlows(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.deployments = BusinessFlowsDeployments(transport)
        self.runs = BusinessFlowsRuns(transport)
        self.templates = BusinessFlowsTemplates(transport)
class BusinessMessages(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get(self, message_id: str, **kwargs: Unpack[inputs.BusinessMessagesGetArguments]) -> Result[models.BusinessMessagesGetData]:
        'One message'
        return self._invoke('business.messages.get', {'messageId': message_id}, kwargs)

    def send(self, **kwargs: Unpack[inputs.BusinessMessagesSendArguments]) -> Result[models.BusinessMessagesSendData]:
        'Submit one notification using the shared message owner'
        return self._invoke('business.messages.send', {}, kwargs)

    def preview(self, **kwargs: Unpack[inputs.BusinessMessagesPreviewArguments]) -> Result[models.BusinessMessagesPreviewData]:
        'Observe notification eligibility without creating or reserving anything'
        return self._invoke('business.messages.preview', {}, kwargs)
class BusinessMessaging(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get_readiness(self, **kwargs: Unpack[inputs.BusinessMessagingGetReadinessArguments]) -> Result[models.BusinessMessagingGetReadinessData]:
        'Read WhatsApp account setup readiness'
        return self._invoke('business.messaging.get_readiness', {}, kwargs)

    def get_configuration(self, **kwargs: Unpack[inputs.BusinessMessagingGetConfigurationArguments]) -> Result[models.BusinessMessagingGetConfigurationData]:
        'Discover merchant-managed template aliases and text-purpose bindings'
        return self._invoke('business.messaging.get_configuration', {}, kwargs)
class BusinessOperations(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get(self, operation_id: str, **kwargs: Unpack[inputs.BusinessOperationsGetArguments]) -> Result[models.BusinessOperationsGetData]:
        'Read progress of an operation owned by this integration'
        return self._invoke('business.operations.get', {'operationId': operation_id}, kwargs)

    def lookup(self, **kwargs: Unpack[inputs.BusinessOperationsLookupArguments]) -> Result[models.BusinessOperationsLookupData]:
        'Recover an operation after a lost submission response'
        return self._invoke('business.operations.lookup', {}, kwargs)

    def cancel(self, operation_id: str, **kwargs: Unpack[inputs.BusinessOperationsCancelArguments]) -> Result[models.BusinessOperationsCancelData]:
        'Cancel before provider sending begins, using the observed revision'
        return self._invoke('business.operations.cancel', {'operationId': operation_id}, kwargs)
class BusinessOrders(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.shipments = BusinessOrdersShipments(transport)

    def list(self, **kwargs: Unpack[inputs.BusinessOrdersListArguments]) -> PageResult[models.BusinessOrdersListData]:
        'List orders taken through InsideDM, newest first'
        return self._invoke('business.orders.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessOrdersListIteratorArguments]) -> Iterator[PageResult[models.BusinessOrdersListData]]:
        return self._iter_pages('business.orders.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessOrdersListIteratorArguments]) -> Iterator[models.BusinessOrdersListData]:
        return self._iter_items('business.orders.list', {}, kwargs)

    def get(self, order_id: str, **kwargs: Unpack[inputs.BusinessOrdersGetArguments]) -> Result[models.BusinessOrdersGetData]:
        'One order, with up to 100 items'
        return self._invoke('business.orders.get', {'orderId': order_id}, kwargs)
class BusinessShipments(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get(self, shipment_id: str, **kwargs: Unpack[inputs.BusinessShipmentsGetArguments]) -> Result[models.BusinessShipmentsGetData]:
        'One shipment of an order taken through InsideDM'
        return self._invoke('business.shipments.get', {'shipmentId': shipment_id}, kwargs)
class BusinessTemplates(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def list(self, **kwargs: Unpack[inputs.BusinessTemplatesListArguments]) -> PageResult[models.BusinessTemplatesListData]:
        'Discover approved WhatsApp templates and their variables'
        return self._invoke('business.templates.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.BusinessTemplatesListIteratorArguments]) -> Iterator[PageResult[models.BusinessTemplatesListData]]:
        return self._iter_pages('business.templates.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.BusinessTemplatesListIteratorArguments]) -> Iterator[models.BusinessTemplatesListData]:
        return self._iter_items('business.templates.list', {}, kwargs)
class BusinessUsage(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get(self, **kwargs: Unpack[inputs.BusinessUsageGetArguments]) -> Result[models.BusinessUsageGetData]:
        'Read business software usage or current native plan limits'
        return self._invoke('business.usage.get', {}, kwargs)

    def get_limits(self, **kwargs: Unpack[inputs.BusinessUsageGetLimitsArguments]) -> Result[models.BusinessUsageGetLimitsData]:
        'Read business software usage or current native plan limits'
        return self._invoke('business.usage.get_limits', {}, kwargs)
class BusinessWorkspace(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get(self, **kwargs: Unpack[inputs.BusinessWorkspaceGetArguments]) -> Result[models.BusinessWorkspaceGetData]:
        'The workspace this key belongs to, and the key itself'
        return self._invoke('business.workspace.get', {}, kwargs)

class BusinessResources:
    def _init_resources(self, transport):
        self.consents = BusinessConsents(transport)
        self.contacts = BusinessContacts(transport)
        self.conversations = BusinessConversations(transport)
        self.events = BusinessEvents(transport)
        self.flows = BusinessFlows(transport)
        self.messages = BusinessMessages(transport)
        self.messaging = BusinessMessaging(transport)
        self.operations = BusinessOperations(transport)
        self.orders = BusinessOrders(transport)
        self.shipments = BusinessShipments(transport)
        self.templates = BusinessTemplates(transport)
        self.usage = BusinessUsage(transport)
        self.workspace = BusinessWorkspace(transport)

class PlatformSubscriptionsBusinessesDeliveries(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def list(self, subscription_id: str, business_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesDeliveriesListArguments]) -> PageResult[models.PlatformSubscriptionsBusinessesDeliveriesListData]:
        'Read bounded thin delivery history'
        return self._invoke('platform.subscriptions.businesses.deliveries.list', {'subscriptionId': subscription_id, 'businessId': business_id}, kwargs)

    def iter_pages(self, subscription_id: str, business_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesDeliveriesListIteratorArguments]) -> Iterator[PageResult[models.PlatformSubscriptionsBusinessesDeliveriesListData]]:
        return self._iter_pages('platform.subscriptions.businesses.deliveries.list', {'subscriptionId': subscription_id, 'businessId': business_id}, kwargs)

    def iter_items(self, subscription_id: str, business_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesDeliveriesListIteratorArguments]) -> Iterator[models.PlatformSubscriptionsBusinessesDeliveriesListData]:
        return self._iter_items('platform.subscriptions.businesses.deliveries.list', {'subscriptionId': subscription_id, 'businessId': business_id}, kwargs)

    def get(self, subscription_id: str, business_id: str, delivery_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesDeliveriesGetArguments]) -> Result[models.PlatformSubscriptionsBusinessesDeliveriesGetData]:
        'Read a delivery and safe attempt metadata'
        return self._invoke('platform.subscriptions.businesses.deliveries.get', {'subscriptionId': subscription_id, 'businessId': business_id, 'deliveryId': delivery_id}, kwargs)

    def replay(self, subscription_id: str, business_id: str, delivery_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesDeliveriesReplayArguments]) -> Result[models.PlatformSubscriptionsBusinessesDeliveriesReplayData]:
        'Explicitly replay one retained application delivery'
        return self._invoke('platform.subscriptions.businesses.deliveries.replay', {'subscriptionId': subscription_id, 'businessId': business_id, 'deliveryId': delivery_id}, kwargs)
class PlatformSubscriptionsBusinesses(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.deliveries = PlatformSubscriptionsBusinessesDeliveries(transport)

    def get_health(self, subscription_id: str, business_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesGetHealthArguments]) -> Result[models.PlatformSubscriptionsBusinessesGetHealthData]:
        "Observe this merchant receiver's current health"
        return self._invoke('platform.subscriptions.businesses.get_health', {'subscriptionId': subscription_id, 'businessId': business_id}, kwargs)

    def recover(self, subscription_id: str, business_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsBusinessesRecoverArguments]) -> Result[models.PlatformSubscriptionsBusinessesRecoverData]:
        'Recover one merchant receiver from a native health pause'
        return self._invoke('platform.subscriptions.businesses.recover', {'subscriptionId': subscription_id, 'businessId': business_id}, kwargs)
class PlatformBlueprints(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def list_templates(self, **kwargs: Unpack[inputs.PlatformBlueprintsListTemplatesArguments]) -> Result[models.PlatformBlueprintsListTemplatesData]:
        'Discover portable template sources and typed customization parameters'
        return self._invoke('platform.blueprints.list_templates', {}, kwargs)

    def create_version(self, **kwargs: Unpack[inputs.PlatformBlueprintsCreateVersionArguments]) -> Result[models.PlatformBlueprintsCreateVersionData]:
        'Create an immutable application-owned portable blueprint version'
        return self._invoke('platform.blueprints.create_version', {}, kwargs)

    def list_versions(self, blueprint_key: str, **kwargs: Unpack[inputs.PlatformBlueprintsListVersionsArguments]) -> Result[models.PlatformBlueprintsListVersionsData]:
        "List this application's immutable versions for a blueprint key"
        return self._invoke('platform.blueprints.list_versions', {'blueprintKey': blueprint_key}, kwargs)

    def get_version(self, blueprint_key: str, version: int, **kwargs: Unpack[inputs.PlatformBlueprintsGetVersionArguments]) -> Result[models.PlatformBlueprintsGetVersionData]:
        'Read one exact application-owned portable version'
        return self._invoke('platform.blueprints.get_version', {'blueprintKey': blueprint_key, 'version': version}, kwargs)
class PlatformBusinessCreations(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get(self, creation_id: str, **kwargs: Unpack[inputs.PlatformBusinessCreationsGetArguments]) -> Result[models.PlatformBusinessCreationsGetData]:
        "Authenticate this application's own creation outcome"
        return self._invoke('platform.business_creations.get', {'creationId': creation_id}, kwargs)

    def renew_claim_link(self, creation_id: str, **kwargs: Unpack[inputs.PlatformBusinessCreationsRenewClaimLinkArguments]) -> Result[models.PlatformBusinessCreationsRenewClaimLinkData]:
        'Replace a pending ownership claim link on the same workspace'
        return self._invoke('platform.business_creations.renew_claim_link', {'creationId': creation_id}, kwargs)
class PlatformBusinesses(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def list(self, **kwargs: Unpack[inputs.PlatformBusinessesListArguments]) -> PageResult[models.PlatformBusinessesListData]:
        'Discover businesses with a current installation of this application'
        return self._invoke('platform.businesses.list', {}, kwargs)

    def iter_pages(self, **kwargs: Unpack[inputs.PlatformBusinessesListIteratorArguments]) -> Iterator[PageResult[models.PlatformBusinessesListData]]:
        return self._iter_pages('platform.businesses.list', {}, kwargs)

    def iter_items(self, **kwargs: Unpack[inputs.PlatformBusinessesListIteratorArguments]) -> Iterator[models.PlatformBusinessesListData]:
        return self._iter_items('platform.businesses.list', {}, kwargs)

    def get(self, business_id: str, **kwargs: Unpack[inputs.PlatformBusinessesGetArguments]) -> Result[models.PlatformBusinessesGetData]:
        "Read profile metadata for a business with this application's active installation"
        return self._invoke('platform.businesses.get', {'businessId': business_id}, kwargs)

    def create(self, **kwargs: Unpack[inputs.PlatformBusinessesCreateArguments]) -> Result[models.PlatformBusinessesCreateData]:
        'Provision a separate merchant workspace and its ownership claim'
        return self._invoke('platform.businesses.create', {}, kwargs)
class PlatformInstallationRequests(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def create(self, **kwargs: Unpack[inputs.PlatformInstallationRequestsCreateArguments]) -> Result[models.PlatformInstallationRequestsCreateData]:
        'Ask a merchant to approve application access'
        return self._invoke('platform.installation_requests.create', {}, kwargs)

    def get(self, request_id: str, **kwargs: Unpack[inputs.PlatformInstallationRequestsGetArguments]) -> Result[models.PlatformInstallationRequestsGetData]:
        "Check this application's merchant approval request"
        return self._invoke('platform.installation_requests.get', {'requestId': request_id}, kwargs)
class PlatformInstallations(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get(self, installation_id: str, **kwargs: Unpack[inputs.PlatformInstallationsGetArguments]) -> Result[models.PlatformInstallationsGetData]:
        "Inspect this application's client installation"
        return self._invoke('platform.installations.get', {'installationId': installation_id}, kwargs)

    def revoke(self, installation_id: str, **kwargs: Unpack[inputs.PlatformInstallationsRevokeArguments]) -> Result[models.PlatformInstallationsRevokeData]:
        "Revoke this application's access to one client"
        return self._invoke('platform.installations.revoke', {'installationId': installation_id}, kwargs)
class PlatformOnboarding(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def create(self, **kwargs: Unpack[inputs.PlatformOnboardingCreateArguments]) -> Result[models.PlatformOnboardingCreateData]:
        'Request private merchant-hosted WhatsApp setup for an installed business'
        return self._invoke('platform.onboarding.create', {}, kwargs)

    def get(self, session_id: str, **kwargs: Unpack[inputs.PlatformOnboardingGetArguments]) -> Result[models.PlatformOnboardingGetData]:
        "Read this application's own setup-session outcome"
        return self._invoke('platform.onboarding.get', {'sessionId': session_id}, kwargs)
class PlatformSelf(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get(self, **kwargs: Unpack[inputs.PlatformSelfGetArguments]) -> Result[models.PlatformSelfGetData]:
        'Check application identity and effective configuration'
        return self._invoke('platform.self.get', {}, kwargs)
class PlatformSubscriptions(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)
        self.businesses = PlatformSubscriptionsBusinesses(transport)

    def list(self, **kwargs: Unpack[inputs.PlatformSubscriptionsListArguments]) -> Result[models.PlatformSubscriptionsListData]:
        'List current application-owned webhook receivers'
        return self._invoke('platform.subscriptions.list', {}, kwargs)

    def get(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsGetArguments]) -> Result[models.PlatformSubscriptionsGetData]:
        'Read an application-owned webhook receiver'
        return self._invoke('platform.subscriptions.get', {'subscriptionId': subscription_id}, kwargs)

    def create(self, **kwargs: Unpack[inputs.PlatformSubscriptionsCreateArguments]) -> Result[models.PlatformSubscriptionsCreateData]:
        'Create an application-owned webhook receiver'
        return self._invoke('platform.subscriptions.create', {}, kwargs)

    def update(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsUpdateArguments]) -> Result[models.PlatformSubscriptionsUpdateData]:
        'Update the reviewed receiver configuration'
        return self._invoke('platform.subscriptions.update', {'subscriptionId': subscription_id}, kwargs)

    def verify(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsVerifyArguments]) -> Result[models.PlatformSubscriptionsVerifyData]:
        'Verify an application-owned receiver'
        return self._invoke('platform.subscriptions.verify', {'subscriptionId': subscription_id}, kwargs)

    def activate(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsActivateArguments]) -> Result[models.PlatformSubscriptionsActivateData]:
        'Activate a verified receiver configuration'
        return self._invoke('platform.subscriptions.activate', {'subscriptionId': subscription_id}, kwargs)

    def pause(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsPauseArguments]) -> Result[models.PlatformSubscriptionsPauseData]:
        'Pause the receiver configuration'
        return self._invoke('platform.subscriptions.pause', {'subscriptionId': subscription_id}, kwargs)

    def disable(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsDisableArguments]) -> Result[models.PlatformSubscriptionsDisableData]:
        'Disable the receiver configuration'
        return self._invoke('platform.subscriptions.disable', {'subscriptionId': subscription_id}, kwargs)

    def rotate_secret(self, subscription_id: str, **kwargs: Unpack[inputs.PlatformSubscriptionsRotateSecretArguments]) -> Result[models.PlatformSubscriptionsRotateSecretData]:
        'Rotate the application-owned signing secret'
        return self._invoke('platform.subscriptions.rotate_secret', {'subscriptionId': subscription_id}, kwargs)
class PlatformUsage(SyncResource):
    def __init__(self, transport):
        super().__init__(transport)

    def get(self, business_id: str, **kwargs: Unpack[inputs.PlatformUsageGetArguments]) -> Result[models.PlatformUsageGetData]:
        "Read this application's own client API telemetry"
        return self._invoke('platform.usage.get', {'businessId': business_id}, kwargs)

class PlatformResources:
    def _init_resources(self, transport):
        self.blueprints = PlatformBlueprints(transport)
        self.business_creations = PlatformBusinessCreations(transport)
        self.businesses = PlatformBusinesses(transport)
        self.installation_requests = PlatformInstallationRequests(transport)
        self.installations = PlatformInstallations(transport)
        self.onboarding = PlatformOnboarding(transport)
        self.self = PlatformSelf(transport)
        self.subscriptions = PlatformSubscriptions(transport)
        self.usage = PlatformUsage(transport)
