# Contributing to insideDM SDKs

This repository keeps language packages independent. Choose the runtime you are
changing, use its toolchain and update its own changelog. A repository commit can
contain changes to several runtimes without requiring a simultaneous release.

For the implemented Node.js SDK:

```sh
cd packages/node
npm ci --ignore-scripts
npm test
npm pack
```

Follow the [Node interface conventions](packages/node/CONTRIBUTING.md) for naming,
typed inputs, safe errors, lifecycle explanations and runnable customer tasks.
Node release tags use `node-v<version>` and the package retains its npm version.

For Python, follow [the Python contributor guide](packages/python/CONTRIBUTING.md).
Its `pyproject.toml`, types, changelog, PyPI identity, release workflow and
`python-v<version>` tags are separate from Node's. Shared API changes require
regenerating both runtimes from the reviewed public OpenAPI snapshot.

Shared repository documentation should accurately describe each runtime's current
capabilities. Never copy backend services, environment files, real customer data,
provider credentials or registry tokens into this repository. Report sensitive
issues through [the private security process](SECURITY.md).

Contributions to this repository are provided under its [MIT license](LICENSE).
