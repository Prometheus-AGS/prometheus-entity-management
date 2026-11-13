# Boundary run 17 (repair attempt 16) — PASS

All 14 commands of the adopted contract's boundary packet exited 0 in one run (contract digest bfa43f3b…, amendment 5).
Source: git HEAD a8f543dc915fccc7bbaf51dab10ec693db635971 plus the uncommitted working tree (diff sha256 3028ea9704d458e452db81b282419ab633312b49eb9859e550608c3cf8d439c9).

| Scenario | Name | Status | Step(s) | Receipt | Report |
| --- | --- | --- | --- | --- | --- |
| UPG-1 | Conformant A2UI 1.0 surface renders through the built package | PASS | 8 | [receipts/UPG-1.json](receipts/UPG-1.json) | a2ui-v1.json |
| UPG-2 | Real AG-UI A2UI middleware surface renders and recovery resyncs | PASS | 8 | [receipts/UPG-2.json](receipts/UPG-2.json) | a2ui-v1.json |
| UPG-3 | Upstream adapter and accessibility conformance cases pass | PASS | 12 | [receipts/UPG-3.json](receipts/UPG-3.json) | conformance.json |
| UPG-4 | Catalog pairing by protocol version | PASS | 8 | [receipts/UPG-4.json](receipts/UPG-4.json) | a2ui-v1.json |
| UPG-5 | Bare and @-prefixed envelope keys | PASS | 8 | [receipts/UPG-5.json](receipts/UPG-5.json) | a2ui-v1.json |
| UPG-6 | Agent-to-renderer function calls are restricted | PASS | 8 | [receipts/UPG-6.json](receipts/UPG-6.json) | a2ui-v1.json |
| UPG-7 | Renderer-to-agent function responses under policy and limits | PASS | 8 | [receipts/UPG-7.json](receipts/UPG-7.json) | a2ui-v1.json |
| UPG-8 | User-activation functions require a gesture | PASS | 8 | [receipts/UPG-8.json](receipts/UPG-8.json) | a2ui-v1.json |
| UPG-9 | A2A on the official A2UI v1.0 extension | PASS | 9 | [receipts/UPG-9.json](receipts/UPG-9.json) | a2a-conformance.json |
| UPG-10 | AG-UI 1.0 run stream drives EntityChat through the graph | PASS | 10 | [receipts/UPG-10.json](receipts/UPG-10.json) | agui-run-stack.json |
| UPG-11 | Cancellation stops superseded streams | PASS | 10 | [receipts/UPG-11.json](receipts/UPG-11.json) | agui-run-stack.json |
| UPG-12 | Interrupt approvals through the entity action policy | PASS | 10 | [receipts/UPG-12.json](receipts/UPG-12.json) | agui-run-stack.json |
| UPG-13 | Headless export by protocol version | PASS | 8 | [receipts/UPG-13.json](receipts/UPG-13.json) | a2ui-v1.json |
| UPG-14 | Examples run A2UI 1.0 end to end | PASS | 11 | [receipts/UPG-14.json](receipts/UPG-14.json) | examples.json |
| UPG-15 | Packed consumers type-check strictly and the zod advisory stays closed | PASS | 6, 7 | [receipts/UPG-15.json](receipts/UPG-15.json) | package-contracts.json |
| UPG-16 | Exports, skills, release contract and generated docs in sync | PASS | 14 | [receipts/UPG-16.json](receipts/UPG-16.json) | logs/step-14.log |
| UPG-17 | RC-input shim is opt-in and maps RC actions to 1.0 function calls | PASS | 8 | [receipts/UPG-17.json](receipts/UPG-17.json) | a2ui-v1.json |
| UPG-18 | Flutter showcase renders A2UI 1.0 final through a2ui_flutter under the Riverpod action policy | PASS | 13 | [receipts/UPG-18.json](receipts/UPG-18.json) | flutter-a2ui-v1.json |

Notes:
- UPG-3: 22 PASS, 7 DIVERGED within tests/conformance/a2ui/divergences.json (sha256 in conformance.json), 0 FAIL; the
  mutated-case control and both divergence controls failed the evaluation as required.
- UPG-15: the visual gate applied the operator-recorded axe exception (aria-prohibited-attr on official a2ui-basic-* hosts).
- UPG-18: built and passed on the first attempt (no app build/launch retry); negative control failed on its assertion.
- Earlier runs 1–16 (repairs 1–15) are recorded in their own dated folders with their failures and repairs.
- Cleanup: scripted agents and preview servers are stopped by each verifier; the simulator was booted and shut down by
  verify:flutter-a2ui-v1; scratch consumers are removed.
