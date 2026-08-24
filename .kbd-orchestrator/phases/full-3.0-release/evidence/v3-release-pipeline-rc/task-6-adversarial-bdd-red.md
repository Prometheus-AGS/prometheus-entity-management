# Task 6 adversarial correction — RED receipt

The isolated review found that the stage job reused absolute tarball paths
recorded on the rehearsal runner. A regression contract was added before the
fix.

- Unit: 16 tests, 15 pass, 1 fails because
  `resolveCandidateBundlePath` is undefined.
- Cucumber: 11 scenarios, 10 pass, 1 fails.
- Cucumber steps: 45 total, 42 pass, 1 fails, 2 are skipped after the failing
  relocation step.
- Expected failure: the downloaded-bundle relocation contract has no
  implementation.

This receipt proves the cross-job path defect was observable before the
implementation changed.
