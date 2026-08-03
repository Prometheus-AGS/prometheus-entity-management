# Decisions — `v3-tauri-mobile-plugin`

### Iteration 1 decision

- **Decision**: terminate evidence refinement; do not archive OpenSpec
- **Iteration**: 1 of 5
- **Evidence-quality blocking violations remaining**: 0
- **Plan-acceptance blockers remaining**: Android and iOS native bridge and denial receipts; clean current-candidate CI rerun
- **Rationale**: the disposition is complete, synchronized, accessible, and fail-closed, but the platform execution criterion is not satisfied
- **Next focus**: capture target-host receipts through the universal Tauri host, rerun clean CI, then repeat verify/refiner/adversarial gates

### Iteration 2 decision

- **Decision**: terminate after adversarial remediation; do not archive OpenSpec
- **Iteration**: 2 of 5
- **Evidence-quality blocking violations remaining**: 0
- **Plan-acceptance blockers remaining**: Android and iOS native bridge and denial receipts; clean current-candidate CI rerun
- **Rationale**: the missing Swift registration symbol is fixed and permanently checked, while the release disposition remains correctly blocked
- **Next focus**: capture target-host receipts through the universal Tauri host, rerun clean CI, then repeat verify/refiner/adversarial gates

### Iteration 3 decision

- **Decision**: terminate blocker-resolution refinement; authorize OpenSpec archive after fresh adversarial PASS
- **Iteration**: 3 of 5
- **Evidence-quality blocking violations remaining**: 0
- **Plan-acceptance blockers remaining**: none for `v3-tauri-mobile-plugin`
- **Rationale**: physical Android and simulated iOS success/denial receipts are exact and hash-verified, the clean isolated Rust/BDD lane passes, and generated mobile build state is excluded from the 41-file npm candidate
- **Boundary**: full 3.0.0 certification and all registry/GitHub publication mutations remain unauthorized
- **Next focus**: rerun adversarial diff review, archive this single OpenSpec change on PASS, and let KBD select the next dependency-ready change in a later logical turn
