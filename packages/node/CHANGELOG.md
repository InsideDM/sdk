# Changelog

## 0.1.0-alpha.1 (unreleased)

- Rewritten npm guide with a complete WhatsApp quickstart, customer use cases,
  partner examples and direct documentation links.
- Consistent insideDM branding, descriptive package metadata and product links.
- Keep the maintainer publication guide in the source repository; npm retains
  customer guides, examples, the full API contract and MIT license.

## 0.1.0-alpha.0 (2026-10-21)

- Package release checks are independent of hosted API deployment checks.
- Default API origin and n8n examples use `api.insidedm.io`.

- MIT licensing for the SDK, examples, documentation and bundled public API
  contract, with notices included in repository exports and the npm package.

- Task-first entry guide, separate business/partner/blueprint references, editor
  help for collection traversal and lifecycle-aware methods. Local configuration
  failures identify documented fields with fixed corrective hints; supplied values
  stay out of diagnostics. Method names, wire contracts and retry intent are retained.

- Runnable customer-owned async-job receiver with durable start/status responses,
  tenant/authority binding, one-time worker claims and explicit uncertain-effect
  reconciliation. Uses the existing start-and-poll flow contract.

- Webhook follow-up template version 2 preserves full Production URLs and stops
  on HTTP failure. Discovery offers current families; exact older sources remain pinned.

- Published event-binding discovery with mapped input requirements, start-endpoint
  setup status and bounded pagination through the existing native flow-list route.

- Runnable managed-rollout worker with durable checkpoints, restart recovery
  and native human review tracking, using existing SDK methods.

- A governed long-running job template and portable polling parameters, using
  native HTTP actions, durable delays and bounded jumps. Includes start/status
  contracts and n8n ownership guidance; no callback endpoint or new SDK method.

- Managed draft publication requests and status through the existing native
  release endpoints. Shared compilation, simulation, governance and human
  publication remain authoritative; requester attribution uses the integration's
  real identity. Stable retry intent recovers the current request status.

- Four importable customer-owned n8n workflows for notification submission,
  published-flow starts, original-key recovery and synchronous flow webhook
  connection checks. Credentials stay outside workflow JSON; sample inputs stop
  before network calls until configured. Includes setup and ownership guidance.

- Partner blueprint draft rollouts: preview up to 25 explicit client flows,
  persist a serializable plan, stream individual application outcomes and recover
  uncertain writes with deterministic per-client keys. Existing owners recheck
  current grants and revisions; client customization and human publication remain
  protected. No cross-tenant transaction or server batch job is introduced.
- Deployment reads include native lifecycle and immutable publication observation.

- Managed blueprint update previews and draft-only application over the existing
  editor owner, preserving allowed client overrides, refusing manual graph
  overwrite and recording immutable managed revisions with stable recovery.

- `flows.blueprints.deploy(savedVersion, config)` creates a client-owned draft
  through the existing template-import owner, enforcing installation approval,
  client resource bindings and declared overrides with immutable provenance.

- Partner blueprint source discovery and immutable version creation/history,
  with typed customization fields, explicit client override permissions and
  stable default creation keys. Source authoring never publishes client flows.

- `flows.deployments.get(flowId)` reads immutable template origin and current
  draft drift through the existing editor GET, with producer isolation and no
  raw graph or private endpoint settings.

- Flow template catalog and exact-version draft imports through the existing
  builder owners, with explicit `flows.deploy`, client endpoint references,
  bounded cursors, partner delegation and retained import recovery. Imports do
  not publish or execute flows.

- ESM and CommonJS entrypoints share one runtime implementation and identical client/error constructors. Native declarations, the Node 22 floor and the original package size budget are preserved.

- `usage.getLimits()` reads native current-plan limits on the same billing GET under explicit software usage-and-limits authority. Preserves unlimited slots, soft monthly conversation allowance and exact INR paise included AI allowance; no remaining quota, feature flags or sold-version inference.

- Business `usage.get({ from, to })`: observed AI calls and whole token totals over explicit bounded windows, through the shared billing owner. Requires a separate merchant-approved `usage.read` grant; preserves source, dispatch-time attribution and provisional semantics. Application `usage.get` remains own-client API request telemetry. No financial totals or Meta billing are inferred.
- Distribution follows runtime entrypoints as well as public type dependencies, omitting unreachable type-only runtime modules while preserving installed ESM/CommonJS and strict TypeScript consumers.

- Customer-owned n8n setup recipes and a raw-body resource receiver example with durable inbox admission, stable event deduplication and original partner installation context. Arbitrary callback-based resume remains unavailable; bounded start/status polling is supported.

- Partner `subscriptions.create/list/get/update/verify/activate/pause/disable/rotateSecret` over canonical Conversations receiver owners. Creation and rotation retain retry intent; unkeyed revision commands run once. New events bind automatically to approved merchant installations, with v2 app attribution and current authority before receiver I/O.
- Partner `subscriptions.getHealth` and `deliveries.list/pages/iterate/get/replay` over the shared delivery owners. Thin history has bounded filters and signed cursors; explicit replay retains original event/grant/receiver custody and recovers stable intent.
- Partner `subscriptions.recover`: restore one health-paused client with a reviewed health revision and fresh receiver proof. Active proof refresh keeps other merchants running. Retried intent observes current health without resuming a newer pause; cancelled work remains cancelled.
- Compact generated schema/operation data preserves every runtime value and the original 1 MiB package limit. The packaged OpenAPI snapshot preserves the readable source's complete contract.

- Recognize receiver-verification throttling as a typed API error with its own policy label, while preserving the default edge policy and rejecting unregistered labels.

- Partner `onboarding.create/get`: private exact-business WhatsApp setup links and authenticated outcomes over shared owners, separate merchant authorization, existing account reuse, bounded PIN repair and original sign-in/installation custody. Includes a hosted setup guide; production browser/provider verification remains outstanding.

- Partner client provisioning and authenticated ownership outcomes through shared Accounts owners, with an operator-approved creation allowance, unique client references, stable retry intent and explicit claim-link replacement. Real merchant claims create no application grant, sender selection or billing agreement.

- Partner `usage.get`: own-installation recorded API request telemetry, independent usage permission, UTC date normalization and explicit source/retention/freshness. Unavailable or unfinished buckets are refused; counters imply no billing, provider cost or business-data grant.
- Distribution import auditing now parses module syntax, avoiding false dependency reports for ordinary API fields named `from` while detecting actual imports and computed loaders.

- Partner `businesses.list/get/pages/iterate`: current approved-client profile discovery under tenant policy, signed bounded pagination, empty-page continuation and explicit cursor expiry. Revoked grants return no fresh profile data.

- Partner `installations.get/revoke`: own-client metadata and revision/intent-bound exits through the shared epoch/audit owner. Recovered old intent cannot revoke fresh merchant consent; queued provider and flow work respects the original grant fence.
- Compact generated schema declarations preserve full runtime validation and the existing package size budget.

- `InsideDMPlatform.self.get()` verifies application identity and effective scopes, registered return URLs, business scope ceiling and credential expiry without selecting a business.

- Partner `installationRequests.create/get`: private, short-lived hosted merchant approval links and authenticated request outcomes. Creation preserves intent on retries; status reads disclose no link capability or human identity. Approval still requires the real merchant and current business permissions.

- Server-side `InsideDMPlatform` with one application credential and lazy `forBusiness(id)` clients. Approved installation tokens refresh with bounded single-flight acquisition, per-caller cancellation/deadlines and one safe recovery after `invalid_token`. Business methods and canonical endpoints remain shared.

- Minimal flow execution status through the dashboard's existing run endpoint, with an independent `flows.read` scope and producer isolation across key rotation.

- Published-flow event intake for known contacts, using stable event IDs and the existing flow builder's mappings. Producer-scoped progress, recovery and cancellation reuse the canonical operation endpoints; publication success records flow admission separately from later effects.

## 0.1.0-alpha.0 — unreleased

- Opt-in message delivery webhooks, typed verification and current message reads, backed by durable provider facts and recoverable observations through the existing webhook engine.

- Channel-specific marketing opt-in registration from a verified retained customer message, preserving source attribution, withdrawal chronology, audit and retry semantics without caller-supplied proof flags.

- Opt-in operation progress webhooks with version 2 business/producer correlation, durable observation checkpoints and the existing webhook delivery engine; existing event envelopes retain version 1.

- Display-name changes through the canonical shared contact owner, including explicit clearing, current-state replay, audit attribution and erasure fences.

- Typed client for the eleven existing public read operations.
- Lazy pagination, bounded retries and timeouts, cancellation and strict response validation.
- Raw-body webhook verification, rotating secrets and endpoint verification responses.
- Offline fixtures and independent ESM/CommonJS package checks.
- Curated source-kit export and gated npm publication workflow.
- Verified all eleven reads against the actual HTTP application, including canonical server-generated request IDs.
- Contact custom-field updates through the UI's canonical operation: one-key setup, intent-bound idempotency, safe retries and explicit recovery context.
- Notification sending and preview through the shared message owner, with automatic organization WhatsApp resolution and text/template support.
- Producer-scoped operation status, lookup after a lost response and revision-checked cancellation before provider admission.
- Simpler send/preview inputs: notification intent is automatic, static templates need no variables, and editor hints explain setup, progress and recovery.
- Approved-template discovery with required variables, explicit notification support and lazy pagination through the same catalog endpoint as the inbox.
- Read-only WhatsApp setup readiness with fixed reason codes and no sender/default-account configuration.
- Restricted configuration discovery through the existing settings endpoint, including optional aliases and text-purpose binding names.
- Idempotent WhatsApp purpose withdrawal through the existing consent owner, with current-state replay, verified actor attribution and no contact creation or caller-declared opt-ins.
- Current messaging consent discovery through the existing contact-history endpoint, with identity-specific decisions, explicit unknown states and a separate read scope.
- Full contact-tag replacement through the existing editor endpoint and transactional writer, with normalized identifiers, preserved history, current-state replay and verified actor attribution.
- Phone contact creation/resolution through the existing manual owner, with a minimal reference view, stable intent keys, preserved existing names and no consent or account setup requirement.
