# Review round 12 resolution (judge gpt-6.1-sol)

| Finding | Verdict | Action |
|---|---|---|
| a decision completed after unmount stranded the pause (decided, never resumed) | accepted | store.pendingResume(); a view mounting on a pause whose interrupts are all decided resumes it with the recorded decisions (the policy never runs twice) |
| (W) superseded or cancelled runs left messages streaming | accepted | settleStreaming() clears the flag at beginRun and cancel |
