# Changelog

## 0.1.0a0 (in development)

- Retry only recognized transient network/API failures; local HTTP hook and
  adapter failures now produce a safe, non-retryable `http_client_error`.
- Reject mismatched consent contacts and software-usage intervals, enforce
  consent uniqueness/timestamp invariants and validate subscription domain rules
  before I/O. Extreme numeric controls produce configuration errors consistently.
- Evict every rejected delegation and isolate new async callers from abandoned
  exchange cancellation and cleanup. Preserve valid comma-containing lookup keys.
- Native synchronous and asyncio resource clients generated from the shared
  public contract, with typed requests and responses.
- Managed API origin, credential-derived workspace discovery, bounded pagination,
  request metadata and idempotent recovery controls.
- Independent Python packaging under MIT; PyPI publication is not complete.
- Application clients with lazy merchant-approved delegation, bounded authority
  caches, cancellation-safe single-flight exchanges and nested identity checks.
- Saved-source blueprint draft deployment, revision-pinned updates, native human
  publication requests and bounded serial rollout plans with stable restart keys.
- Exact-byte signed webhooks, endpoint challenge proofs, rotation overlap and
  synthetic offline clients and webhook fixtures.
- Public request/response types, a generated API reference and typed sync/async
  notification and customer-context examples. CPython 3.11–3.15 and Windows/macOS
  smoke checks pass; wheel and source archive install independently.
