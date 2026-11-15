# Specta 2.0.0-rc.25 paste compatibility

Base source is the published `specta@2.0.0-rc.25` crate. Its archive SHA-256
is `38f9a30cbcbb7011f1da7d73483983bf838af123883e45f2b36ed76328df9c50`.
The MIT license is from the
[published source commit](https://github.com/specta-rs/specta/tree/e7fd23f586b9bd58de39002dabe49b1f978bf971).

The `paste` dependency key selects the maintained
[`pastey` compatibility alias](https://github.com/as1100k/pastey#migrating-from-paste-crate).
This preserves Specta's existing `paste::paste` macro re-export and
the exact Specta prerelease expected by Tauri Specta.
