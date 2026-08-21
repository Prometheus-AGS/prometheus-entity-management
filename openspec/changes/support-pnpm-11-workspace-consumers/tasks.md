## 1. Contract

- [x] 1.1 Define pnpm 11 consumer compatibility and pass strict OpenSpec validation
- [x] 1.2 Add and observe a failing contract control for UAR's pnpm 11.15.0

## 2. Implementation

- [x] 2.1 Widen the root and v3 release compatibility ranges without changing the pinned default
- [x] 2.2 Pass the focused v3 contract scenario, workspace typecheck, and scoped lint; record the unrelated root-lint baseline
- [x] 2.3 Pass UAR's pnpm 11 TypeScript and focused SSE checks against the corrected commit
- [x] 2.4 Correct the pnpm 10.33.0 integrity digest and observe a clean-cache Corepack resolution

## 3. Delivery

- [x] 3.1 Obtain independent review, commit, push, and open the compatibility and canonical rc.2 release pull requests
- [ ] 3.2 Correct the clean-cache integrity defect, obtain independent re-review, commit, and push the correction
