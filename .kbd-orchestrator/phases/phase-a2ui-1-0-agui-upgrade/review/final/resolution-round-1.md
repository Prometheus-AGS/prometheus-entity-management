# Review round 1 resolution (judge gpt-6.1-sol via liter-llm :4000; producer claude-opus-5-5)

Earlier dispatches: k3.1-pro (configured judge) returned HTTP 500 / upstream 524 timeouts on all four packets, so the
judge was overridden to gpt-6.1-sol (PROMETHEUS_KBD_JUDGE_MODEL), a different vendor from the producer.

| Area | Finding | Verdict | Action |
|---|---|---|---|
| lib | runClientTools ran before an interrupt was read | accepted | A run that pauses on an interrupt runs no client tools (conversation-store.ts RUN_FINISHED) |
| lib | forwardSurfaceErrors compared "1.0" to the model's "v1.0" | accepted | uses isV1Surface (runtime-core.ts) |
| lib | run ownership per hook instance; passive view unmount cancelled shared run | accepted | per-graph, per-conversation run owner registry; cancel only by the owner; send/resume pass an abort callback |
| lib | resolveInterrupt could run the policy twice | accepted | claimInterrupt atomically claims in the graph before the policy; a throwing policy resolves as cancelled |
| lib | MESSAGES_SNAPSHOT dropped toolCalls | accepted | replaceMessages keeps well-formed toolCalls |
| a2a | A2UI path no longer activates the extension | rejected | execute() activates both extensions for any requesting turn (handler.ts 469-476); the removed line was a duplicate |
| a2a (W) | wrong-version inbound replies silently dropped | accepted | handler throws, failing the task |
| examples | readArtifact filtered on top-level mediaType only | accepted (partly) | our parts carry both; now also matches metadata.mimeType |
| examples (W) | golden kept variant h2 | accepted | removed |
| acceptance | run-stack ignored nonzero Playwright exit | accepted | added problem |
| acceptance | a2ui-v1 ignored headless process exit | accepted | added problem |
| acceptance | conformance control failed when no divergence remained | accepted | constructed-record control |
| acceptance (W) | scratch consumer leaked | accepted | removed in finally unless A2UI_V1_KEEP_SCRATCH |
| acceptance (W) | page errors did not fail scenarios | accepted | uncaught page errors fail; console.error recorded only |
