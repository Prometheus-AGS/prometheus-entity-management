# BDD red-to-green record — v3 package module contracts

Date: 2026-08-01  
Change: `v3-package-module-contracts`  
Task: 3 of 6

The first focused Cucumber run executed the complete packed-candidate matrix and reached the build-contract scenario, then failed 1 of 4 scenarios because the Lit import-mode source assertion was over-escaped:

```text
4 scenarios (3 passed, 1 failed)
20 steps (19 passed, 1 failed)
AssertionError: input did not match /"resolution-mode": \\"import\\"/
```

The product source already contained the required `"resolution-mode": "import"` text. The BDD expression was corrected without changing or bypassing the package verifier. The repeated focused run passed all four scenarios and twenty steps.

The unit suite also carries mutation-based red checks. It proves that `.js` CommonJS routing, shared ESM/CJS declarations, missing README files, missing `.cjs` artifacts, leaked `src/`, unexpected payload paths, Cargo lockfiles, workspace protocols, absolute file dependencies, developer paths, and an unrecognized generated Lit declaration header are rejected.
