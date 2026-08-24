# Cycle-1 correction evidence

Re-evaluate the complete current packet. Do not reuse the cycle-1 verdict.

1. The canonical executor already parsed the URL and rejected plaintext remote
   hosts, which the first packet did not expose. Inspection found a narrower
   real defect: non-HTTP schemes on loopback bypassed the check. The current diff
   changes `packages/entity-graph-a2a/src/external-executor.ts` to allow HTTPS
   universally and HTTP only for `localhost`, `127.0.0.1`, and `[::1]`. The
   current diff also contains a RED-first regression and three passing policy
   cases in `a2a-server.test.ts`.
2. `openspec/changes/v3-agentic-a2ui-example/files.txt` now contains all three
   PNG screenshots and all three Playwright `trace.zip` files. The corrected
   packet must show six binary diff entries plus the hash-bound task-5 report.
3. `tests/browser/v3-agentic-a2ui-example.spec.ts` now runs axe in each happy,
   malformed, and cancelled state. `browser-evidence.json` contains an exact
   per-flow accessibility map and `verify-agentic-a2ui-example.mjs` rejects a
   missing flow or any serious/critical count.
4. The regenerated clean report has status `pass`, 18 successful commands,
   three endpoint-policy tests, three Chromium flows, ten matching hashes, and
   zero serious/critical findings in every flow.

The source-workspace, packed-package, live-external-agent, native-platform,
frozen-RC, and registry-publication exclusions remain unchanged.
