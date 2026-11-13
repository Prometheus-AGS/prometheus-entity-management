# Boundary run 5 (repair attempt 4) — stopped at step 8 (FAIL)

Steps 1–7 exited 0. Step 8 `verify:a2ui-v1`: UPG-1, 2, 5, 6, 7, 8, 13, 17 PASS (the isV1Surface repair also cleared the
UPG-7/UPG-17 agent-function timeouts). UPG-4 FAIL on one control check: a 1.0 createSurface naming the v0.9.1 catalog
was refused with CATALOG_ERROR, but as the raw official error (`name: "pf"`), not as `PrometheusA2uiError` with code
`protocol-error` and `protocolCode: "CATALOG_ERROR"`.

Root cause (product defect): `toPrometheusA2uiError` recognised official errors by `name.startsWith("A2ui")`; official
errors set `name = this.constructor.name`, which a minifier (the page's Vite build, and any consumer's production
build) mangles. Repair (attempt 5): also match `instanceof A2uiError` from @a2ui/web_core/v0_9 (bundled, same class).
Whole packet rerun. Steps 9–14 of this folder: NOT_EXERCISED.
