# Task 6 BDD RED — final archive truth

Date: 2026-08-02

The new scenario `Archive evidence stays complete without promoting the wider
release` was executed before its final manifest existed. The tagged feature
reported 8 scenarios: 7 passed and 1 failed; 26 steps: 23 passed, 2 skipped
after the failure, and 1 failed.

The expected failing assertion was:

```text
AssertionError: final Dart archive manifest must exist
```

This proves the scenario is sensitive to the missing task-6 deliverable rather
than passing on the earlier task-3/task-5 receipts alone. The green run must
prove all bounded library acceptance fields, named downstream owners,
`fullReleaseCertified: false`, deferred Pub.dev registry status, and
`publicationAuthorized: false`.
