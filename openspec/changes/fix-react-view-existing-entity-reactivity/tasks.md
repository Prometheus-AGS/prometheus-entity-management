## 1. Contract and Regression

- [x] 1.1 Define existing-entity React projection behavior and verify `openspec validate fix-react-view-existing-entity-reactivity --strict` passes
- [x] 1.2 Add focused unchanged-ID regression controls for both public view paths and observe both fail before the implementation change

## 2. Implementation and Release

- [x] 2.1 Subscribe both item projections to cached entity snapshots and verify package typecheck, scoped ESLint, and the focused 2-test suite pass
- [x] 2.2 Run the full React package test, build, and `prepublishOnly` gates; verify 58 tests and the 203-export ledger pass
- [x] 2.3 Add a patch Changeset and verify `pnpm changeset status` retains the coordinated fixed npm version group

## 3. Review and Delivery

- [ ] 3.1 Obtain independent critic and judge approval, then commit, push, and open the upstream pull request
