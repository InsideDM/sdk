# insideDM SDKs

**Build customer messaging and automation integrations with insideDM.**

Official SDKs for [insideDM](https://insidedm.io), the platform for
[WhatsApp automation](https://insidedm.io/whatsapp) and
[Instagram DM automation](https://insidedm.io/instagram).
Connect your applications to supported insideDM APIs for WhatsApp notifications,
contact synchronization, published flows and approved partner integrations.

## Choose your SDK

| Language | Package | Status | Documentation |
| --- | --- | --- | --- |
| JavaScript / TypeScript · Node.js 22+ | [`@insidedm/sdk`](https://www.npmjs.com/package/@insidedm/sdk) | Alpha channel: `next` | [Quickstart and examples](packages/node/README.md) |
| Python | Planned | Not implemented or published | [Python status](packages/python/README.md) |

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
The alpha is for pre-production evaluation. While hosted production acceptance is
pending, use `baseUrl` to connect to an existing insideDM test deployment.

Continue with the [WhatsApp notification quickstart](packages/node/README.md#quickstart-send-a-whatsapp-notification).

## Build with insideDM

| Customer task | Guide |
| --- | --- |
| Send WhatsApp notifications | [Templates, sending and operation recovery](packages/node/README.md) |
| Synchronize customer context | [Contacts, tags, custom fields and pagination](packages/node/docs/business-reference.md) |
| Trigger an automation | [Published flow inputs and run progress](packages/node/docs/business-reference.md#start-a-published-flow-from-your-business-system) |
| Serve client businesses | [Partner, reseller and white-label onboarding](packages/node/docs/partner-quickstart.md) |
| Reuse automations across clients | [Blueprints, updates and publication review](packages/node/docs/blueprints.md) |
| Connect n8n | [Integration guide and importable workflows](packages/node/docs/n8n.md) |
| Explore all supported operations | [Business reference](packages/node/docs/business-reference.md), [partner reference](packages/node/docs/partner-reference.md), [OpenAPI](packages/node/openapi/public-v1.yaml) |

Each guide explains permissions, safe retry keys and result meanings. Submitted
work, flow completion and customer delivery remain distinct stages.

## Develop from source

```sh
git clone https://github.com/insideDM/sdk.git
cd sdk/packages/node
npm ci --ignore-scripts
npm run build
npm pack
```

The repository groups implementations under `packages/node` and, when implemented,
`packages/python`. Runtime-specific checks and manual releases live in
`.github/workflows`. Node releases use `node-v<version>` tags; future Python
releases will use `python-v<version>` with their own PyPI workflow.

See [contributing](CONTRIBUTING.md), [security reporting](SECURITY.md),
[Node release notes](packages/node/CHANGELOG.md) and
[publication guidance](packages/node/PUBLICATION.md).

## License

[MIT](LICENSE) covers the SDK source, examples, documentation and bundled API
contract. Businesses and white-label partners may use, modify and redistribute
them commercially while retaining the copyright and license notice. The private
backend and hosted-service access are governed separately.
