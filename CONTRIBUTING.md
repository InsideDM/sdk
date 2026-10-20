# Contributing

Use Node.js 22 or 24. Install with `npm ci --ignore-scripts`, run `npm test`, and run `npm pack` to check the distribution. Tests run without an InsideDM account, API key, or provider connection. Keep changes focused on a complete customer use case and include a changelog entry for public behavior changes.

The package root, `/webhooks`, and `/testing` are the supported entrypoints. Internal files are not public imports. Do not add runtime dependencies or another client resource without explaining the customer need and the supporting server contract. Configuration must remain local and side-effect free until a method is called. Never add real merchant data or credentials to fixtures.

Files under `src/generated` and the OpenAPI snapshot are synchronized from the authoritative API contract by maintainers. Do not fix contract drift by editing those snapshots independently. For an API change, describe the requested operation and behavior; maintainers must update the server contract and synchronize the generated files before merging it.

Public methods must remain usable from ESM and CommonJS and typecheck under NodeNext and Bundler resolution. Test failures and logs must not print credentials, full request URLs or message bodies. Report security issues through the private process in SECURITY.md.
