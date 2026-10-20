# Contributing

Contributions are provided under this SDK's [MIT license](LICENSE).

Use Node.js 22 or 24. Install with `npm ci --ignore-scripts`, run `npm test`, and run `npm pack` to check the distribution. Tests run without an InsideDM account, API key, or provider connection. Keep changes focused on a complete customer use case and include a changelog entry for public behavior changes.

The package root, `/webhooks`, and `/testing` are the supported entrypoints. Internal files are not public imports. Do not add runtime dependencies or another client resource without explaining the customer need and the supporting server contract. Configuration must remain local and side-effect free until a method is called. Never add real merchant data or credentials to fixtures.

Files under `src/generated` and the OpenAPI snapshot are synchronized from the authoritative API contract by maintainers. Do not fix contract drift by editing those snapshots independently. For an API change, describe the requested operation and behavior; maintainers must update the server contract and synchronize the generated files before merging it.

Public methods must remain usable from ESM and CommonJS and typecheck under NodeNext and Bundler resolution. Test failures and logs must not print credentials, full request URLs or message bodies. Report security issues through the private process in SECURITY.md.

## Interface conventions

- Use `client.resource.verb(input, requestOptions)`. Keep named business input separate from retry keys, timeouts and cancellation. Retain explicit duration units such as `timeoutMs`; avoid positional flags and duplicate aliases.
- Use `get` for one record, `list` for one page, `iterate` for lazy records and `pages` for lazy pages. Traversal must accept explicit bounds and preserve valid empty continuation pages.
- Name effects accurately: `replace` changes the full set, `update` changes the documented fields, and `requestPublication` requests human review. Never imply approval, execution or delivery from a submission receipt.
- Require only the key at initialization. Do not add environment reads, network I/O, sender selection or implicit permission grants to construction. Direct and partner business clients share methods and input types.
- Use typed named choices and discriminated content. Keep explicit `null` clearing semantics where supported; explain required template variables and discovered IDs beside their first use.
- Write hover help for resources, methods and options. State the effect, scope, result meaning and recovery path for consequential actions. Preserve that JSDoc in emitted declarations.
- Throw the existing typed errors. Local validation should name a documented field and provide a fixed corrective hint before I/O. Do not echo supplied values, arbitrary unknown property names or caller-thrown messages. Keep server problems and recovery context explicit.
- Put complete customer tasks before advanced configuration. Check examples against an installed exported kit and inspect editor help. A synthetic walkthrough is not independent customer research or live provider acceptance.

These conventions follow the productivity and consistency goals in the
[Azure TypeScript SDK guidance](https://azure.github.io/azure-sdk/typescript_introduction.html)
and the readable named-method conventions in the
[Slack Node SDK](https://docs.slack.dev/tools/node-slack-sdk/web-api/).
