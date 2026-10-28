# Known pre-existing failure: `bdd:a2ui-bridge` packed NodeNext/Node16 consumer typecheck

Recorded 2026-10-28 on the operator's decision (option 2: leave the gate red, record it, follow up).

- **Symptom:** `pnpm run verify:a2ui-bridge` fails in `tsc -p tsconfig.json` of the packed consumer with two
  TS2835 errors inside `@a2ui/web_core@0.12.0` (`src/v0_8/types/types.d.ts` lines 3 and 7: relative imports
  without file extensions under NodeNext).
- **Cause:** upstream declarations, with the verifier's `skipLibCheck: false`. A probe importing only
  `import type { A2uiMessage } from "@a2ui/web_core/v0_9"` reproduces both errors, so this phase's declarations
  are not the cause. It has been present since the 0.12.0 bump (`7438eff5`).
- **Not changed:** `skipLibCheck` stays `false` in `scripts/verify-a2ui-protocol-bridge.mjs`.
- **Gate fixes made in this phase that the failure had been hiding:** the release test now reads
  `runtime-core.ts` for the official-processor import; the CJS consumer asserts
  `PROMETHEUS_A2UI_PROTOCOL_VERSION` instead of the nonexistent `processor.version` of web_core 0.12.0.
- **Not exercised past the failure:** the packed ESM consumer typecheck and the visual lane of `verify:a2ui-bridge`
  never ran in this phase. Their status is UNKNOWN, not PASS.
- **Follow-up:** open an issue (needs operator approval) to pin, patch or wait for a fixed web_core 0.12.x.
