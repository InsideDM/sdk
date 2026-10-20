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

Python is planned. Do not add a placeholder package, version or release workflow
that implies an implemented SDK. Its eventual `pyproject.toml`, tests, changelog,
PyPI identity and `python-v<version>` releases will be separate from Node's.

Shared repository documentation should accurately describe each runtime's current
capabilities. Never copy backend services, environment files, real customer data,
provider credentials or registry tokens into this repository. Report sensitive
issues through [the private security process](SECURITY.md).
