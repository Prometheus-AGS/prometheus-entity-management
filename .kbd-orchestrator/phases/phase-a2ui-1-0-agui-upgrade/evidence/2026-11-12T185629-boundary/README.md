# Boundary run 4 (repair attempt 3) — stopped at step 8 (FAIL)

Steps 1–7 exited 0: bridge and visual gate, and package contracts (UPG-15, including the TS2835 control and zod 4.6.7).
Step 8 `verify:a2ui-v1`: UPG-2, 5, 6, 8 PASS; UPG-1, 4, 7, 13, 17 FAIL.

Root cause (product defect, reproduced in Node against dist/headless.mjs): `isV1Surface` tested
`protocolVersion.startsWith("v1")`, but the official 0.15.0 surface model stores the wire form `"1.0"`. Every held 1.0
surface was therefore reseeded into the preflight shadow processor as v0.9.1, so any later 1.0 message on it failed with
"catalog … specification version (1.0) does not match message protocol version (v0.9.1)" (UPG-1, 4, 13), and agent
function answers could not be applied, so calls timed out (UPG-7, 17). The round-1 review change to surface-error
forwarding relied on the same wrong comment.

Repair (attempt 4): `isV1Surface` accepts `1.0` and `v1.0`. Probe after rebuild: create, update and batch all succeed.
Whole packet rerun (the package changed). Steps 9–14 of this folder: NOT_EXERCISED.
