# Boundary run 6 (repair attempt 5) — stopped at step 9 (FAIL)

Steps 1–8 exited 0: bridge and visual gate, package contracts, and `verify:a2ui-v1` with all nine scenarios PASS
(UPG-1, 2, 4, 5, 6, 7, 8, 13, 17).
Step 9 `verify-a2a-conformance.mjs` failed: the packed headless runtime refused the reference agent's surface,
"Validation failed for component 'Text' (heading): variant … Expected caption | body, received 'h2'".

Root cause (product defect): `createDeterministicA2UIMessages` in @prometheus-ags/entity-graph-a2a emitted Text
`variant: "h2"`, which the A2UI 1.0 basic catalog does not allow. Repair (attempt 6): variant removed. No other 1.0
producer uses a heading variant (the remaining hits are v0.9.1 fixtures, where it is valid). Whole packet rerun.
Steps 10–14 of this folder: NOT_EXERCISED.
