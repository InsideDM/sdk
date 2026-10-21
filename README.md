# insideDM SDKs

**Build customer messaging and automation integrations with insideDM.**

Official SDKs for [insideDM](https://insidedm.io), the platform for
[WhatsApp automation](https://insidedm.io/whatsapp) and
[Instagram DM automation](https://insidedm.io/instagram).
Connect your applications to supported insideDM APIs for WhatsApp notifications,
contact synchronization and published flows.

## Choose your SDK

| Language | Package | Status | Documentation |
| --- | --- | --- | --- |
| JavaScript / TypeScript · Node.js 22+ | [`@insidedm/sdk`](https://www.npmjs.com/package/@insidedm/sdk) | Alpha channel: `next` | [Quickstart and examples](packages/node/README.md) |
| Python 3.11+ · sync / asyncio | `insidedm` | First alpha prepared; PyPI publication pending | [Quickstart and API reference](packages/python/README.md) |

Each language package has independent versions, changelogs and releases.

## Get started with Node.js

```sh
npm install @insidedm/sdk@next
```

```ts
import { InsideDM } from '@insidedm/sdk';

const insideDM = new InsideDM({
  apiKey: process.env.INSIDEDM_API_KEY!,
});
```

Use a scoped business key from insideDM. The SDK resolves your workspace and its
WhatsApp account automatically. Applications call the insideDM service at
`https://api.insidedm.io`; no provider token or sender selection is required.
The endpoint is managed by the SDK. The alpha is for pre-production evaluation;
hosted production acceptance is pending. Use the offline client in the Node.js
guide to explore the interface without service access.

Continue with the [WhatsApp notification quickstart](packages/node/README.md#quickstart-send-a-whatsapp-notification).

## Build with insideDM

| Customer task | Guide |
| --- | --- |
| Send WhatsApp notifications | [Templates, sending and operation recovery](packages/node/README.md) |
| Synchronize customer context | [Contacts, tags, custom fields and pagination](packages/node/docs/business-reference.md) |
| Trigger an automation | [Published flow inputs and run progress](packages/node/docs/business-reference.md#start-a-published-flow-from-your-business-system) |
| Connect n8n | [Integration guide and importable workflows](packages/node/docs/n8n.md) |
| Explore the API | [API reference](packages/node/docs/business-reference.md), [OpenAPI](packages/node/openapi/public-v1.yaml) |

Each guide explains permissions, safe retry keys and result meanings. Submitted
work, flow completion and customer delivery remain distinct stages.

## Get started with Python

```python
import os
from insidedm import InsideDM

with InsideDM(api_key=os.environ["INSIDEDM_API_KEY"]) as client:
    workspace = client.workspace.get()
    print(workspace.data.id)
```

Python supports the same reviewed API contract, typed snake_case inputs and results,
native sync and asyncio clients, safe retries, pagination and signed webhooks.
See its [installation status and notification quickstart](packages/python/README.md),
[API reference](packages/python/docs/api-reference.md) and
[source installation](packages/python/CONTRIBUTING.md).

## Develop from source

```sh
git clone https://github.com/insideDM/sdk.git
cd sdk/packages/node
npm ci --ignore-scripts
npm run build
npm pack
```

The repository groups implementations under `packages/node` and `packages/python`.
Runtime-specific checks and manual releases live in
`.github/workflows`. Node releases use `node-v<version>` tags; future Python
releases use `python-v<version>` with their own PyPI workflow.

See [contributing](CONTRIBUTING.md), [security reporting](SECURITY.md),
[Node release notes](packages/node/CHANGELOG.md) and
[publication guidance](packages/node/PUBLICATION.md).

## License

[MIT](LICENSE) covers the SDK source, examples, documentation and bundled API
contract. Use, modify and redistribute them commercially while retaining the
copyright and license notice. The private
backend and hosted-service access are governed separately.
