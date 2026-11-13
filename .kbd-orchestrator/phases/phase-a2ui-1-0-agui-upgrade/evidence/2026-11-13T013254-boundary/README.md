# Boundary run 12 (repair attempt 11) — stopped at step 13 (FAIL)

Steps 1–12 exited 0, including upstream conformance (22 PASS, 7 DIVERGED within allowances, controls failing as required).
Step 13 `verify:flutter-a2ui-v1`: pins resolved (a2ui_flutter 0.3.0, a2ui_core 0.7.0, no genui) on iPhone 17 Pro (iOS 26.4).
The integration run failed before any test: "Failed to build iOS app … Undefined symbol: _OBJC_CLASS_$_FlutterAppDelegate"
(first cold Xcode build after the dependency change did not link the Flutter framework). The negative-control run built
in 25 s, launched, and failed exactly at its flipped assertion (line 45), so the app rendered the surface and pressed the
denied delete; the app itself works.

Repair (attempt 12): each simulator run is repeated once only when the app failed to build or launch (never on a test
assertion), both attempts recorded; the negative control must fail on its assertion, not on app start.
Step 14: NOT_EXERCISED.
