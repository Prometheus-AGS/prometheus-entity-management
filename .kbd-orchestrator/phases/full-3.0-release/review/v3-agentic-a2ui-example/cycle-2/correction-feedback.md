# Cycle-2 correction evidence

Re-evaluate the complete current packet. Neither earlier BLOCK is reusable.

1. `useAgentSession` now derives `canCancel` through `canCancelAgentTask`, which
   requires a non-null task ID plus `submitted` or `working`. The existing
   session-store lifecycle test asserts pre-ID submitted is false and post-ID
   submitted/working are true.
2. `agent-session-store.ts` now uses `classifyAgentFailure`. Only
   `PrometheusA2uiError` maps to `validation-failed`; a generic transport error
   maps to `failed`. The malformed test asserts both classifications and still
   proves the real invalid component is `validation-failed` with no partial
   surface or graph mutation.
3. Focused typecheck, lint, and all three session-store tests pass. The complete
   18-command clean verifier also passes and regenerates all browser evidence
   and ten matching hashes.

Cycle-1 endpoint, packet-completeness, accessibility, and verifier corrections
remain present. Source-workspace, external-agent, packed-package, native,
frozen-RC, and publication exclusions remain unchanged.
