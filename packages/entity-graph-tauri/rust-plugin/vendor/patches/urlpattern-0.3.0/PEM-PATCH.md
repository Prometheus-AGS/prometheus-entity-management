# URLPattern 0.3.0 Unicode data backport

Base source is the published `urlpattern@0.3.0` crate. Its archive SHA-256 is
`70acd30e3aa1450bc2eece896ce2ad0d178e9c079493819301573dae3c37ba6d`.

Backport the identifier-property lookup from upstream
[URLPattern 0.4.0](https://github.com/denoland/rust-urlpattern/tree/20bb35a2f007518af0ec5a66c2307860b56faefe).
The tokenizer uses the ICU `ID_Start` and `ID_Continue` data already present
in the Tauri dependency graph. The special-character rules remain in place.
The newer Unicode data can recognize identifier characters introduced since
the old UNIC tables were published.

This removes the retired UNIC identifier and data crates while keeping the
Tauri consumer's `urlpattern ^0.3` and Rust 1.88 compatibility range.
