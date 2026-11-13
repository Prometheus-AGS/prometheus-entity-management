# Boundary run 9 (repair attempt 8) — stopped at step 10 (FAIL)

Steps 1–9 exited 0. Step 10 `verify:agui-run-stack`: UPG-10 PASS, UPG-12 PASS, UPG-11 oracle PASS; UPG-11 negative
control FAIL: the control stream wrote 7 times after the supersede point, expected at least 9.

Root cause (verifier defect introduced by repair 8): excluding every "streaming true -> false only" write also excluded
the control stream's genuine TEXT_MESSAGE_END writes. Repair (attempt 9): filter reverted; instead the write mark is
taken right after the second sendMessage's synchronous part (which settles the abandoned message and adds the user
message; no first-stream event can run in between), while the abort-time mark stays before the call.
Whole packet rerun. Steps 11–14 of this folder: NOT_EXERCISED.
