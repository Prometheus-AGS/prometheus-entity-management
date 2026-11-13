# Boundary run 7 (repair attempt 6) — stopped at step 9 (FAIL)

Steps 1–8 exited 0 (all nine verify:a2ui-v1 scenarios PASS). Step 9 `verify-a2a-conformance.mjs`: the reference agent's
1.0 surface now processes in the packed headless runtime, then "built components must match the received messages"
failed with actual `{}`.

Root cause (verifier defect, not product): the scenario's `summarize` read components and data only from
`updateComponents`/`updateDataModel`, but `exportSurfaceMessages` exports a 1.0 surface as one inline `createSurface`
(documented in the migration guide; probe confirms components and dataModel are inline). Repair (attempt 7):
`summarize` also reads inline `createSurface.components` and `createSurface.dataModel`. Whole packet rerun.
Steps 10–14 of this folder: NOT_EXERCISED.
