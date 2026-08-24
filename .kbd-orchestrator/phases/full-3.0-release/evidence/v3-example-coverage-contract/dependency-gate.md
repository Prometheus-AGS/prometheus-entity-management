# Task 1 — dependency and execution-readiness gate

Date: 2026-08-01  
Change: `v3-example-coverage-contract`  
Verdict: **PASS**

## Declared prerequisite

`v3-release-contract` is complete and usable as the authoritative upstream contract:

- its six tasks are checked in `openspec/changes/archive/2026-08-01-v3-release-contract/tasks.md`;
- the archived change exists and the promoted `openspec/specs/v3-release-contract/spec.md` passes strict validation;
- `release/v3-release-contract.json` passes its validator with 16 artifacts, twelve npm packages, one Dart package, three Rust crates, three required stable registry channels, and five planned showcases;
- the KBD projection records the prerequisite as `COMPLETE`; and
- its verification explicitly keeps examples, Docusaurus, RC certification, visual evidence, and publication downstream rather than representing the contract archive as a stable release.

No undeclared prerequisite is required to define and execute the shared semantic example contract. The later sync, A2UI/A2A, Flutter, Tauri, browser, and documentation changes consume this contract; they do not need to be complete before the contract and its deterministic fixture can be established.

## Deep-research and Feynman transfer

The execution-readiness research is current for this phase, primary-source grounded, and verified. Its Feynman assessment passes at `0.935` against a `0.70` threshold with `misconceptions_absent: 1.0`.

The transferable explanation for this change is:

> The coverage contract is the shared flight plan and instrument checklist. Its deterministic fixture proves that every example is talking about the same passengers, route, events, and expected outcomes. Browser screenshots, mobile smoke runs, protocol transcripts, and packed consumers are the later flight receipts. A flight plan must never be accepted as proof that a platform implementation flew.

Therefore this change must provide two distinct proof layers:

1. **Semantic contract evidence** — stable scenario IDs, deterministic domain fixtures/transports, expected graph transitions, security assumptions, and a command that executes the shared expectations without credentials.
2. **Implementation evidence references** — per-example/package/platform commands and artifacts that may initially be honestly `planned`, but must become runnable and non-missing before the coverage/release status can be promoted to complete.

The validator must reject a missing or stale mapping and must also reject any feature or release marked implemented/complete when its required runnable implementation evidence is absent. A planned path, prose description, or screenshot alone cannot satisfy runnable evidence.

## Authoritative scope for task 2

The implementation must define one versioned Project/User/Task/Comment/Activity scenario with deterministic IDs and relationships. It must cover, without presentation-specific forks:

- normalized canonical entities and ID-only lists;
- CRUD plus optimistic apply/confirm/rollback behavior;
- Project/User/Task/Comment/Activity relationships and invalidation;
- local, remote, and hybrid view semantics;
- realtime batching and cross-view updates;
- offline persistence, reconnect, and convergence expectations;
- A2A task and A2UI surface/action boundaries;
- SSR request isolation and serializable hydration expectations; and
- browser, desktop, mobile, and documentation evidence boundaries.

The semantic fixture must be backend-neutral and keyless. REST, GraphQL, realtime, offline, A2A, and A2UI transports are deterministic adapters around the same canonical scenario, not alternate owners of entity data.

## Coverage-model constraints

- Every stable artifact/capability declared by the release contract must map to at least one stable scenario ID and evidence owner.
- Experimental Flutter `genui` remains explicitly experimental even though A2UI 0.9.1 is the stable protocol baseline.
- Scenario IDs and expected outcomes are presentation-independent; the five requested showcases may differ visually but cannot change their semantics.
- Evidence entries distinguish `semantic`, `unit`, `packed-consumer`, `browser`, `desktop`, `mobile`, `protocol`, `documentation`, and `visual` proof instead of treating every file path as equivalent.
- Each runnable entry has a real repository path, command, owner change, applicability, and status. Stale paths, duplicate IDs, unknown owners, impossible status transitions, and unreferenced stable capabilities fail closed.
- The overall release and all five showcase statuses remain incomplete until their later owners attach executable and visual/platform receipts.
- The contract preserves components → hooks → stores/adapters → external I/O, a single normalized graph, separate local patches, and ID-only list storage.

## Security and privacy assumptions

- Deterministic fixtures contain no live credentials, tenant secrets, product data, or external model dependency.
- Project/User/Task/Comment/Activity IDs are synthetic and fixed.
- Agent actions cross an allowlisted application-owned policy boundary; malformed, denied, destructive, and approval-required outcomes have scenario IDs.
- Tenant/authorization assumptions are explicit at transport boundaries and are not inferred from UI visibility.
- Secrets are prohibited from fixture output, logs, screenshots, video, traces, and evidence manifests.

## Visual-evidence boundary

This change defines the visual-evidence contract but does not modify a rendered product surface. Decorative screenshots would not prove mapping completeness or deterministic semantics. The validator and BDD evidence are the truthful medium here. Later Vite, Next.js, agentic A2UI, Flutter, Tauri, and Docusaurus changes must attach pinned browser/device screenshots, accessibility results, traces/video where required, and hash manifests to their scenario mappings.

## Entry decision

Task 2 may proceed. It must build the complete semantic fixture and fail-closed coverage schema/validator now, while keeping downstream implementation and visual evidence honestly incomplete. It must not use planned example paths as proof that every stable feature is already release-certified.

## Reproducible gate commands

```text
pnpm exec openspec validate v3-release-contract --strict
pnpm run validate:release-contract
node <dependency/Feynman integrity assertions>
```

All commands passed. No registry, Pages, native, signing, or publication state was mutated.
