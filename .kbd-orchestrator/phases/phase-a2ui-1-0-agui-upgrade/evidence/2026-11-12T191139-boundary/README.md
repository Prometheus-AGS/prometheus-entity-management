# Boundary run 8 (repair attempt 7) — stopped at step 10 (FAIL)

Steps 1–9 exited 0: bridge and visual gate, package contracts, verify:a2ui-v1 (9/9), A2A conformance.
Step 10 `verify:agui-run-stack`: UPG-12 PASS; UPG-10 and UPG-11 oracle FAIL (controls PASS), both from intended product
changes made in the review, measured by checks written before them:

- UPG-10 compared the whole message bubble text with the streamed content; EntityChat now also lists the tool call
  under the message (`lookup_invoice{…}`), as the review required. Repair: compare `.a2ui-msg__content`.
- UPG-11 counted 1 write to the superseded stream's message after the supersede point: the second run's beginRun
  settling the abandoned message (streaming true -> false only), not an event of the first stream. Repair: the counter
  excludes writes whose only change is streaming true -> false (still recorded, flagged `settle`); the "A's message is
  unchanged" check is untouched.

Repair (attempt 8): verifier only. Whole packet rerun. Steps 11–14 of this folder: NOT_EXERCISED.
