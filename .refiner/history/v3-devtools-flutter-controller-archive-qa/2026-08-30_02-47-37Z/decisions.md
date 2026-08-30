# Decisions

## 2026-08-30 — Converge after one refinement iteration

All blocking constraints pass. The remaining work is an independent
artifact-only adversarial review, not another producer-authored refinement
iteration. Archive and publication authority remain separate.

## 2026-08-30 — Reopen for the adversarial correction delta

The one-iteration convergence decision above was incomplete: the isolated
review found a missing base-contract instruction and publication/ledger
diagnostic ambiguities. Iteration 2 corrects those concrete deltas. Static Dart
contracts remain non-test checks, the external assembled controller flow
remains the sole behavioral evidence, and publication authority remains
separate.

## 2026-08-30 — Treat source version and publication status as separate data

The optional DevTools ledger keeps the current source manifest version but now
also records `repository-source-only` and explicitly states that the published
`3.0.1` archive excludes the library. Source version is necessary for API drift
checks; publication status prevents it from becoming a registry claim.

## 2026-08-30 — Converge after the final isolated PASS

The corrected candidate received a distinct-model PASS with zero critical
findings and a strict sycophancy score of `0.0`. Warnings are either resolved
or retained as explicit later-release/parser limits. The artifact may finalize;
package publication and Flutter extension certification remain separate.
