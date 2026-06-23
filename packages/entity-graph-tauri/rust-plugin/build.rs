// build.rs
//
// When compiled with --features generate-bindings, this build script runs
// tauri-specta to export TS types for all commands and events into
// ../src/generated-bindings.ts (relative to the workspace root).
//
// Normal (non-generating) builds: the block is elided at compile time so the
// `specta-typescript` dev-dep is never linked.

fn main() {
    tauri_build::build();
}
