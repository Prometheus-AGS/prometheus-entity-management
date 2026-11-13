# Boundary run 10 (repair attempt 9) — stopped at step 11 (FAIL)

Steps 1–10 exited 0: bridge and visual gate, package contracts, verify:a2ui-v1 (9/9), A2A conformance, and the AG-UI
run stack (UPG-10/11/12 PASS).
Step 11 `verify:a2ui-examples`: agentic-a2ui-app showed lifecycle `validation-failed`; the other two examples recorded
no capture (the browser run ended after the first failure).

Root cause (example defect, reproduced in Node against the built headless runtime): A2UI 1.0 requires component ids to
be Unicode identifiers (UAX #31). The example surfaces used hyphenated ids (`update-button`, `mark-done`, …), refused
with "Component id 'update-button' must be a valid UAX #31 identifier". The same ids were in the agentic-a2ui surface,
both Flutter surfaces and the activity-lab surface built by the examples spec.

Repair prepared (not yet run): hyphenated component ids renamed to snake_case in agentic-a2ui-app (surface + fixture),
agentic-a2ui (surface + golden), Flutter (both surfaces) and the examples spec's lab surface; probes show both React
example surfaces now process. Migration guide and skill reference document the rule.
Steps 12–14 of this folder: NOT_EXERCISED. The next rerun is repair attempt 10 of the contract's 10.
