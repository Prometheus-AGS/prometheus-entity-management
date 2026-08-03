# BDD red receipt

- Command: `pnpm run bdd:a2ui-bridge`
- Expected phase: red, before implementation evidence existed
- Result: exit code 1 with 5 failed scenarios
- Cause: the A2UI unit receipt and `visual-evidence.json` had not yet been implemented
- Resolution: implement the official protocol bridge, policy tests, packed consumer, and real browser evidence before rerunning the same feature unchanged
