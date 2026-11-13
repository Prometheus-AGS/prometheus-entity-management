# Review round 10 resolution (judge gpt-6.1-sol)

| Finding | Verdict | Action |
|---|---|---|
| an onMessage callback fired by closing a chunk could supersede the run, then the old event still wrote | accepted | apply() re-checks the run after closeChunks |
| a partially malformed interrupt outcome resumed after deciding only the readable subset | accepted | readInterruptOutcome returns [] if any entry is unreadable, so RUN_FINISHED fails closed |
