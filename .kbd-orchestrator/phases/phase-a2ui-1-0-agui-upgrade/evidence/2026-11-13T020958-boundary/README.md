# Boundary run 16 (repair attempt 15) — stopped at step 14 (FAIL)

Steps 1–13 exited 0. Step 14: `verify:skills` and `validate` (release contract at 5.0.0, example coverage) passed;
`docs:artifacts:check` failed: "packed API input hash drift" — the website API reference predated later source repairs.

Repair (attempt 16): packages rebuilt; packed API reference and search index regenerated; the evidence gallery caption
edit moved to its source (website/evidence.allowlist.json) and the gallery regenerated with docs:evidence; native API
docs regenerated with the pinned Flutter 3.44.8 / dartdoc 9.0.5 / Rust 1.88.0 (docs:native-api:check verifies 49
sources, 1545 files). docs:artifacts:check was run once after regeneration to confirm it; the rerun is the evidence.
