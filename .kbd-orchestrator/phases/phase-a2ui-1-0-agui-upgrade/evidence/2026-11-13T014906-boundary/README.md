# Boundary run 14 (repair attempt 13) — stopped at step 14 (FAIL)

Steps 1–13 exited 0, including the Flutter integration test on iPhone 17 Pro (UPG-18) and its negative control.
Step 14 `pnpm run verify:skills && pnpm run validate && pnpm run docs:artifacts:check` stopped in verify:skills:
"a2a-library-exports.json is out of sync with entity-graph-a2a/dist/index.mjs", seven exports added this phase missing
(A2UI_RENDERER_CAPABILITIES_KEY, A2UI_RENDERER_DATA_MODEL_KEY, createA2UIDataPart, extractA2UIMessages, isA2UIDataPart,
offersA2UICatalog, rendererCapabilitiesOf). validate and docs:artifacts:check did not run.

Root cause: entity-graph-a2a's `refresh:exports` was the only one that did not build first, so the earlier refresh read
a stale dist and reported no change. Repair (attempt 14): that script now builds first; all ledgers regenerated from
current builds (a2a +7 names, nothing removed).
