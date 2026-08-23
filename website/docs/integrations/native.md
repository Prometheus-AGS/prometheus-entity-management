---
title: Tauri native and Flutter FFI
sidebar_position: 6
---

# Native adapters stay below the store

Tauri commands and events provide native persistence and lifecycle seams behind
least-privilege capabilities. Flutter's optional FFI transport can call a Rust
implementation, but it does not own a second graph. Both paths preserve the
language-invariant flow: View → ViewModel → Store → Service → Native boundary.

Capability denial, malformed native responses, offline restart, and generated
binding drift have explicit tests. Signing, notarization, physical devices, and
app-store publication remain release-authority gates.
