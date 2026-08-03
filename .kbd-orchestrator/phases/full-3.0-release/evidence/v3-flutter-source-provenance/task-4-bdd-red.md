# Task 4 BDD red receipt

Command:

```text
pnpm run bdd:flutter-source-provenance -- --format summary
```

Expected red result: exit 1 with the new release-ledger contract undefined while all prior provenance scenarios remained green.

```text
4 hooks (4 passed)
14 scenarios (11 passed, 3 undefined)
56 steps (46 passed, 10 undefined)
```

The undefined scenarios required: an implemented provenance quality gate with downstream Flutter work still planned; explicit no-public-export impact; and maintainer/skill documentation that preserves the sole canonical Dart owner and blocks runtime, rendering, registry, and stable-release overclaims.
