# Tasks — C4-alias-package

See the **C4-alias-package** section of the phase plan for full detail.

- [x] Alias package created with 3 entrypoints; registered in 4 registries; contract counts raised to 17/13
- [x] Both builds succeed; validate:release-contract errors: []; verify:package-contracts PASS 13 tarballs exit 0 (GAP-A RESOLVED — superset tolerated)
- [x] Caught and fixed a real defect: treeshake dropped the devtools/auto side-effect import, leaving an entrypoint that resolved but did nothing
