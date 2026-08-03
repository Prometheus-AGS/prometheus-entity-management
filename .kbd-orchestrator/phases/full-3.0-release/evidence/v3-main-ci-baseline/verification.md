# v3-main-ci-baseline verification

## Verdict

**OpenSpec change:** verified and archived on 2026-08-01.  
**Prometheus Entity Management 3.0 release:** blocked; this change certifies the JavaScript main-CI baseline only.

The implementation satisfies every acceptance criterion in the `v3-main-ci-baseline` plan section. Its reproducible evidence is split between the task reports and the machine-readable [`clean-gates.json`](clean-gates.json). A green baseline is deliberately not described as packed-artifact, native-platform, showcase, documentation, release-candidate, or stable-publication certification.

The delta is archived at `openspec/changes/archive/2026-08-01-v3-main-ci-baseline`, and its normative spec is promoted to `openspec/specs/v3-main-ci-baseline/spec.md`.

## Acceptance mapping

| Plan acceptance criterion | Authoritative evidence | Verdict |
| --- | --- | --- |
| Clean checkout passes `pnpm install --frozen-lockfile` | Three independent source-only Ubuntu 24.04 copies on Node 22.23.2, 24.18.1, and 26.5.1 accepted the frozen lock | Pass |
| Current-main CI is green | Every clean lane completed validate, lint, typecheck, build, test, skills, and security gates | Pass for reconciled working-tree content |
| Build timeouts identify the responsible task | Named gate runner tests exercise success, nonzero exit, unknown gate, invalid timeout, and forced timeout paths | Pass |
| Dependency and advisory decisions are recorded | `release/dependency-policy.json`, `security/advisory-policy.json`, 17 CI-baseline tests, and the integrated production audit | Pass |

The `current-main` wording is bounded honestly: the local dirty working tree contains the intended upstream dependency and behavior changes, but its local HEAD differs from `origin/main`. This is content-level baseline evidence, not immutable-SHA certification. The latter remains owned by `v3-release-certification`.

## Reproducible passing evidence

| Area | Evidence |
| --- | --- |
| CI matrix | Node 22.23.2, 24.18.1, and 26.5.1 pass independently on Ubuntu 24.04 ARM64, glibc 2.39, pnpm 10.33.0 |
| Type/build | 17 typecheck tasks and 14 build tasks pass per lane |
| Package tests | 362 tests pass per lane |
| Release contract | 10 tests pass |
| CI baseline | 17 tests pass, including negative failure/timeout/advisory behavior |
| BDD | Baseline feature: 5 scenarios/25 steps; complete release suite: 10 scenarios/57 steps |
| Skills | 197 runtime exports match the public skill ledger |
| npm security | 309 production dependencies; zero critical/high/moderate, one visible low, zero accepted blocking exceptions |
| npm inventory | All 12 public workspaces appear in the recursive package dry run |
| OpenSpec | `openspec validate v3-main-ci-baseline --strict` passes |
| Flutter smoke | Analyze passes and 54 tests pass |
| Rust smoke | CLI 24, MCP 26, and Tauri 6 locked tests pass |
| Mobile source targets | Tauri plugin checks pass for `aarch64-apple-ios` and `aarch64-linux-android` |

## Mandatory-lane and skip disposition

No mandatory JavaScript baseline lane is silently skipped.

- The Flint live test reports one explicit skip because it imports an unavailable absolute sibling SDK. It is not baseline certification and is owned by `v3-flint-portable-contracts`, which must replace it with portable in-repository evidence.
- One core benchmark is marked todo and is not a functional CI acceptance test.
- Rust, Flutter, browsers, device execution, packed consumers, and documentation deployment are not jobs in the current main-CI workflow. Their smoke results are recorded as release impact, not silently counted as passing baseline gates.

## Unresolved release blockers

- Flutter formatting changes six files; Riverpod/Freezed generations are behind, three direct lock upgrades are available, and two build transitives are discontinued.
- CLI and Tauri formatting fail.
- Tauri clippy rejects `new()` returning `TauriPlugin`.
- RustSec reports `RUSTSEC-2026-0204` for CLI, `RUSTSEC-2026-0190` warnings for CLI/MCP/Tauri, two high `quick-xml` advisories for Tauri, and additional denied unmaintained/unsound warnings.
- The npm package dry run is not ESM/CommonJS/TypeScript packed-consumer proof.
- The five showcases and full branded Docusaurus/GitHub Pages product remain planned.
- No browser, simulator/device, signed bundle, notarization, store, registry, RC recovery, or immutable-SHA evidence exists yet.

No waiver converts these findings to green.

## Visual evidence disposition

This change has no rendered user interface: it changes CI orchestration, dependency policy, security evaluation, lockfile ownership, and build configuration. Screenshot evidence would not prove its acceptance criteria. Its behavior is instead certified by executable BDD and clean-room command evidence. Visual proof remains mandatory for each showcase, the Docusaurus product, and final release certification.

## Archive consequence

The archive establishes a reproducible main-CI foundation for dependent package and release work. It does not authorize npm publication, move npm `latest`, certify native artifacts, deploy GitHub Pages, or reduce the remaining phase scope.
