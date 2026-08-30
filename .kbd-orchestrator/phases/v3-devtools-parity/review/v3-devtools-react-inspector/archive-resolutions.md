# Archive review resolutions

Date: 2026-08-30

The final isolated `k3` review passed with no critical finding. Its two
warnings and one suggestion remain retained in `archive-findings.json`.

1. The review packet began after clean source commit
   `47c017ba91e6f3924eed62b46fc9d4c912b56825`, so its generated-evidence diff
   did not repeat that commit's acceptance-spec and verifier changes. The
   packed receipt names that exact commit and records `dirtyTaskFiles: false`.
   The shifted Playwright line numbers therefore trace to committed input,
   rather than an uncommitted test mutation.
2. The same source commit contains executable assertions for every recorded
   threshold. Playwright fails before writing a passing receipt when the
   measured completion-window rate, search p95, preloaded-open p95, long-task
   count, or retained-event count violates its budget. The packed verifier
   additionally rejects a failed browser receipt, a mismatched gate version,
   or a missing threshold snapshot.
3. Thresholds intentionally appear in the independently useful browser
   receipt and in the packed envelope. The envelope projects the browser
   object rather than maintaining a second hand-authored literal; the
   duplication is therefore generated traceability, not two configuration
   owners.

The strict anti-theater screen accepted the findings at score `0.0`.

