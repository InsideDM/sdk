# Importable n8n starting workflows

Import a JSON file with n8n's **Import from File** command. All examples are
inactive, contain no credentials or pinned execution data, and use built-in
nodes. The templates use HTTP Request 4.2, Code 2, Manual Trigger 1, Webhook 2
and Respond to Webhook 1.4. Use an n8n release supporting these node versions.
Their structure and expressions are checked locally; a live n8n import and
provider-backed execution have not been verified.

| File | Customer job | Required business-key scopes |
| --- | --- | --- |
| [sendNotification.json](sendNotification.json) | Submit one approved template notification and read its operation once | `messages.send`, `operations.read` |
| [startPublishedFlow.json](startPublishedFlow.json) | Turn a stable business event into a configured published flow start | `events.write`, `operations.read` |
| [recoverOperation.json](recoverOperation.json) | Find an uncertain send/start by its original intent key without repeating it | `operations.read` |
| [flowWebhookAction.json](flowWebhookAction.json) | Connect an existing flow HTTP action to a small synchronous n8n response | No InsideDM key; separate inbound Header Auth |

## Outbound setup

1. Create one n8n **Header Auth** credential with header name `Authorization` and
   value `Bearer <your scoped business key>`. Select it in each HTTP Request node.
   Keep the secret in credentials, never in Code, workflow JSON or item data.
2. Open the Configure node and replace all `REPLACE` values with your source
   action/event, approved template or published flow and known contact. The
   default placeholders stop execution before any HTTP request. No WhatsApp
   account selector is required; workspace discovery and backend sender resolution
   use the organization's existing account.
3. Use your development API origin for evaluation. The bundled default is
   `https://api.insidedm.io`; production acceptance remains a separate service
   gate. The HTTP nodes disable redirects and set a 20-second headers timeout.
   That n8n timeout is not the SDK's end-to-end deadline.
4. Run manually with an authorized test recipient. Replace the manual input
   with your CRM/order trigger only after mapping and retaining stable source
   identity. Keep body and key unchanged on retry. Do not use `$execution.id`,
   random values or a new timestamp as the business intent key.

The final status node makes one observation; it does not wait for customer
delivery or flow completion. Keep the returned operation ID and original intent
in your own durable source record. Use the recovery example after an uncertain
request. A later status-read failure must not trigger a new-key send. Configure
your own bounded progress scheduling or verified event receiver if needed.

Examples disable saved success/error/manual execution data to reduce retained
customer content. Your n8n deployment's logging, live execution view and failure
handling still need the access and retention settings appropriate to your data.
Retain business intent and reconciliation state in your own durable system.

## InsideDM flow to n8n

In `flowWebhookAction.json`, select a separate inbound Header Auth credential,
activate the workflow when ready, and copy the Webhook node's **Production URL**
into InsideDM's existing endpoint configuration with the matching auth header.
Leave the action's path override blank to preserve the complete Production URL.
The current `governed-webhook-followup` template (version 2) does this and fails
before waiting if the HTTP action fails. Existing version 1 sources retain their
fixed `/automation` path; upgrade through a reviewed blueprint draft update.
Use a unique path if you import multiple copies. Map the boolean `connected`
response into a declared flow response field if you need it. This response proves
only a synchronous connection check, not customer eligibility or an approval.

Keep real work within the flow action's deadline: default 10 seconds, maximum
30 seconds, and the remaining run budget. Return a response on every successful
path. A plain n8n webhook is not a durable idempotency receiver; leave POST retries
disabled until you implement retained deduplication and result recovery before
effects. An immediate 200 does not enable a later callback into a parked run.

For partner-operated workflows, keep the application credential on your backend
and broker approved `platform.forBusiness(savedBusinessId)` operations there.
These direct-business templates do not store or refresh partner delegations and
must not use the master application key as a business credential.

See [the complete n8n guide](../../docs/n8n.md) for event delivery and the verified
resource bridge. The examples do not expose an n8n editor, manage n8n credentials
or create an asynchronous flow-resume capability.

Source references: [n8n workflow import/export](https://docs.n8n.io/workflows/export-import/),
[HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/),
[Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
and [Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/).
