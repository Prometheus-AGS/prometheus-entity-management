# Review round 3 resolution (judge gpt-6.1-sol)

| Area | Finding | Verdict | Action |
|---|---|---|---|
| lib | a decision finishing after a re-run could decide a later run's interrupt with the same id | accepted | interruptEpoch increments per pause; claimInterrupt returns it; decideInterrupt ignores a stale epoch |
| lib | exceptions in interruptToAction/onInterruptDecision stranded a claim | accepted | mapping+policy run in one try (fail closed, cancelled/policy-error); onInterruptDecision errors are reported, not thrown |
| lib | agent state retained across snapshots, runs and clear | accepted | STATE_SNAPSHOT replaces it; reset at beginRun and clear |
| a2a (W) | malformed supportedCatalogIds treated as any catalog | accepted | absent = unrestricted; list = must include; anything else offers nothing |
| examples | legacy Flutter widget tests rewritten (A-9) | accepted | both files restored to HEAD; they reference removed genui-era code and are legacy artifacts, not evidence |
| acceptance | lab action counted as complete on HTTP 200 alone | accepted | envelope's userAction.name must be lab.ping; the runtime emits envelopes only on decision "executed" (runtime-core.ts:149-151) |
| acceptance (W) | headless oracle passed if export dropped components/data | accepted | export must keep fixture component ids and data values |
| acceptance (W) | visual verifier ignored supporting digests and observed versions | accepted | both validated |
