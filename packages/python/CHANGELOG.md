# Changelog

## 0.1.0a0

- Add typed sync/async `flows.runs.list()`, `iter_pages()` and `iter_items()` with
  flow/status filters, bounded pagination and caller-derived run visibility.

- Connected-user `flows.runs.get(run_id)` can read native workspace execution
  status. Current native permissions apply; server integrations remain producer scoped.

- Add typed sync/async `loyalty.members.get(contact_id)` with the separate
  `loyalty.read` grant, native wallet balances, membership, tier and expiry.

- Blueprint preview accepts snake_case exact source-reference dictionaries and
  saved typed targets, as well as complete saved source versions.

- Native managed draft reads and `flows.drafts.save(draft, definition, ...)` for
  sync/async clients, with saved revision pins and original-intent retry recovery.
- Blueprint draft updates retain their method syntax while sharing the canonical
  `saveFlowDraft` operation and its generated request-byte budget.

- Retry only recognized transient network/API failures; local HTTP hook and
  adapter failures now produce a safe, non-retryable `http_client_error`.
- Reject mismatched consent contacts and software-usage intervals, enforce
  consent uniqueness/timestamp invariants and validate subscription domain rules
  before I/O. Extreme numeric controls produce configuration errors consistently.
- Apply the existing application-usage window, bucket, total and freshness rules;
  accept canonical dates and aware datetimes, and correlate the returned window.
- Evict every rejected delegation and isolate new async callers from abandoned
  exchange cancellation and cleanup. Preserve valid comma-containing lookup keys.
- Keep synthetic consent and software-usage fixtures consistent with the stricter
  identity/window checks, including both usage projections.
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
