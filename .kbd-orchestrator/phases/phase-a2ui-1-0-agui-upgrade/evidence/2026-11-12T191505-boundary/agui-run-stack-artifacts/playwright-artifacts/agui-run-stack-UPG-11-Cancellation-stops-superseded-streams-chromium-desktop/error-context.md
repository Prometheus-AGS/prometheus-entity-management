# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: agui-run-stack.spec.ts >> UPG-11 Cancellation stops superseded streams
- Location: tests/browser/agui-run-stack.spec.ts:381:5

# Error details

```
Error: [{"name":"the control stream's later events DO write to the graph (the counter observes writes)","pass":false,"detail":{"control":7,"expectedAtLeast":9}}]

expect(received).toBe(expected) // Object.is equality

Expected: "PASS"
Received: "FAIL"
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic [ref=e3]:
    - region "Superseded conversation" [ref=e4]:
      - button "Send first" [ref=e5]
      - button "Send second" [active] [ref=e6]
      - list [ref=e7]:
        - listitem [ref=e8]: First question
        - listitem [ref=e9]: a-before
        - listitem [ref=e10]: Second question
        - listitem [ref=e11]: b-reply to the second question.
    - region "Control conversation" [ref=e12]:
      - button "Send control" [ref=e13]
      - list [ref=e14]:
        - listitem [ref=e15]: Control question
        - listitem [ref=e16]: c-before c-late-0 c-late-1 c-late-2 c-late-3 c-late-4
        - listitem [ref=e17]: c-late-message
```

# Test source

```ts
  388 |   try {
  389 |     await open(page, "upg11", pageErrors);
  390 |     const superseded = page.locator('[data-view="superseded"]');
  391 |     const controlView = page.locator('[data-view="control"]');
  392 | 
  393 |     await page.locator("#send-first").click();
  394 |     await waitForRun((item) => item.script === "upg11-a" && item.waitingAt === f.gate, "stream A paused at the gate");
  395 |     await expect(superseded.locator(`li[data-message-id="${f.first.messageId}"]`)).toContainText(f.first.beforeGate.trim());
  396 | 
  397 |     await page.locator("#send-control").click();
  398 |     await waitForRun((item) => item.script === "upg11-c" && item.waitingAt === f.gate, "stream C paused at the gate");
  399 |     await expect(controlView.locator(`li[data-message-id="${f.control.messageId}"]`)).toContainText(f.control.beforeGate.trim());
  400 | 
  401 |     // The second send supersedes A while A is still open on the wire.
  402 |     await page.locator("#send-second").click();
  403 |     await expect(superseded.locator(`li[data-message-id="${f.second.messageId}"]`)).toContainText(f.second.text);
  404 |     await expect(superseded).toHaveAttribute("data-run-status", "finished");
  405 | 
  406 |     // Now A and C emit their later events.
  407 |     await release(f.gate);
  408 |     const runA = await waitForRun((item) => item.script === "upg11-a" && (item.completed || item.clientClosed), "stream A finished sending");
  409 |     const runC = await waitForRun((item) => item.script === "upg11-c" && (item.completed || item.clientClosed), "stream C finished sending");
  410 |     await expect.poll(async () => {
  411 |       const first = (await snapshot<Upg11Snapshot>(page)).streams.find((item) => item.label === "first");
  412 |       return Boolean(first && (first.finished || first.error !== null));
  413 |     }, { message: "the client finished receiving stream A" }).toBe(true);
  414 |     await expect(controlView.locator(`li[data-message-id="${f.control.lateMessageId}"]`)).toContainText("c-late-message");
  415 |     await expect(controlView).toHaveAttribute("data-run-status", "finished");
  416 | 
  417 |     const s = await snapshot<Upg11Snapshot>(page);
  418 |     const log = await agentLog();
  419 |     const runB = log.runs.find((item) => item.script === "upg11-b");
  420 |     const first = s.streams.find((item) => item.label === "first");
  421 |     const second = s.streams.find((item) => item.label === "second");
  422 |     const ctl = s.streams.find((item) => item.label === "control");
  423 |     const supersedeAt = s.supersede?.at ?? Number.POSITIVE_INFINITY;
  424 |     const firstLate = first?.events.filter((item) => item.at > supersedeAt) ?? [];
  425 |     const controlLate = ctl?.events.filter((item) => item.at > supersedeAt) ?? [];
  426 |     const after = s.writesAfterSupersede ?? {};
  427 |     const before = s.writesBeforeSupersede ?? {};
  428 |     const supersededDom = await domList(superseded);
  429 |     const controlDom = await domList(controlView);
  430 |     const firstMessage = message(s.graph.superseded, f.first.messageId);
  431 |     reached = true;
  432 | 
  433 |     const writeCounts = { beforeSupersede: before, afterSupersede: after };
  434 |     oracle.evidence.graphWriteCounts = writeCounts;
  435 |     oracle.evidence.supersede = s.supersede;
  436 |     oracle.evidence.streams = { first, second };
  437 |     oracle.evidence.agentRuns = { a: runA, b: runB ?? null };
  438 |     oracle.evidence.dom = supersededDom;
  439 |     oracle.evidence.graph = s.graph.superseded;
  440 |     control.evidence.graphWriteCounts = writeCounts;
  441 |     control.evidence.stream = ctl;
  442 |     control.evidence.agentRun = runC;
  443 |     control.evidence.dom = controlDom;
  444 |     oracle.evidence.writes = s.writes;
  445 | 
  446 |     check(oracle, "the second send was recorded as the supersede point", s.supersede !== null);
  447 |     check(oracle, "the AbortSignal passed to streamFactory for the first run is aborted, at or after the second send",
  448 |       first?.signalAborted === true && first.abortedAt !== null && first.abortedAt >= supersedeAt,
  449 |       { signalAborted: first?.signalAborted, abortedAt: first?.abortedAt, supersedeAt });
  450 |     check(oracle, "the second run's signal is not aborted", second?.signalAborted === false, { signalAborted: second?.signalAborted });
  451 |     check(oracle, "the first stream's later events were sent by the agent after the second send",
  452 |       runA.completed && runA.sent.filter((type) => type === "TEXT_MESSAGE_CONTENT").length === f.lateDeltas + 2,
  453 |       { sent: runA.sent, completed: runA.completed, clientClosed: runA.clientClosed });
  454 |     check(oracle, "the first stream's later events reached the browser through @ag-ui/client (non-vacuous)",
  455 |       firstLate.length >= f.lateDeltas, { laterEventsReceived: firstLate.length, types: firstLate.map((item) => item.type) });
  456 |     check(oracle, "the counter observed the first stream while it was current", (before.first ?? 0) > 0, { first: before.first ?? 0 });
  457 |     check(oracle, "the first stream's later events cause zero graph writes", (after.first ?? 0) === 0, { first: after.first ?? 0 });
  458 |     check(oracle, "the first stream's message is unchanged and its later message was never created",
  459 |       firstMessage?.content === f.first.beforeGate && !message(s.graph.superseded, f.first.lateMessageId)
  460 |         && !supersededDom.some((item) => item.text.includes("a-late")),
  461 |       { content: firstMessage?.content, dom: supersededDom });
  462 |     check(oracle, "the conversation record belongs to the second run (the first run's RUN_FINISHED wrote nothing)",
  463 |       s.graph.superseded.conversation?.runStatus === "finished" && s.graph.superseded.conversation?.runId === runB?.runId,
  464 |       { conversation: s.graph.superseded.conversation, secondRunId: runB?.runId });
  465 |     check(oracle, "the second stream rendered and wrote to the graph", (after.second ?? 0) > 0 && Boolean(second?.finished), { second: after.second ?? 0 });
  466 | 
  467 |     // Negative control: the un-superseded stream keeps writing after the same instant.
  468 |     const expectedControlWrites = f.lateDeltas + 1 + 3;
  469 |     check(control, "the control stream emitted later events after the second send, and the browser received them",
  470 |       runC.completed && controlLate.length >= f.lateDeltas, { laterEventsReceived: controlLate.length });
  471 |     check(control, "the control stream's later events DO write to the graph (the counter observes writes)",
  472 |       (after.control ?? 0) >= expectedControlWrites, { control: after.control ?? 0, expectedAtLeast: expectedControlWrites });
  473 |     check(control, "the control stream's later content renders",
  474 |       controlDom.some((item) => item.id === f.control.messageId && item.text.includes(`c-late-${f.lateDeltas - 1}`))
  475 |         && controlDom.some((item) => item.id === f.control.lateMessageId), { dom: controlDom });
  476 |     check(control, "the control stream's signal was never aborted and the run finished", ctl?.signalAborted === false && Boolean(ctl?.finished),
  477 |       { signalAborted: ctl?.signalAborted, finished: ctl?.finished });
  478 |     check(oracle, "no uncaught page errors", pageErrors.length === 0, pageErrors);
  479 |   } catch (cause) {
  480 |     result.error = `harness error: ${harnessError(cause)}`;
  481 |   }
  482 |   await page.evaluate(() => window.__aguiRunStack?.dispose()).catch(() => undefined);
  483 |   settle(oracle, reached);
  484 |   settle(control, reached);
  485 |   record(result);
  486 |   expect(result.error, result.error).toBeUndefined();
  487 |   expect(oracle.status, JSON.stringify(oracle.checks.filter((item) => !item.pass))).toBe("PASS");
> 488 |   expect(control.status, JSON.stringify(control.checks.filter((item) => !item.pass))).toBe("PASS");
      |                                                                                       ^ Error: [{"name":"the control stream's later events DO write to the graph (the counter observes writes)","pass":false,"detail":{"control":7,"expectedAtLeast":9}}]
  489 | });
  490 | 
  491 | // ── UPG-12 ──
  492 | 
  493 | interface AuditRecord {
  494 |   seq: number;
  495 |   status: string;
  496 |   name: string | null;
  497 |   sourceComponentId: string | null;
  498 |   context: Record<string, unknown> | null;
  499 |   code?: string;
  500 |   reason?: string;
  501 | }
  502 | 
  503 | interface Upg12Snapshot {
  504 |   entities: Record<string, { type: string; id: string; base: unknown; patch: unknown; merged: Record<string, unknown> | null }>;
  505 |   audit: AuditRecord[];
  506 |   interruptDecisions: Array<{ case: string; interruptId: string; entry: Record<string, unknown>; policyDecision: Record<string, unknown> | null }>;
  507 |   streams: StreamSnapshot[];
  508 |   conversations: Record<string, ConversationSnapshot>;
  509 | }
  510 | 
  511 | function entityDigest(entity: { base: unknown; patch: unknown } | undefined): string {
  512 |   return digest({ base: entity?.base ?? null, patch: entity?.patch ?? null });
  513 | }
  514 | 
  515 | test("UPG-12 Interrupt approvals through the entity action policy", async ({ page }) => {
  516 |   const oracle = part();
  517 |   const control = part();
  518 |   const pageErrors: string[] = [];
  519 |   const result: ScenarioResult = { kind: "scenario", id: "UPG-12", name: "Interrupt approvals through the entity action policy", oracle, negativeControl: control, pageErrors };
  520 |   const completed = { oracle: 0, control: 0 };
  521 |   try {
  522 |     await open(page, "upg12", pageErrors);
  523 |     for (const [caseName, c] of Object.entries(fixtures.upg12.cases)) {
  524 |       const target = c.role === "oracle" ? oracle : control;
  525 |       const view = page.locator(`[data-view="upg12-${caseName}"]`);
  526 |       const entityKey = `${c.action.context.entityType}:${c.action.context.entityId}`;
  527 |       const before = (await snapshot<Upg12Snapshot>(page)).entities[entityKey];
  528 | 
  529 |       await view.getByLabel("Message input").fill(fixtures.upg12.userText);
  530 |       await view.getByRole("button", { name: "Send message" }).click();
  531 |       const group = view.getByRole("group", { name: `Approval needed: ${c.reason}` });
  532 |       await expect(group).toBeVisible();
  533 |       const shownId = await group.getAttribute("data-interrupt-id");
  534 |       const paused = (await snapshot<Upg12Snapshot>(page)).conversations[caseName].conversation;
  535 | 
  536 |       if (c.decision === "edit-then-approve") await group.locator("textarea").fill(JSON.stringify(c.edited, null, 2));
  537 |       await group.getByRole("button", { name: c.decision === "deny" ? "Deny" : "Approve" }).click();
  538 |       const resumeRun = await waitForRun((item) => item.script === "upg12" && item.case === caseName && Array.isArray(item.resume) && item.completed, `upg12 ${caseName} resume run`);
  539 |       const resumeItem = view.locator(`li[data-message-id="resume-${caseName}"]`);
  540 |       await expect(resumeItem).toBeVisible();
  541 |       await expect(group).toHaveCount(0);
  542 | 
  543 |       const after = await snapshot<Upg12Snapshot>(page);
  544 |       const log = await agentLog();
  545 |       const firstRun = log.runs.find((item) => item.script === "upg12" && item.case === caseName && item.resume === null);
  546 |       const clientResumeStream = after.streams.find((item) => item.label === `upg12-${caseName}` && item.resume !== null);
  547 |       const auditRecords = after.audit.filter((item) => item.sourceComponentId === c.interruptId);
  548 |       const decision = after.interruptDecisions.find((item) => item.interruptId === c.interruptId);
  549 |       const entityAfter = after.entities[entityKey];
  550 |       const resumeText = ((await resumeItem.textContent()) ?? "").trim();
  551 |       const serverResume = resumeRun.resume ?? [];
  552 |       const evidence = {
  553 |         interruptShown: { dataInterruptId: shownId, conversationBeforeDecision: paused },
  554 |         firstRun: firstRun ?? null,
  555 |         resumePayloads: { agentReceived: serverResume, streamFactoryContext: clientResumeStream?.resume ?? null },
  556 |         clientPendingInterruptIds: clientResumeStream?.clientPendingInterruptIds ?? null,
  557 |         auditRecords,
  558 |         interruptDecision: decision ?? null,
  559 |         entityDigests: { before: entityDigest(before), after: entityDigest(entityAfter) },
  560 |         entities: { before, after: entityAfter },
  561 |         resumeRendered: resumeText,
  562 |       };
  563 |       target.evidence[caseName] = evidence;
  564 |       const label = (text: string): string => `${caseName}: ${text}`;
  565 | 
  566 |       check(target, label("the interrupt outcome shows the approval UI (EntityInterruptApproval) for that interrupt"),
  567 |         shownId === c.interruptId && paused?.runStatus === "interrupted", { shownId, runStatus: paused?.runStatus });
  568 |       check(target, label("@ag-ui/client tracked the interrupt as pending before the resume run (it parsed the outcome)"),
  569 |         Boolean(clientResumeStream?.clientPendingInterruptIds.includes(c.interruptId)), { pending: clientResumeStream?.clientPendingInterruptIds });
  570 |       check(target, label("the resume run's resume[] passed to streamFactory is what the agent received"),
  571 |         same(clientResumeStream?.resume, serverResume) && serverResume.length === 1, { client: clientResumeStream?.resume, agent: serverResume });
  572 | 
  573 |       if (caseName === "approve" || caseName === "edit") {
  574 |         const payload = caseName === "edit" ? c.edited : c.action.context;
  575 |         check(target, label("resume[] carries the approval: resolved with the approved values"),
  576 |           same(serverResume, [{ interruptId: c.interruptId, status: "resolved", payload }]), { resume: serverResume, expectedPayload: payload });
  577 |         check(target, label("the policy audit records one executed decision with those values"),
  578 |           auditRecords.length === 1 && auditRecords[0].status === "executed" && auditRecords[0].name === c.action.name && same(auditRecords[0].context, payload),
  579 |           { auditRecords });
  580 |         const data = (payload as { data: Record<string, unknown> }).data;
  581 |         check(target, label("the guarded entity now holds the approved values"),
  582 |           Object.entries(data).every(([key, value]) => same(entityAfter?.merged?.[key], value)) && entityDigest(before) !== entityDigest(entityAfter),
  583 |           { before: before?.merged, after: entityAfter?.merged });
  584 |         check(target, label("the resumed run renders"), resumeText.startsWith("resume resolved"), { resumeText });
  585 |         completed.oracle += 1;
  586 |       } else if (caseName === "deny") {
  587 |         check(target, label("deny resumes with a denial (cancelled, denied-by-user)"),
  588 |           same(serverResume, [{ interruptId: c.interruptId, status: "cancelled", payload: { reason: "denied-by-user" } }]), { resume: serverResume });
```