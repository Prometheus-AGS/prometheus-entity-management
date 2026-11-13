# Boundary run 11 (repair attempt 10, budget 20 after amendment 5) — stopped at step 12 (FAIL)

Steps 1–11 exited 0: bridge and visual gate, package contracts, verify:a2ui-v1 (9/9), A2A conformance, AG-UI run stack
(UPG-10/11/12), and all three examples (UPG-14).
Step 12 `verify:a2ui-conformance`: 29 cases — 22 PASS, 6 DIVERGED within their allowances, 1 FAIL. The mutated-case
control and both divergence controls failed the evaluation as required.

FAIL: core/adapter_conformance.yaml#agent_function_action_failure_reports_expression_error failed outside its listed
allowances on `steps[2] expectDataModel` (expected {"counter":10}, got {"counter":11}). At the step-1 gesture the
bundled 0.15.0 renderer cannot route the `lookupAccount` agent function, sends an `error` instead of
`callAgentFunction` (allowed), and still runs the local `incrementCounter` with the unresolved argument (default step 1).
Same upstream gap as the entry's reason, with a side effect the entry did not predict. Awaiting an operator decision:
add the allowance with that reason, or change the behaviour. Steps 13–14: NOT_EXERCISED.
