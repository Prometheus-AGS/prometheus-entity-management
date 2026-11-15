# SQLx SQLite 0.8.6 bundled SQLite security update

Base source is the published `sqlx-sqlite@0.8.6` crate. Its archive SHA-256
is `c2d12fe70b2c1b4401038055f90f151b78208de1f9f89a7dbfd41587a10c3eea`.

The manifests select `libsqlite3-sys ^0.39`, whose bundled SQLite includes
the fix for [RUSTSEC-2026-0459](https://rustsec.org/advisories/RUSTSEC-2026-0459.html).
The existing SQLite features and SQLx driver source carry over. Tauri's SQL
plugin selects SQLx 0.8, so the examples apply the binding update to that line.
