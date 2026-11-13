# Review round 5 resolution (judge gpt-6.1-sol)

examples: PASS. lib: three criticals, all accepted.

| Finding | Action |
|---|---|
| switching graphStore left the old graph's conversation running | each ChatConversationStore is bound to one graph; a graph change creates a new store, and the old store's effect cleanup aborts its transport and cancels its run on its own graph |
| an approval started on one graph could resume a run on another | same fix: the decision closes over its store, which reads only its graph; resume happens only while that store is the active one |
| continuation chunks without messageId/toolCallId were dropped | the store carries the last chunked message and tool-call ids; reset at each run |
