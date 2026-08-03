# Verification — `v3-a2a-conformance-agent`

Date: 2026-08-01  
Verdict: **PASS TO ARCHIVE — full 3.0 and publication remain uncertified**

## Acceptance-to-evidence matrix

| Phase-plan requirement | Direct evidence | Result |
| --- | --- | --- |
| Compare the alpha against pinned upstream A2A | Verified research package identifies the old discovery path, bespoke models/methods, and fake streaming; implementation pins official SDK `1.0.1` | Pass |
| Select and implement a truthful conformance/version matrix | AgentCard declares A2A `1.0`, JSON-RPC only, official discovery, streaming true, push/extended cards false, and no signatures | Pass |
| Discover and execute the official task lifecycle | Focused tests cover AgentCard, `SendMessage`, `GetTask`, `ListTasks`, history, terminal guards, malformed calls, media type, and unknown routes | Pass |
| Stream, subscribe, and cancel | SSE receipts contain ordered submitted, working, artifact, and terminal envelopes; cancellation is visible to the original stream and subscriber | Pass |
| Authentication failures cannot mutate the graph | Authentication returns 401 before dispatch; default-deny graph policy, batch preauthorization, field allowlists, destructive approval, and unchanged graph assertions pass | Pass |
| Task visibility is caller-scoped | Hidden and nonexistent task reads return the same official not-found class without leaking task state | Pass |
| Deterministic CI emits expected A2UI artifacts without a model key | Fixed clock/ID executor emits repeatable Prometheus-owned A2UI v0.9.1 structured-data metadata and official lifecycle enums | Pass |
| Optional external endpoint seam is real and opt-in | Final audit added source and packed tests proving injected AgentCard discovery, injected JSON-RPC transport, service parameters, remote-to-local ID remapping, terminal streaming, and HTTPS-or-loopback enforcement | Pass after red/green correction |
| Alpha consumers have an honest migration | Stable root excludes slash APIs; `./legacy` provides bounded send/get/cancel translation and intentionally rejects legacy streaming | Pass |
| Published artifacts work outside workspace aliases | Fresh core/A2A tarballs pass ESM, CommonJS, strict NodeNext, strict Node16, root, legacy, and external-executor consumers; twelve-package Publint/ATTW/Bundler contract also passes | Pass |
| Official upstream suite has no silent selected-binding failure | Fresh pinned TCK receipt records JSON-RPC MUST 59 passed, 0 failed, fourteen explicitly inapplicable skips, zero unexplained skips, and hashed JSON/HTML/JUnit artifacts | Pass |
| Public surface and guidance agree | A2A root 30 and legacy 2 exports match ledgers; coverage, release docs, package README/changelog, example docs, and skills teach the same boundary | Pass |
| No mandatory lane is silently skipped | No `.skip`, `.todo`, `@skip`, or `@ignore` appears in task-owned tests; Dart/Cargo/native/browser lanes have explicit downstream owners | Pass — zero mandatory skips/todos |
| Visual applicability is honest | This is a headless server/protocol/package change. No decorative screenshot was fabricated; the rendered agentic example owns browser/accessibility/visual certification | Pass — not applicable by design |

## Final executable evidence

- `pnpm run test:a2a-conformance`: 16/16 focused protocol, policy, lifecycle,
  deterministic, external, and legacy tests plus 7/7 release guards.
- `pnpm run bdd:a2a-conformance`: 7/7 scenarios, 38/38 steps, and 4/4 hooks.
- `pnpm run verify:a2a-conformance`: fresh tarball-only ESM, CommonJS,
  NodeNext, Node16, official-root, legacy-subpath, and external-executor
  consumers; workspace aliases forbidden.
- `pnpm run verify:package-contracts`: all twelve npm tarballs pass payload and
  manifest policy, Publint, Are The Types Wrong, and ESM/CommonJS/NodeNext/
  Node16/Bundler consumers after the final source correction.
- `pnpm run test:a2a-tck`: official immutable commit
  `5996b79f9cefa6fc390980e383e358a66fb9e49e`; applicable JSON-RPC MUST 59
  passed, 0 failed; no unexplained selected-binding skip.
- Frozen install, clean output regeneration, TypeScript, scoped ESLint,
  OpenSpec strict validation, release-contract validation, export ledgers,
  example coverage, Changesets status, production security policy, JSON
  parsing, and `git diff --check` pass.

Machine-readable receipts are `final-verification.json`,
`packed-consumer-report.json`, `task-5-example-coverage-report.json`, and
`tck/receipt.json`. The clean-state procedure and complete command matrix are
in `task-5-clean-state-verification.md`.

## Final-audit correction

The final acceptance audit refused to infer that the exported external executor
worked merely because it compiled. A new deterministic test failed red because
the configured `fetch` implementation was used for JSON-RPC transport but not
AgentCard discovery; the SDK attempted a real socket connection. The executor
now supplies the same injected fetch to `DefaultAgentCardResolver` and
`JsonRpcTransportFactory`. Source and packed consumers pass, including local ID
remapping and service-parameter propagation. The red receipt is
`task-6-external-executor-red.md`.

The first full BDD rerun then found only a stale assertion string for the
expanded packed-verifier summary. After correcting that test drift, the entire
38-step suite and fresh TCK reran successfully.

## Unresolved platform and manual limits

- Only A2A 1.0 JSON-RPC is certified. REST, gRPC, push notifications, signed or
  extended cards, and extension signing remain unsupported and unadvertised.
- The upstream report distinguishes applicable, skipped, and not-tested
  requirements. A passing selected binding is not universal protocol proof.
- Credential parsing is not production identity. Hosts still own signature,
  expiry, issuer, audience, scope, revocation, tenant, and key rotation.
- The external seam proves deterministic loopback interoperability and
  injectable transport behavior. It does not certify a remote service,
  production federation, model behavior, retry/SLO policy, or hosted identity.
- A2UI structured artifact metadata is not rendered UI evidence. The later
  `v3-agentic-a2ui-example` owns browser, keyboard, accessibility, and visual
  receipts.
- Dart/Melos, Flutter/Riverpod, Cargo/Rust, Tauri, iOS, and Android lanes are
  outside this JavaScript protocol change and remain with their named changes.
- The branded Docusaurus site, GitHub Pages deployment, all five showcases,
  Flint contracts, provenance, RC/recovery rehearsal, registry authority,
  stable npm publication, and movement of `latest` remain open.
- Production policy reports two low-severity dependency findings. There are no
  critical/high blockers, but this is not a claim of zero vulnerabilities.
- The TCK receipt binds exact built hashes from an active dirty release
  worktree. Immutable-SHA release certification is a later mandatory gate.

## Publication authority

Publication remains unauthorized. Archiving this implementation change may
unblock its declared dependents, but it cannot authorize an npm publish,
dist-tag change, GitHub Release, documentation deployment, or other external
mutation.

