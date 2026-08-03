# Task 6 adversarial correction — RC version RED receipt

The second isolated review found that the RC staging policy accepted the
already-published `3.0.0-alpha.0` manifests because it checked only the
`3.0.0-` prefix. A numbered-RC contract was added before implementation.

- Unit: 17 tests, 15 pass, 2 fail.
  - `assertReleaseCandidateVersion` is undefined.
  - The contract-derived manifest still contains `3.0.0-alpha.0` instead of a
    numbered RC.
- Cucumber: 12 scenarios, 11 pass, 1 fails.
- Cucumber steps: 48 total, 46 pass, 1 fails, 1 is skipped after the failing
  version-rule step.

This receipt proves the alpha-to-RC boundary was absent before the fix.
