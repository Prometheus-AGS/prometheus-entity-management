# Task 4 BDD red evidence

**Date:** 2026-08-02  
**Task:** Synchronize Tauri coverage, public API ledgers, skills, and documentation.

The focused Node contract failed four requirement-specific checks before the
implementation existed:

- the Tauri runtime/declaration export ledger was missing;
- the Tauri quality gate and implemented/planned evidence split were missing;
- root and package skills-verification scripts did not include Tauri;
- package, release, and skill guides did not state the permission and
  persistence boundaries.

The focused Cucumber scenario failed at
`runtime and declaration exports match the Tauri skill ledger` with
`the Tauri public API ledger must exist`. No production implementation was
written before these failures were observed.
