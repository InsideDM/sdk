# insideDM Python SDK

Typed WhatsApp messaging, customer data and workflow automation for Python,
from [insideDM](https://insidedm.io).

The first Python alpha is being prepared for PyPI. The SDK implements the same
reviewed business and application API contract as the Node SDK. Hosted API and
provider availability are separate from package installation.

Once `insidedm==0.1.0a0` is published, install the official alpha with:

```sh
python -m pip install insidedm==0.1.0a0
```

Until then, use the [source installation guide](CONTRIBUTING.md).

## Configuration and first notification

Use Python 3.11+ and a scoped server key from your insideDM workspace. The SDK
always connects to `https://api.insidedm.io`; your organization has one WhatsApp
account, resolved by the backend. No endpoint or account selector is required.

```python
import os
from insidedm import InsideDM

with InsideDM(api_key=os.environ["INSIDEDM_API_KEY"]) as client:
    result = client.messages.send(
        to={"phone": "+919800000099"},
        content={
            "type": "template",
            "template": {"id": os.environ["INSIDEDM_TEMPLATE_ID"]},
            "variables": {"name": "Asha"},
        },
        idempotency_key="orders/order-123/shipped",
    )
    print(result.data.id, result.data.state, result.meta.request_id)
```

Use an approved template, your actual variable names and an authorized customer.
Submission requires `messages.send`; tracking requires `operations.read`.
Acceptance is separate from provider submission and customer delivery.

Native asyncio uses `AsyncInsideDM` with the same resources and methods:

```python
from insidedm import AsyncInsideDM

async def inspect_notification(api_key: str, operation_id: str) -> None:
    async with AsyncInsideDM(api_key=api_key) as client:
        result = await client.operations.get(operation_id)
        print(result.data.state, result.meta.request_id)
```

Keep a client for your process/async application lifespan, or use its context
manager. Close it with `close()` or `aclose()`. Injected HTTPX2 clients remain
owned by their caller. An async client belongs to one event loop.

## What you can build

| Task | Python interface |
| --- | --- |
| Check WhatsApp setup and approved templates | `messaging.get_readiness()`, `messaging.get_configuration()`, `templates.list()` |
| Inspect a notification before sending | `messages.preview(to=..., content=...)` |
| Send and track a notification | `messages.send(...)`, `operations.get(operation_id)`, `messages.get(message_id)` |
| Recover an uncertain submission | `operations.lookup(kind="messages.send", idempotency_key=...)` |
| Synchronize customer context | `contacts.create(...)`, `contacts.update(...)`, `contacts.tags.replace(...)`, `contacts.attributes.update(...)` |
| Read conversations and commerce context | `conversations.list()`, `conversations.messages.list(conversation_id)`, `orders.list()`, `orders.shipments.list(order_id)` |
| Respect consent | `consents.get(contact_id=...)`, `consents.withdraw(...)`, `consents.record_marketing_opt_in(message_id=...)` |
| Start an existing published flow | `events.bindings.list()`, `events.publish(...)`, `flows.runs.get(run_id)` |
| Inspect software usage and limits | `usage.get(from_=..., to=...)`, `usage.get_limits()` |
| Verify signed updates | `insidedm.webhooks.construct_webhook_event(...)` |

The [complete API reference](docs/api-reference.md) includes flow templates,
saved-source draft updates and application resources. The SDK uses the same
backend capabilities as the dashboard. It does not add flow publication authority
or bypass business permissions. Marketing opt-in records require existing inbound
customer evidence; they cannot manufacture consent.

## Customers and automation

```python
with InsideDM(api_key=os.environ["INSIDEDM_API_KEY"]) as client:
    customer = client.contacts.create(name="Asha", phone="+919800000099")
    client.contacts.tags.replace(customer.data.contact_id, tags=["vip", "repeat-buyer"])

    for contact in client.contacts.iter_items(limit=50, max_items=100):
        print(contact.id)
```

An event runs an event binding configured against a published flow in insideDM:

```python
with InsideDM(api_key=os.environ["INSIDEDM_API_KEY"]) as client:
    result = client.events.publish(
        id="orders/order-123/paid",
        binding=os.environ["INSIDEDM_EVENT_BINDING_ID"],
        subject={"contact_id": os.environ["INSIDEDM_CONTACT_ID"]},
        properties={"orderId": "order-123", "total": 1499},
    )
    print(result.data.id, result.meta.request_id)
```

Event `id` is the durable intent key; do not supply a second `idempotency_key`.
Inspect the binding's declared inputs and scopes before publishing. Acceptance
of an event and completion of the resulting flow are separate stages. Use n8n
through your server or an authenticated HTTP bridge; keep SDK keys in server
credentials. The flow builder remains the owner of native conversation behavior.

## Errors and recovery

```python
from insidedm import InsideDMAPIError, InsideDMTransportError

try:
    with InsideDM(api_key=os.environ["INSIDEDM_API_KEY"]) as client:
        result = client.operations.lookup(
            kind="messages.send", idempotency_key="orders/order-123/shipped"
        )
except InsideDMAPIError as error:
    print(error.code, error.status, error.request_id)
except InsideDMTransportError as error:
    print(error.code, error.retryable)
```

`InsideDMConfigurationError` identifies invalid local input before I/O;
`InsideDMProtocolError` rejects malformed or mismatched responses. Standard error
text and result representations exclude bodies, keys and private setup links.
Explicit `error.problem`, `error.recovery` and model serialization may contain
sensitive data; keep them out of ordinary logs.

On a lost write response, look up the saved intent key before deciding whether to
retry. `error.recovery` exposes the operation and captured key for supported
writes. Reuse the same logical key and identical input; do not generate a new key
for each attempt. A new business action needs a new key. `operations.cancel()`
requests cancellation only where the backend permits it; it cannot recall a
message already submitted to a provider.

## Explore without API access

```python
from insidedm.testing import create_test_client

with create_test_client() as demo:
    workspace = demo.workspace.get()
    print(workspace.data.id)
```

Offline clients use synthetic contract fixtures and cannot reach the network.
They exercise real SDK methods, not WhatsApp delivery or a hosted sandbox. Supply
an explicit `respond` fixture for complex application and flow scenarios. Native
async fixtures use `create_async_test_client()`.

## Request behavior

Optional request controls use seconds: `timeout_seconds=20`,
`attempt_timeout_seconds=10`, `max_retries=2` (at most five retries). Retries reuse
the captured body and intent key. Persist your own logical key before a write
when recovery must survive a process restart. Reads do not accept write keys.

The async total deadline covers discovery, HTTP I/O and retry waits. The sync
client shares the same logical budget and caps blocking I/O timeouts and body
reads to the remaining budget. An operating-system DNS call or custom sync
transport cannot be forcibly interrupted; the sync timeout is not an absolute
wall-clock guarantee. There are no hidden request threads.

`list()` reads one page. `iter_pages()` and `iter_items()` fetch lazily; use
`max_pages`/`max_items` or stop iteration to bound work. Empty continuation pages
are valid. Expired or repeated cursors are errors rather than silent restarts.

Python field names use `snake_case`, including `result.meta.request_id` and
`result.page.next_cursor`. Dictionary keys belonging to your own template
variables, custom fields and event payloads are preserved exactly. Omitted
optional fields stay absent; explicit `None` is sent as JSON null only where
the operation permits it.

Typed request dictionaries and response models are available through
`from insidedm.types import inputs, responses`. SDK calls infer their result types.
Responses expose snake_case attributes, and `.model_dump(by_alias=True,
exclude_unset=True)` produces wire field names when storing a source or preview.
Ordinary customers do not need to construct response models.

See [webhook verification](docs/webhooks.md), the [API reference](docs/api-reference.md),
[release notes](CHANGELOG.md), [contributing](CONTRIBUTING.md) and
[publishing](PUBLICATION.md).

Copyable [sync/async notifications](examples/notifications.py) and
[customer synchronization and flow events](examples/customer_context.py) show the
same typed interface in ordinary server functions.

## About insideDM

[insideDM](https://insidedm.io) connects
[WhatsApp messaging](https://insidedm.io/whatsapp),
[Instagram conversations](https://insidedm.io/instagram) and business automation.
The SDK uses existing flows and business configuration from the dashboard.
Package installation is separate from hosted API and provider availability.

[Source and issues](https://github.com/InsideDM/sdk) · [MIT license](https://github.com/InsideDM/sdk/blob/main/LICENSE)
