# Cycle 4 correction feedback

The cycle-4 critical finding was reproduced at the canonical package boundary.
A valid `updateDataModel` message changed `/body` on an existing surface before
a later `updateComponents` message rejected `UnsafeWidget`; the first mutation
remained committed. The focused regression was observed failing before the fix.

`PrometheusA2uiRuntime.processMessages` now parses the batch, seeds a shadow
official `MessageProcessor` with every current surface, component, and root data
model, then applies the entire batch there with the same component allowlist.
Only a successful preflight reaches the live official processor. The shadow is
disposed in `finally`. The example-level partial rollback was removed, so the
example delegates directly to the corrected canonical runtime.

The focused regression now passes and proves `/body` remains `Versioned data
model` while `unsafe` is absent after rejection. The full clean verifier then
passed 19 commands, including this package regression, all three endpoint-policy
tests, three Chromium flows, per-flow axe results, coverage, ledgers, security,
strict OpenSpec, and diff hygiene. Review the full corrected packet; do not infer
a PASS from this feedback.
