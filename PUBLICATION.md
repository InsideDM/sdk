# Public kit and npm publication

This package is maintained alongside its authoritative backend contract, then exported as a standalone source repository. Contract generation runs only in the private monorepo. Public contributors need no access to that monorepo to build, test or pack the exported kit.

## Prepare the repository

1. Set the owner-approved repository and license in `package.json`; include the corresponding license text. Confirm that copied public contract and signing-code sources may be distributed under that license. `UNLICENSED` deliberately blocks release until that decision is recorded.
2. Confirm ownership and availability of the npm scope and package name. The current planned name is `@insidedm/sdk`; its availability has not been asserted.
3. Generate the standalone npm lockfile with `npm install --package-lock-only --ignore-scripts`, then run `npm ci --ignore-scripts`, `npm test` and `npm pack` in a clean exported directory.
4. Export with `npm run export:kit -- --out /absolute/new-directory`. The exporter refuses existing destinations and copies an explicit allowlist. Inspect the result, including the npm dry-run manifest. Create the intended public GitHub repository and push that curated directory after publication is authorized. Do not make the application monorepo public.
5. Add the actual repository URL, bugs URL and homepage to package metadata. Set the public repository's main branch protection, private vulnerability reporting and an `npm` environment for releases. A release must correspond to a reviewed version commit on `main`; tag it consistently as `v<package version>`. The release workflow refuses other branches.

## Contract updates in the application monorepo

Run `node scripts/sdk/syncContract.mjs`, review the resulting diff and run `node scripts/sdk/syncContract.mjs --check`. The generator snapshots public wire types, vocabulary, schemas, operation descriptors, key grammar and the signing codec. It strips private imports. Its closed manifest permits the reviewed contact PATCH and message/preview/lookup/cancel POST operations; other new non-GET operations require review.

Deployment verification for this alpha includes custom-field updates and notification execution: configure the dedicated transport secret at edge and owner, register the edge's public verification key, deploy its private signing key only to the edge, and rebuild a disposable database from the current schema. Deploy the owning message worker and the UI connector together; the previous inbox reply route is retired. Exercise one approved test contact, same-key replay, changed-input conflict, consent withdrawal, cancellation, lost response and revocation through the SDK. Local provider tests replace the network and do not prove production Meta acceptance. Missing signing or transport configuration returns `dependency_unavailable`; an unconfigured operation must not be described as production-ready.

These files are contract snapshots, not a second backend implementation. There is no SDK-specific business route. Any operation added later must first follow the shared-endpoint architecture: one operation, DTO and owning handler for UI and SDK, with appropriate authentication adapters. Do not add an SDK route beside an existing UI route for the same action.

## Release checks

`npm run check:release` requires approved metadata and license text, a version/changelog match, the npm lockfile, a clean distribution audit and the default production origin's TLS/readiness/public-API probes. Its network probes are anonymous. Local pack/test commands remain usable while publication is blocked.

The public GitHub Actions workflows use pinned official actions and test Node 22 and 24. The release workflow runs only through manual dispatch and the `npm` environment. Prereleases publish under `next`; stable versions publish under `latest`. It uses npm trusted publishing and provenance; configure the exact public GitHub owner, repository, workflow filename `release.yml`, and environment `npm` in npm before invoking it. Use a supported npm version (at least 11.5.1) on a GitHub-hosted runner. Choose publisher permissions that permit publication, rather than staging alone. Bootstrap of a new npm package may require a separate authorized first-publish step; this workflow does not create npm accounts, organizations or publisher associations.

Do not put long-lived npm tokens, API keys, webhook secrets, environment manifests, backend packages, infrastructure configuration or private issue links in the public kit. The export and distribution audits are guardrails; review the complete source export before its first public push.

CI verifies package contents and consumers without network calls to InsideDM. It does not prove production authorization, tenant isolation, throttling, webhook delivery or backend availability. Those remain backend deployment acceptance checks and must pass before the first customer release.
