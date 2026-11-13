# Boundary run 15 (repair attempt 14) — stopped at step 14 (FAIL)

Steps 1–13 exited 0. Step 14: `verify:skills` passed (all ledgers and the scratch-copy control); `validate` failed in
`validate-v3-release-contract.mjs`: every artifact "is not aligned to major 4" — the release contract still declared 4.4.0.

Repair (attempt 15), following the 4.4.0 prepare commit and the contract's own `independent-aligned-major` native policy:
release contract, coverage manifest and schema at 5.0.0; contract schema version pattern ^5; Dart (`entity_graph_flutter`)
and the three Rust crates aligned to 5.0.0 (version only; pub.dev and crates.io stay deferred, nothing published there);
RELEASING.md records 5.0.0 as prepared, not published; Dart export ledgers and README blocks regenerated.
The native API pages could not be regenerated here (generator pinned to Flutter 3.44.8, host has 3.47.5); they are not
part of this packet but the Pages workflow checks them.

Open decision after repair 15: `entity_graph_flutter` 4.0.0 is published on pub.dev
(release/pubdev-registry-status.json) and readme-parity requires the contract's native version to equal it. Aligning
the native line to 5.0.0 therefore implies a pub.dev publication of 5.0.0 (and native API docs regenerated with the
pinned Flutter 3.44.8, which is not installed); keeping it at 4.x needs the alignment rule to allow the native line
to lag the npm major. Operator decision requested.
