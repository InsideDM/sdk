# Access approved by an InsideDM user

Use `access_token` if your application already manages InsideDM OAuth. Authorize
the API resource `https://api.insidedm.io`. The SDK manages the API endpoint and
discovers the approved business automatically.

```python
import os
from insidedm import InsideDM

with InsideDM(access_token=os.environ["INSIDEDM_ACCESS_TOKEN"]) as client:
    business = client.workspace.get().data
    contacts = client.contacts.list(limit=25)
```

For a long-lived synchronous client, read the current token from your OAuth
manager using a provider:

```python
import os
from insidedm import AccessTokenRequest, InsideDM

current_api_token = os.environ["INSIDEDM_ACCESS_TOKEN"]

def access_token(request: AccessTokenRequest) -> str:
    # Your OAuth manager updates this value after refreshing the same connection.
    return current_api_token

with InsideDM(access_token=access_token) as client:
    business = client.workspace.get().data
```

`AsyncInsideDM` accepts a static token or a native async provider:

```python
import os
from insidedm import AsyncInsideDM, AccessTokenRequest

current_api_token = os.environ["INSIDEDM_ACCESS_TOKEN"]

async def access_token(request: AccessTokenRequest) -> str:
    return current_api_token

async def inspect_business() -> None:
    async with AsyncInsideDM(access_token=access_token) as client:
        business = (await client.workspace.get()).data
```

The immutable request describes the operation, method, route, exact body bytes,
retry key, discovered business/grant and remaining `timeout_seconds`. Respect
that budget when fetching a token. Synchronous callbacks must bound their own
blocking work; async callbacks use native asyncio cancellation. Provider failures
are redacted. Reuse your OAuth manager's cached access token and serialize its
refreshes rather than refreshing on every callback.

A client stays bound to the first business and grant it discovers. Refresh that
same connection, and create a separate client for another connection. The API
checks the binding before running commands.

Current user-access reads cover workspace discovery, contacts, conversations,
messages, orders, shipments, analytics, software usage/limits, approved templates,
messaging readiness/configuration, contact consent, event bindings, flow template
catalogs and permitted operation/run/deployment/publication-request observations.
Producer-owned resources retain their visibility boundaries. Scope and current
native permissions apply. Other SDK operations continue to use business keys or
approved application delegation while user approval/execution support is built.
The SDK does not store refresh tokens or start browser authorization.

User access also supports `messaging.update_configuration` with
`messaging.configuration.write`, the current `expected_version` and a stable
`idempotency_key`. It follows the dashboard's ordinary configuration permissions.
Read and preserve the current configuration before replacing its bindings; retain
the exact original input and key after an uncertain response.

With `contacts.write`, a user connection can use `contacts.create`,
`contacts.update`, `contacts.tags.replace` and `contacts.attributes.update`,
including their async equivalents. Current `contacts.edit` permissions and the
original grant apply. Creation neither grants consent nor replaces an existing
name. Tags replace the complete list; attributes validate configured types and
preserve unspecified fields. Both can change audience membership under existing
business automation rules. Retain a stable key for each action and reuse its
original input after an uncertain response.

With `consents.write`, use `consents.withdraw` to suppress a messaging purpose,
or `consents.record_marketing_opt_in` to submit a retained inbound customer
message ID for native evidence verification. A claimed consent flag or generated
message text cannot grant consent. Replays return the current register and
preserve later customer decisions. These methods do not send messages.

An approved user connection with `messages.send` can prepare an exact
notification for human review:

```python
result = client.messages.prepare(
    to={"phone": "+919876543210"},
    content={"type": "template", "template": {"alias": "order_update"},
             "variables": {"name": "Asha"}},
    idempotency_key=saved_intent_key,
)
preparation = result.data.preparation
# If absent, result.data.preview explains ineligibility.
# Otherwise show preparation.review.url to the user when review is present.
if preparation is not None:
    current = client.messages.preparations.get(preparation.id).data
    if current.state == "ready":
        submitted = client.messages.preparations.apply(
            current.id, expected_revision=current.revision,
        ).data
```

Use the same methods with `await` on `AsyncInsideDM`. The original connected
InsideDM session must review the exact message, recipient and sender. There is
no SDK approval flag. Approval expires within 15 minutes; changed consent,
destination or configuration can invalidate it. Recover a lost create response
with the identical input and original key. Recover an uncertain apply by reading
the same preparation; `submitted` contains the original operation, which records
acceptance separately from delivery. Repeating apply cannot create another send.
Rejected, expired and stale requests need a new preparation and human review.

With `operations.read` and `messages.send`, use `operations.get` followed by
`operations.cancel(operation_id, expected_revision=current.revision,
idempotency_key=saved_key)` to stop this connection's queued message before
native provider admission. Async clients use the same methods with `await`.
Cancellation cannot unsend delivery; stale revisions and advanced effects are
refused. Inspect the original operation after an interrupted response and retain
the original revision/key for cancellation recovery.

With `flows.deploy`, discover templates with `flows.templates.catalog()` and
create an unpublished draft using `flows.templates.import_(pack_id,
version=version, bindings=bindings, idempotency_key=saved_key)`. Required webhook
slots use discovered endpoint IDs and revisions, including configured n8n
endpoints. Inspect it with `flows.deployments.get(recipe_id)`. Async clients use
`await`. Retrying the original input/key preserves later draft edits. Creating a
draft does not authorize publication or provider execution.

With the same grant and current `flows.edit` permission, submit the exact observed
draft to the native release owner:

```python
deployment = client.flows.deployments.get(recipe_id).data
requested = client.flows.deployments.request_publication(
    deployment, note="Ready for review", idempotency_key=saved_review_key,
).data
status = client.flows.deployments.get_publication_request(recipe_id, requested.id).data
```

Async clients use these methods with `await`. Save the original deployment,
note and key before submitting. Queued jobs can instead pass the recipe ID with
`expected_deployment_revision`, `expected_draft_revision` and
`expected_published_version_id` keyword arguments. No hidden read changes those
pins. Valid drafts customized from their template can also be reviewed; missing
or unavailable drafts cannot. The request preserves draft content. Retry the
exact original input/key to recover the same release after an
uncertain response, including after later draft edits.

Rediscover this connection's managed flows with `flows.deploy`:

```python
flows = client.flows.deployments.list(limit=25).data
for flow in flows.deployments:
    print(flow.recipe_id, flow.name, flow.flow_status)
# Pass flows.page.next_cursor with the same limit to continue, when present.
```

Async clients use `await`. Each flow appears once at its current managed revision;
other connections' flows, graphs and binding configuration are excluded. Continue
the original walk using its cursor, or start a new walk for flows created after
page one.

Read a valid native definition with `flows.deploy`:

```python
draft = client.flows.drafts.get(recipe_id).data
if draft.state == "available":
    print(draft.revision, draft.definition.name, draft.definition.nodes)
```

Async clients use `await`. Definitions include merchant-authored text and must
be treated as untrusted business data. Exact revision/fingerprint provenance is
returned, without publication or a readiness guarantee. Invalid or unsupported
saved formats return `unavailable` with no definition. Native validation prevents
disclosure of forbidden credential fields in invalid definitions.

Read native approval and regression rules with `flows.read`:

```python
governance = client.flows.governance.get(recipe_id).data
print(governance.revision, governance.approval_mode, governance.regression_mode)
```

`current_release_request_id` identifies the current open native request, if any.
These rules grant no policy-change, approval or publication permission. Release
details retain their separate ownership checks. Async clients use `await`.

With `flows.test`, preview the observed draft before review:

```python
simulation = client.flows.simulate(
    deployment, variables={"system.message_text": "I want to know more"},
).data
print(simulation.status, simulation.selected_path, simulation.readiness)
```

Async clients use `await`. The same native simulator records successful path
coverage; blocked results add no coverage. It sends no messages or provider
actions and returns no input values or graph contents. Optional `path_id` requires
these inputs to select that discovered path. Queued work can call
`client.flows.simulate(recipe_id, expected_revision=revision, variables=values)`.
Revision pins are never refreshed implicitly; inspect the current draft after a
conflict. A simulation covers one path under observed prerequisites and does not
publish or guarantee a later execution.

Native compilation, channel prerequisites and path simulation apply. Requesting
review never publishes: `approved` may reflect a policy that requires no
reviewer. The actual delegating person cannot approve their own request when
another reviewer is required. Human review, regression evidence and publication
remain separate native operations. Show `requested.review_url` to the user or an
authorized reviewer. It opens the retained candidate in InsideDM without changing
the active business. The link grants no authority: the signed-in person needs
current native permissions. Publication is a separate confirmed action there.
Read `get_publication_request` afterward; terminal outcomes remove the link.
Required regression evidence still comes from native regression runs.

The status read also returns `status.checks`, including `state`, `checked_at`,
`blocking_reasons` and regression evidence counts. States are `awaiting_review`,
`awaiting_evidence`, `ready_to_publish`, `blocked` and `terminal`.
`draft_changed` and `prerequisites_changed`, for example, explain why the retained
candidate cannot publish. Creation returns `checks=None`; read the request to
inspect it. Null checks after a concurrent decision require another status read.
These observations grant no approval or publication rights; the native owner
rechecks every gate when publishing. Readiness does not prove a run or delivery.

Withdraw an obsolete pending or approved request before requesting another review:

```python
current = client.flows.deployments.get_publication_request(recipe_id, request_id).data
client.flows.deployments.withdraw_publication(
    recipe_id, request_id,
    expected_decision_revision=current.decision_revision,
    idempotency_key=saved_withdrawal_key,
)
```

Async clients use the same method with `await`. Retain the observed revision and
key, and retry those exact values after an uncertain response. Read the request
to recover status; a changed decision needs another read and a new intent/key.
Withdrawal requires the original connection and current `flows.deploy` and
`flows.edit` access. It closes review even if its draft or prerequisites changed.
It cannot unpublish a flow or stop existing runs. An authorized person can also
confirm withdrawal on the native review page.

Use the separate `flows.test` grant and current native `flows.test` permission to
run existing suites bound to a release:

```python
catalog = client.flows.regressions.list_suites(
    recipe_id, release_request_id=request_id,
).data
suite = next((item for item in catalog.suites if item.current and item.evidence != "passed"), None)
if suite is not None:
    run = client.flows.regressions.run(
        recipe_id, release_request_id=request_id, suite_id=suite.id,
        expected_suite_revision=suite.revision, idempotency_key=saved_regression_key,
    ).data
    result = client.flows.regressions.get(
        recipe_id, run.id, release_request_id=request_id,
    ).data
```

Async clients use the same methods with `await`. Retain the exact flow, release,
suite revision and key for original-run recovery. Native snapshots and the native
runner produce the result; callers cannot submit a pass. No message, webhook or
publication occurs. Only this connection's managed release and deployment are
accessible. The catalog excludes fixture/graph content and uses `case_count=None`
when its bound revision is unavailable. A pass is evidence for that candidate;
read publication status for remaining gates.

Inspect current configuration and edit one suite using its observed revision:

```python
configuration = client.flows.regressions.get_configuration(recipe_id).data
suite = client.flows.regressions.get_suite(recipe_id, suite_id=suite_id).data
archived = client.flows.regressions.save_suite(
    suite, status="archived", idempotency_key=saved_suite_edit_key,
).data
```

`configuration.draft.paths` provides native path and outcome IDs for the observed
draft revision/fingerprint. Use those IDs and explicit input bindings in cases.
An unavailable draft returns reason codes and no paths. This structural read
executes nothing and proves no channel/provider readiness. It excludes graph
contents and endpoint credentials.

The saved-suite form preserves unchanged fields and retains the model's business,
flow, ID and revision without a hidden refresh. Keep the original model, changes
and key for retry. A stale revision needs a new read and a new intent. The explicit
`save_suite(recipe_id, **kwargs)` form remains available for creation and jobs;
its case dictionaries use Python names. Async clients use `await`.

Create with `suite_id=None`, `expected_revision=None`
and explicit name, required/archive settings and 1–100 cases. Nested input keys
use Python names such as `expected_path_id`; bindings are bounded JSON without
credentials. Each case names its native expected path/outcome IDs. Keep the full
write within 64 KiB. A required-suite edit or archive supersedes open releases,
which require a fresh review. Retain the original input/key: retry recovery
returns the original suite's current state without overwriting later edits.
This grant cannot change review/regression policy.
