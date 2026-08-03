# Task 3 adversarial and combined BDD green receipt

Date: 2026-08-01  
Verdict: **PASS**  
Retry count: **0**  
Flaky scenarios: **0**

## Focused tamper feature

- 6 scenarios passed
- 22 steps passed
- 4 hooks passed
- Machine report: `task-3-tamper-cucumber.json`

## Combined provenance contract

- 11 scenarios passed
- 46 steps passed
- 4 hooks passed
- Machine report: `task-3-combined-cucumber.json`

## Node contract and integration tests

- 12 tests passed
- 0 failed, skipped, cancelled, or todo
- Includes the real Git-aware verifier and report receipt

The production verifier now invokes the same portable contract function used
by the unit and BDD tamper tests. A positive receipt therefore cannot bypass the
fail-closed validation rules exercised here.
