# insideDM SDKs

Official SDKs for [insideDM](https://insidedm.io), the customer-conversation
platform for [WhatsApp automation](https://insidedm.io/whatsapp) and
[Instagram automation](https://insidedm.io/instagram).

Connect your backend to supported insideDM APIs: notify customers, synchronize
contact context, start published flows, track outcomes and serve independently
approved client businesses. The platform resolves each organization's WhatsApp
account; SDK consumers do not manage provider tokens or select a sender.

## Choose your SDK

| Runtime | Package | Status | Start here |
| --- | --- | --- | --- |
| Node.js 22+ — JavaScript and TypeScript | `@insidedm/sdk` on npm | Implemented alpha; npm publication pending | [Node.js quickstart](packages/node/README.md) |
| Python | PyPI distribution to be selected | Planned; no Python package is implemented or published | [Python status](packages/python/README.md) |

JavaScript and TypeScript share the Node.js SDK. Language packages have independent
versions and changelogs; releases use runtime-prefixed tags such as
`node-v0.1.0-alpha.0`. A future Python release will use its own version and
`python-v…` tag. There is no repository-wide package version.

## Start with Node.js

Build the current alpha from source; `npm install @insidedm/sdk` becomes available
after its first npm release:

```sh
git clone https://github.com/insideDM/sdk.git
cd sdk/packages/node
npm ci --ignore-scripts
npm run build
npm pack
```

Install the resulting tarball in your backend application, then configure one
server-side business key:

```ts
import { InsideDM } from '@insidedm/sdk';

const insideDM = new InsideDM({ apiKey: process.env.INSIDEDM_API_KEY! });
```

For local evaluation, pass your development API `baseUrl`. Production API and
provider acceptance and npm access remain pending.

## What would you like to build?

| Customer task | Guide |
| --- | --- |
| Send a WhatsApp notification | [Approved templates, preview, send and recovery](packages/node/README.md#send-a-notification) |
| Start an existing flow | [Discover inputs, submit an event and track the run](packages/node/README.md#start-a-published-flow-from-your-business-system) |
| Integrate client businesses | [Partner approval and first notification](packages/node/docs/partner-quickstart.md) |
| Reuse flows across approved clients | [Blueprints, controlled updates and native human review](packages/node/docs/blueprints.md) |
| Connect n8n or a slow external job | [Workflows, signed events and durable start/status receiver](packages/node/docs/n8n.md) |
| Read the complete supported interface | [Business reference](packages/node/docs/business-reference.md), [partner reference](packages/node/docs/partner-reference.md), [OpenAPI](packages/node/openapi/public-v1.yaml) |

An accepted message operation does not prove customer delivery. Event intake,
flow execution and human publication are separate stages. Each guide explains
the result meaning, required scopes and original-key recovery.

## Repository layout

```text
packages/
  node/       Node.js SDK, types, examples, tests and its own package version
  python/     Planned Python SDK; status only until implementation
.github/
  workflows/  Runtime-specific checks and release workflows
```

The Node workflow builds and checks Node 22 and 24. Its manually dispatched
release workflow uses the `npm` environment and publishes only the Node package.
A future Python package will have independent PyPI credentials, checks and a
release workflow; adding a language does not require releasing every other SDK.

See [contributing](CONTRIBUTING.md), [security reporting](SECURITY.md) and the
[Node publication guide](packages/node/PUBLICATION.md).

## License

The SDK source, examples, documentation and bundled API contract are licensed
under [MIT](LICENSE). Businesses and white-label partners may use, modify and
redistribute them commercially while retaining the copyright and license notice.
The private InsideDM backend and access to the hosted service are governed
separately; this license does not grant API credentials or service access.
