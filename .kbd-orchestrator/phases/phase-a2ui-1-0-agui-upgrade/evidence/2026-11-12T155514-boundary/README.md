# Boundary run 1 — stopped at step 6 (FAIL)

Steps 1–5 exited 0 (preamble, frozen install, folder, build:packages, capture:a2ui-visual).
Step 6 `A2UI_VISUAL_EVIDENCE="$E/visual" pnpm run verify:a2ui-bridge` exited 1 before any scenario check:
the packed consumer's `pnpm install` ran in a temp folder with no `packageManager`, so corepack used its
last-known-good pnpm 12.16.1, whose cached package ships `bin/pnpm.mjs` while this corepack launches
`bin/pnpm.cjs` (MODULE_NOT_FOUND). Environment fault, not a product assertion. See logs/step-6.log.

Repair (attempt 1): every scratch consumer is pinned to the repository's `packageManager` (pnpm 10.33.0),
as verify-framework-neutral-core already did. Rerun of the whole packet in a new timestamped folder,
because steps 7–14 never ran and the repair changed the bridge, package-contracts, a2ui-v1 and a2a scripts.
Steps 7–14 of this folder: NOT_EXERCISED.
