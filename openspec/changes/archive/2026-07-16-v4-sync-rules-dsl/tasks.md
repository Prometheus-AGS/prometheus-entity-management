# Tasks: v4-sync-rules-dsl

- [x] Create `crates/pes-rules/src/parser.rs`: `parse_sync_rules(path: &Path) -> Result<SyncRuleSet, ParseError>` using `toml::from_str`
- [x] Define `SyncRuleSet` struct: `rules: HashMap<String, SyncRule>`, `version: String`
- [x] Create `crates/pes-rules/src/validator.rs`: validate parsed `SyncRuleSet`
  - [x] Each name in `parameters` has a corresponding `parameter_queries` entry
  - [x] Parameter queries contain exactly `$1` placeholder (no other `$N`)
  - [x] `{bucket_parameters.X}` references in `data_queries` match declared parameter names
  - [x] Bucket IDs match `[a-z][a-z0-9_-]*` regex
  - [x] No duplicate bucket IDs
- [x] Define `ParseError` with line/column info (use `toml::de::Error` source)
- [x] Create `crates/pes-rules/tests/fixtures/valid/` with 5+ valid `.toml` files
- [x] Create `crates/pes-rules/tests/fixtures/invalid/` with 10+ invalid `.toml` files, one per error class
- [x] Write integration tests: each fixture file parses/fails as expected
- [x] Write `docs/sync-rules-reference.md` documenting TOML format with examples
- [x] Verify `SyncRuleSet` implements `Clone + Send + Sync`
- [x] Verify `cargo clippy -- -D warnings` passes
