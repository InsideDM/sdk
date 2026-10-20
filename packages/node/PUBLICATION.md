# Public kit and npm publication

The SDK source, examples, documentation and bundled API contract use [MIT](LICENSE).
The private backend and hosted-service access are governed separately. Preserve
the license in source exports and npm artifacts.

The public repository is `insideDM/sdk`. Node lives in `packages/node` with its own
version and changelog. Python is planned; its eventual release will be independent.
Run the commands below from `packages/node` in the public repository.

## Prepare the repository

1. Confirm npm scope/package publishing access for `@insidedm/sdk`.
2. Keep `package.json` and the standalone lockfile aligned. From a clean export,
   run `npm ci --ignore-scripts`, `npm test` and `npm pack`; inspect the manifest.
3. `npm run export:kit -- --out /absolute/new-directory` copies an allowlist,
   including root and Node licenses, and refuses existing destinations. Review
   source changes before pushing. Never publish the private application monorepo.
4. Preserve registered repository casing, `directory: packages/node`, branch
   protection, private vulnerability reporting and the `npm` environment.
   Node tags use `node-v<package version>` from reviewed `main`; other runtimes
   use their own tag prefixes and versions.

## Contract updates in the application monorepo

Maintainers run `node scripts/sdk/syncContract.mjs`, review the diff, then run it
with `--check`. It snapshots reviewed public types, schemas, operations and signing
code while removing private imports. New writes require contract review. Public
contributors can build and check the kit without the private repository.

Backend acceptance requires current edge/owner transport and signing configuration,
a disposable schema rebuild, and coordinated worker/UI deployment. Exercise an
approved test contact, replay, changed-input conflict, consent withdrawal,
cancellation, lost response and revocation. Missing signing or transport returns
`dependency_unavailable`. Local provider substitutes do not prove Meta acceptance.

UI and SDK actions share one operation, DTO and owning handler with appropriate
authentication adapters. Do not add a duplicate SDK business route.

## Release checks

`npm run check:release` checks license/metadata, version/changelog, lockfile and
artifact audit. It needs no cloud access. `npm run check:deployment` separately
probes production TLS/readiness/API behavior. A published alpha does not establish
service readiness. The SDK manages its endpoint; offline fixtures support
evaluation until hosted production acceptance passes.

Pinned Actions check Node 22/24. Manual `node-release.yml` uses environment `npm`,
publishing only Node: prereleases under `next`, stable versions under `latest`.
Configure npm trusted publishing for the exact owner/repository, that workflow
and environment; use npm 11.5.1+ on a GitHub-hosted runner. Initial registration
may require a local bootstrap publish without provenance, followed by trusted
publisher setup. Subsequent CI releases retain provenance. Workflows do not create
npm accounts or publishers.

Exclude credentials, environment manifests, backend packages, infrastructure and
private issue links. Review the complete export; audits supplement that review.

CI checks package contents and consumers offline. Production authorization,
tenant isolation, throttling, delivery and availability require deployed acceptance
before production customer use, independently of pre-production package publication.
