# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: agui-run-stack.spec.ts >> UPG-11 Cancellation stops superseded streams
- Location: tests/browser/agui-run-stack.spec.ts:378:5

# Error details

```
Error: [{"name":"the first stream's later events cause zero graph writes","pass":false,"detail":{"first":1}}]

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
  384 |   let reached = false;
  385 |   try {
  386 |     await open(page, "upg11", pageErrors);
  387 |     const superseded = page.locator('[data-view="superseded"]');
  388 |     const controlView = page.locator('[data-view="control"]');
  389 | 
  390 |     await page.locator("#send-first").click();
  391 |     await waitForRun((item) => item.script === "upg11-a" && item.waitingAt === f.gate, "stream A paused at the gate");
  392 |     await expect(superseded.locator(`li[data-message-id="${f.first.messageId}"]`)).toContainText(f.first.beforeGate.trim());
  393 | 
  394 |     await page.locator("#send-control").click();
  395 |     await waitForRun((item) => item.script === "upg11-c" && item.waitingAt === f.gate, "stream C paused at the gate");
  396 |     await expect(controlView.locator(`li[data-message-id="${f.control.messageId}"]`)).toContainText(f.control.beforeGate.trim());
  397 | 
  398 |     // The second send supersedes A while A is still open on the wire.
  399 |     await page.locator("#send-second").click();
  400 |     await expect(superseded.locator(`li[data-message-id="${f.second.messageId}"]`)).toContainText(f.second.text);
  401 |     await expect(superseded).toHaveAttribute("data-run-status", "finished");
  402 | 
  403 |     // Now A and C emit their later events.
  404 |     await release(f.gate);
  405 |     const runA = await waitForRun((item) => item.script === "upg11-a" && (item.completed || item.clientClosed), "stream A finished sending");
  406 |     const runC = await waitForRun((item) => item.script === "upg11-c" && (item.completed || item.clientClosed), "stream C finished sending");
  407 |     await expect.poll(async () => {
  408 |       const first = (await snapshot<Upg11Snapshot>(page)).streams.find((item) => item.label === "first");
  409 |       return Boolean(first && (first.finished || first.error !== null));
  410 |     }, { message: "the client finished receiving stream A" }).toBe(true);
  411 |     await expect(controlView.locator(`li[data-message-id="${f.control.lateMessageId}"]`)).toContainText("c-late-message");
  412 |     await expect(controlView).toHaveAttribute("data-run-status", "finished");
  413 | 
  414 |     const s = await snapshot<Upg11Snapshot>(page);
  415 |     const log = await agentLog();
  416 |     const runB = log.runs.find((item) => item.script === "upg11-b");
  417 |     const first = s.streams.find((item) => item.label === "first");
  418 |     const second = s.streams.find((item) => item.label === "second");
  419 |     const ctl = s.streams.find((item) => item.label === "control");
  420 |     const supersedeAt = s.supersede?.at ?? Number.POSITIVE_INFINITY;
  421 |     const firstLate = first?.events.filter((item) => item.at > supersedeAt) ?? [];
  422 |     const controlLate = ctl?.events.filter((item) => item.at > supersedeAt) ?? [];
  423 |     const after = s.writesAfterSupersede ?? {};
  424 |     const before = s.writesBeforeSupersede ?? {};
  425 |     const supersededDom = await domList(superseded);
  426 |     const controlDom = await domList(controlView);
  427 |     const firstMessage = message(s.graph.superseded, f.first.messageId);
  428 |     reached = true;
  429 | 
  430 |     const writeCounts = { beforeSupersede: before, afterSupersede: after };
  431 |     oracle.evidence.graphWriteCounts = writeCounts;
  432 |     oracle.evidence.supersede = s.supersede;
  433 |     oracle.evidence.streams = { first, second };
  434 |     oracle.evidence.agentRuns = { a: runA, b: runB ?? null };
  435 |     oracle.evidence.dom = supersededDom;
  436 |     oracle.evidence.graph = s.graph.superseded;
  437 |     control.evidence.graphWriteCounts = writeCounts;
  438 |     control.evidence.stream = ctl;
  439 |     control.evidence.agentRun = runC;
  440 |     control.evidence.dom = controlDom;
  441 |     oracle.evidence.writes = s.writes;
  442 | 
  443 |     check(oracle, "the second send was recorded as the supersede point", s.supersede !== null);
  444 |     check(oracle, "the AbortSignal passed to streamFactory for the first run is aborted, at or after the second send",
  445 |       first?.signalAborted === true && first.abortedAt !== null && first.abortedAt >= supersedeAt,
  446 |       { signalAborted: first?.signalAborted, abortedAt: first?.abortedAt, supersedeAt });
  447 |     check(oracle, "the second run's signal is not aborted", second?.signalAborted === false, { signalAborted: second?.signalAborted });
  448 |     check(oracle, "the first stream's later events were sent by the agent after the second send",
  449 |       runA.completed && runA.sent.filter((type) => type === "TEXT_MESSAGE_CONTENT").length === f.lateDeltas + 2,
  450 |       { sent: runA.sent, completed: runA.completed, clientClosed: runA.clientClosed });
  451 |     check(oracle, "the first stream's later events reached the browser through @ag-ui/client (non-vacuous)",
  452 |       firstLate.length >= f.lateDeltas, { laterEventsReceived: firstLate.length, types: firstLate.map((item) => item.type) });
  453 |     check(oracle, "the counter observed the first stream while it was current", (before.first ?? 0) > 0, { first: before.first ?? 0 });
  454 |     check(oracle, "the first stream's later events cause zero graph writes", (after.first ?? 0) === 0, { first: after.first ?? 0 });
  455 |     check(oracle, "the first stream's message is unchanged and its later message was never created",
  456 |       firstMessage?.content === f.first.beforeGate && !message(s.graph.superseded, f.first.lateMessageId)
  457 |         && !supersededDom.some((item) => item.text.includes("a-late")),
  458 |       { content: firstMessage?.content, dom: supersededDom });
  459 |     check(oracle, "the conversation record belongs to the second run (the first run's RUN_FINISHED wrote nothing)",
  460 |       s.graph.superseded.conversation?.runStatus === "finished" && s.graph.superseded.conversation?.runId === runB?.runId,
  461 |       { conversation: s.graph.superseded.conversation, secondRunId: runB?.runId });
  462 |     check(oracle, "the second stream rendered and wrote to the graph", (after.second ?? 0) > 0 && Boolean(second?.finished), { second: after.second ?? 0 });
  463 | 
  464 |     // Negative control: the un-superseded stream keeps writing after the same instant.
  465 |     const expectedControlWrites = f.lateDeltas + 1 + 3;
  466 |     check(control, "the control stream emitted later events after the second send, and the browser received them",
  467 |       runC.completed && controlLate.length >= f.lateDeltas, { laterEventsReceived: controlLate.length });
  468 |     check(control, "the control stream's later events DO write to the graph (the counter observes writes)",
  469 |       (after.control ?? 0) >= expectedControlWrites, { control: after.control ?? 0, expectedAtLeast: expectedControlWrites });
  470 |     check(control, "the control stream's later content renders",
  471 |       controlDom.some((item) => item.id === f.control.messageId && item.text.includes(`c-late-${f.lateDeltas - 1}`))
  472 |         && controlDom.some((item) => item.id === f.control.lateMessageId), { dom: controlDom });
  473 |     check(control, "the control stream's signal was never aborted and the run finished", ctl?.signalAborted === false && Boolean(ctl?.finished),
  474 |       { signalAborted: ctl?.signalAborted, finished: ctl?.finished });
  475 |     check(oracle, "no uncaught page errors", pageErrors.length === 0, pageErrors);
  476 |   } catch (cause) {
  477 |     result.error = `harness error: ${harnessError(cause)}`;
  478 |   }
  479 |   await page.evaluate(() => window.__aguiRunStack?.dispose()).catch(() => undefined);
  480 |   settle(oracle, reached);
  481 |   settle(control, reached);
  482 |   record(result);
  483 |   expect(result.error, result.error).toBeUndefined();
> 484 |   expect(oracle.status, JSON.stringify(oracle.checks.filter((item) => !item.pass))).toBe("PASS");
      |                                                                                     ^ Error: [{"name":"the first stream's later events cause zero graph writes","pass":false,"detail":{"first":1}}]
  485 |   expect(control.status, JSON.stringify(control.checks.filter((item) => !item.pass))).toBe("PASS");
  486 | });
  487 | 
  488 | // ── UPG-12 ──
  489 | 
  490 | interface AuditRecord {
  491 |   seq: number;
  492 |   status: string;
  493 |   name: string | null;
  494 |   sourceComponentId: string | null;
  495 |   context: Record<string, unknown> | null;
  496 |   code?: string;
  497 |   reason?: string;
  498 | }
  499 | 
  500 | interface Upg12Snapshot {
  501 |   entities: Record<string, { type: string; id: string; base: unknown; patch: unknown; merged: Record<string, unknown> | null }>;
  502 |   audit: AuditRecord[];
  503 |   interruptDecisions: Array<{ case: string; interruptId: string; entry: Record<string, unknown>; policyDecision: Record<string, unknown> | null }>;
  504 |   streams: StreamSnapshot[];
  505 |   conversations: Record<string, ConversationSnapshot>;
  506 | }
  507 | 
  508 | function entityDigest(entity: { base: unknown; patch: unknown } | undefined): string {
  509 |   return digest({ base: entity?.base ?? null, patch: entity?.patch ?? null });
  510 | }
  511 | 
  512 | test("UPG-12 Interrupt approvals through the entity action policy", async ({ page }) => {
  513 |   const oracle = part();
  514 |   const control = part();
  515 |   const pageErrors: string[] = [];
  516 |   const result: ScenarioResult = { kind: "scenario", id: "UPG-12", name: "Interrupt approvals through the entity action policy", oracle, negativeControl: control, pageErrors };
  517 |   const completed = { oracle: 0, control: 0 };
  518 |   try {
  519 |     await open(page, "upg12", pageErrors);
  520 |     for (const [caseName, c] of Object.entries(fixtures.upg12.cases)) {
  521 |       const target = c.role === "oracle" ? oracle : control;
  522 |       const view = page.locator(`[data-view="upg12-${caseName}"]`);
  523 |       const entityKey = `${c.action.context.entityType}:${c.action.context.entityId}`;
  524 |       const before = (await snapshot<Upg12Snapshot>(page)).entities[entityKey];
  525 | 
  526 |       await view.getByLabel("Message input").fill(fixtures.upg12.userText);
  527 |       await view.getByRole("button", { name: "Send message" }).click();
  528 |       const group = view.getByRole("group", { name: `Approval needed: ${c.reason}` });
  529 |       await expect(group).toBeVisible();
  530 |       const shownId = await group.getAttribute("data-interrupt-id");
  531 |       const paused = (await snapshot<Upg12Snapshot>(page)).conversations[caseName].conversation;
  532 | 
  533 |       if (c.decision === "edit-then-approve") await group.locator("textarea").fill(JSON.stringify(c.edited, null, 2));
  534 |       await group.getByRole("button", { name: c.decision === "deny" ? "Deny" : "Approve" }).click();
  535 |       const resumeRun = await waitForRun((item) => item.script === "upg12" && item.case === caseName && Array.isArray(item.resume) && item.completed, `upg12 ${caseName} resume run`);
  536 |       const resumeItem = view.locator(`li[data-message-id="resume-${caseName}"]`);
  537 |       await expect(resumeItem).toBeVisible();
  538 |       await expect(group).toHaveCount(0);
  539 | 
  540 |       const after = await snapshot<Upg12Snapshot>(page);
  541 |       const log = await agentLog();
  542 |       const firstRun = log.runs.find((item) => item.script === "upg12" && item.case === caseName && item.resume === null);
  543 |       const clientResumeStream = after.streams.find((item) => item.label === `upg12-${caseName}` && item.resume !== null);
  544 |       const auditRecords = after.audit.filter((item) => item.sourceComponentId === c.interruptId);
  545 |       const decision = after.interruptDecisions.find((item) => item.interruptId === c.interruptId);
  546 |       const entityAfter = after.entities[entityKey];
  547 |       const resumeText = ((await resumeItem.textContent()) ?? "").trim();
  548 |       const serverResume = resumeRun.resume ?? [];
  549 |       const evidence = {
  550 |         interruptShown: { dataInterruptId: shownId, conversationBeforeDecision: paused },
  551 |         firstRun: firstRun ?? null,
  552 |         resumePayloads: { agentReceived: serverResume, streamFactoryContext: clientResumeStream?.resume ?? null },
  553 |         clientPendingInterruptIds: clientResumeStream?.clientPendingInterruptIds ?? null,
  554 |         auditRecords,
  555 |         interruptDecision: decision ?? null,
  556 |         entityDigests: { before: entityDigest(before), after: entityDigest(entityAfter) },
  557 |         entities: { before, after: entityAfter },
  558 |         resumeRendered: resumeText,
  559 |       };
  560 |       target.evidence[caseName] = evidence;
  561 |       const label = (text: string): string => `${caseName}: ${text}`;
  562 | 
  563 |       check(target, label("the interrupt outcome shows the approval UI (EntityInterruptApproval) for that interrupt"),
  564 |         shownId === c.interruptId && paused?.runStatus === "interrupted", { shownId, runStatus: paused?.runStatus });
  565 |       check(target, label("@ag-ui/client tracked the interrupt as pending before the resume run (it parsed the outcome)"),
  566 |         Boolean(clientResumeStream?.clientPendingInterruptIds.includes(c.interruptId)), { pending: clientResumeStream?.clientPendingInterruptIds });
  567 |       check(target, label("the resume run's resume[] passed to streamFactory is what the agent received"),
  568 |         same(clientResumeStream?.resume, serverResume) && serverResume.length === 1, { client: clientResumeStream?.resume, agent: serverResume });
  569 | 
  570 |       if (caseName === "approve" || caseName === "edit") {
  571 |         const payload = caseName === "edit" ? c.edited : c.action.context;
  572 |         check(target, label("resume[] carries the approval: resolved with the approved values"),
  573 |           same(serverResume, [{ interruptId: c.interruptId, status: "resolved", payload }]), { resume: serverResume, expectedPayload: payload });
  574 |         check(target, label("the policy audit records one executed decision with those values"),
  575 |           auditRecords.length === 1 && auditRecords[0].status === "executed" && auditRecords[0].name === c.action.name && same(auditRecords[0].context, payload),
  576 |           { auditRecords });
  577 |         const data = (payload as { data: Record<string, unknown> }).data;
  578 |         check(target, label("the guarded entity now holds the approved values"),
  579 |           Object.entries(data).every(([key, value]) => same(entityAfter?.merged?.[key], value)) && entityDigest(before) !== entityDigest(entityAfter),
  580 |           { before: before?.merged, after: entityAfter?.merged });
  581 |         check(target, label("the resumed run renders"), resumeText.startsWith("resume resolved"), { resumeText });
  582 |         completed.oracle += 1;
  583 |       } else if (caseName === "deny") {
  584 |         check(target, label("deny resumes with a denial (cancelled, denied-by-user)"),
```