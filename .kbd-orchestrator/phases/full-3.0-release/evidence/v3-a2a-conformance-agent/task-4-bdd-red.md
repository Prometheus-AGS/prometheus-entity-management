# Task 4 BDD red receipt

- Change: `v3-a2a-conformance-agent`
- Task: 4 of 6
- Scenario: `Release docs and agent ledgers describe the shipped boundary`
- Command: `pnpm exec cucumber-js --tags '@v3-a2a-conformance-agent' --name 'Release docs and agent ledgers describe the shipped boundary'`
- Result: expected failure, 1 scenario failed; 2 steps passed, 4 skipped, 1 failed.

The failing assertion required
`.kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2a-conformance-agent/task-4-ledgers-docs.md`.
The coverage declaration already named this synchronization receipt, but the
receipt did not exist. This proves the task could not turn green merely from
the protocol implementation or earlier task-3 evidence.

