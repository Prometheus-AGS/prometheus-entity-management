# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: agui-run-stack.spec.ts >> UPG-10 AG-UI 1.0 run stream drives EntityChat through the graph
- Location: tests/browser/agui-run-stack.spec.ts:232:5

# Error details

```
Error: [{"name":"TEXT_MESSAGE_START/CONTENT/END render the complete assistant message, no longer streaming","pass":false,"detail":{"dom":{"id":"m-1","role":"assistant","text":"Invoice inv-42 is overdue by 12 days.lookup_invoice{\"invoiceId\":\"inv-42\"}"},"graph":{"id":"m-1","role":"assistant","content":"Invoice inv-42 is overdue by 12 days.","createdAt":"2026-11-13T01:13:17.247Z","streaming":false,"conversationId":"upg10-main","toolCalls":[{"id":"tc-1","type":"function","function":{"name":"lookup_invoice","arguments":"{\"invoiceId\":\"inv-42\"}"}}]}}}]

expect(received).toBe(expected) // Object.is equality

Expected: "PASS"
Received: "FAIL"
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic [ref=e3]:
    - region "Chat view" [ref=e4]:
      - region "Entity chat" [ref=e5]:
        - list [ref=e6]:
          - listitem [ref=e7]: What is the status of invoice inv-42?
          - listitem [ref=e8]:
            - group [ref=e9]:
              - generic "Reasoning" [ref=e10]
          - listitem [ref=e11]:
            - text: Invoice inv-42 is overdue by 12 days.
            - list "Tool calls" [ref=e12]:
              - listitem [ref=e13]:
                - code [ref=e14]: lookup_invoice
                - generic [ref=e15]: "{\"invoiceId\":\"inv-42\"}"
          - listitem [ref=e16]: "{\"invoiceId\":\"inv-42\",\"status\":\"overdue\",\"daysLate\":12}"
        - form "Send a message" [ref=e17]:
          - textbox "Message input" [ref=e18]:
            - /placeholder: Type a message…
          - button "Send message" [disabled] [ref=e19]: Send
    - region "Second view of the same conversation" [ref=e20]:
      - region "Entity chat" [ref=e21]:
        - list [ref=e22]:
          - listitem [ref=e23]: What is the status of invoice inv-42?
          - listitem [ref=e24]:
            - group [ref=e25]:
              - generic "Reasoning" [ref=e26]
          - listitem [ref=e27]:
            - text: Invoice inv-42 is overdue by 12 days.
            - list "Tool calls" [ref=e28]:
              - listitem [ref=e29]:
                - code [ref=e30]: lookup_invoice
                - generic [ref=e31]: "{\"invoiceId\":\"inv-42\"}"
          - listitem [ref=e32]: "{\"invoiceId\":\"inv-42\",\"status\":\"overdue\",\"daysLate\":12}"
        - form "Send a message" [ref=e33]:
          - textbox "Message input" [ref=e34]:
            - /placeholder: Type a message…
          - button "Send message" [disabled] [ref=e35]: Send
    - region "View of a different conversation" [ref=e36]:
      - region "Entity chat" [ref=e37]:
        - list [ref=e38]:
          - listitem [ref=e39]: Control view probe
          - listitem [ref=e40]: Probe reply for the other conversation.
        - form "Send a message" [ref=e41]:
          - textbox "Message input" [ref=e42]:
            - /placeholder: Type a message…
          - button "Send message" [disabled] [ref=e43]: Send
```

# Test source

```ts
  263 |     oracle.evidence.midRun = { ...mid, agentRunId: run.runId };
  264 |     check(oracle, "RUN_STARTED: the graph records the run as running with the agent's runId, and EntityChat disables its input",
  265 |       mid.conversation?.runStatus === "running" && mid.conversation?.runId === run.runId && mid.inputDisabled,
  266 |       { runStatus: mid.conversation?.runStatus, runId: mid.conversation?.runId, agentRunId: run.runId, inputDisabled: mid.inputDisabled });
  267 |     check(oracle, "TEXT_MESSAGE_CONTENT renders while the message streams (streaming cursor shown)", mid.cursorShown);
  268 |     check(oracle, "mid-run, the second view shows the same partial messages", same(mid.chat, mid.mirror), { chat: mid.chat, mirror: mid.mirror });
  269 | 
  270 |     await release(f.midGate);
  271 |     await expect(chat.locator(`li[data-message-id="${f.toolResult.messageId}"]`)).toBeVisible();
  272 |     await expect(input).toBeEnabled();
  273 |     await expect.poll(async () => (await snapshot<{ graph: { main: ConversationSnapshot } }>(page)).graph.main.conversation?.runStatus).toBe("finished");
  274 |     await expect.poll(async () => same(await domList(mirror), await domList(chat))).toBe(true);
  275 | 
  276 |     const final = await snapshot<{ graph: { main: ConversationSnapshot; other: ConversationSnapshot }; streams: StreamSnapshot[]; mirrorFactoryCalls: number }>(page);
  277 |     const chatList = await domList(chat);
  278 |     const mirrorList = await domList(mirror);
  279 |     const otherList = await domList(other);
  280 |     const otherText = (await other.textContent()) ?? "";
  281 |     const chatText = (await chat.textContent()) ?? "";
  282 |     const agentRun = (await agentLog()).runs.find((item) => item.seq === run.seq);
  283 |     const stream = final.streams.find((item) => item.label === "main");
  284 |     const main = final.graph.main;
  285 |     const byId = new Map(chatList.map((item) => [item.id, item]));
  286 |     const reasoning = byId.get(f.reasoning.messageId);
  287 |     const text = byId.get(f.text.messageId);
  288 |     const tool = byId.get(f.toolResult.messageId);
  289 |     const assistant = message(main, f.text.messageId);
  290 |     const expectedArgs = f.toolCall.argsChunks.join("");
  291 |     oracleReached = true;
  292 | 
  293 |     oracle.evidence.graphSnapshotDigest = digest(main);
  294 |     oracle.evidence.graphSnapshot = main;
  295 |     oracle.evidence.domDigests = { chat: digest(chatList), mirror: digest(mirrorList) };
  296 |     oracle.evidence.dom = { chat: chatList, mirror: mirrorList };
  297 |     oracle.evidence.clientEventTypes = stream?.events.map((item) => item.type) ?? null;
  298 |     oracle.evidence.agentRun = agentRun ?? null;
  299 | 
  300 |     check(oracle, "the run went through @ag-ui/client without error and every scripted event type reached the store",
  301 |       Boolean(stream?.finished) && stream?.error === null && UPG10_EVENT_TYPES.every((type) => stream?.events.some((item) => item.type === type)),
  302 |       { finished: stream?.finished, error: stream?.error, missing: UPG10_EVENT_TYPES.filter((type) => !stream?.events.some((item) => item.type === type)) });
  303 |     check(oracle, "the scripted agent sent the whole run and the client kept the stream to the end",
  304 |       Boolean(agentRun?.completed) && UPG10_EVENT_TYPES.every((type) => agentRun?.sent.includes(type)), { sent: agentRun?.sent, completed: agentRun?.completed });
  305 |     check(oracle, "the user's message renders", chatList.some((item) => item.role === "user" && item.text === f.userText));
  306 |     check(oracle, "REASONING_* renders as a collapsed reasoning message with its content",
  307 |       reasoning?.role === "reasoning" && reasoning.text.includes("Reasoning") && reasoning.text.includes(f.reasoning.text)
  308 |         && message(main, f.reasoning.messageId)?.streaming === false,
  309 |       { dom: reasoning, graph: message(main, f.reasoning.messageId) });
  310 |     check(oracle, "TEXT_MESSAGE_START/CONTENT/END render the complete assistant message, no longer streaming",
  311 |       text?.role === "assistant" && text.text === `${f.text.beforeGate}${f.text.afterGate}` && assistant?.streaming === false
  312 |         && (await chat.locator(".a2ui-msg__cursor").count()) === 0,
  313 |       { dom: text, graph: assistant });
  314 |     check(oracle, "TOOL_CALL_START/ARGS/END land on the assistant message in the graph (name and full arguments)",
  315 |       same(assistant?.toolCalls, [{ id: f.toolCall.id, type: "function", function: { name: f.toolCall.name, arguments: expectedArgs } }]),
  316 |       { toolCalls: assistant?.toolCalls });
  317 |     check(oracle, "TOOL_CALL_START/ARGS/END render in EntityChat (the tool call's name is shown)",
  318 |       chatText.includes(f.toolCall.name),
  319 |       { looksFor: f.toolCall.name, note: "EntityChat's default message bubble renders message.content only (packages/a2ui-react/src/entity-chat.tsx MessageBubble)" });
  320 |     check(oracle, "TOOL_CALL_RESULT renders as a tool message with the result content",
  321 |       tool?.role === "tool" && tool.text === f.toolResult.content && message(main, f.toolResult.messageId)?.toolCallId === f.toolCall.id,
  322 |       { dom: tool, graph: message(main, f.toolResult.messageId) });
  323 |     check(oracle, "RUN_FINISHED: the graph records the run finished, the input is enabled and no typing indicator shows",
  324 |       main.conversation?.runStatus === "finished" && main.conversation?.isLoading === false && (await input.isEnabled())
  325 |         && (await chat.locator(".a2ui-msg--typing").count()) === 0,
  326 |       { conversation: main.conversation });
  327 |     check(oracle, "messages render in stream order: user, reasoning, assistant, tool result",
  328 |       same(chatList.map((item) => item.role), ["user", "reasoning", "assistant", "tool"]), { order: chatList.map((item) => `${item.role}:${item.id}`) });
  329 |     check(oracle, "the second view (same conversation id) shows exactly the same messages, read from the graph",
  330 |       same(chatList, mirrorList) && mirrorList.length === 4 && final.mirrorFactoryCalls === 0,
  331 |       { chatDigest: digest(chatList), mirrorDigest: digest(mirrorList), mirrorFactoryCalls: final.mirrorFactoryCalls });
  332 |     check(oracle, "the graph holds the conversation's messages under its list key", same(main.ids.length, 4), { ids: main.ids });
  333 | 
  334 |     // Negative control: the view on another conversation shows none of them.
  335 |     const expectedTexts = [f.userText, f.reasoning.text, `${f.text.beforeGate}${f.text.afterGate}`, f.toolResult.content, f.toolCall.name];
  336 |     control.evidence.before = { dom: otherList, domDigest: digest(otherList), graph: final.graph.other, graphDigest: digest(final.graph.other) };
  337 |     check(control, "the other conversation's view shows no messages", otherList.length === 0, { dom: otherList });
  338 |     check(control, "the other conversation's view contains none of the run's texts",
  339 |       expectedTexts.every((item) => !otherText.includes(item)), { leaked: expectedTexts.filter((item) => otherText.includes(item)) });
  340 |     check(control, "the other conversation has no messages in the graph", final.graph.other.ids.length === 0, { ids: final.graph.other.ids });
  341 | 
  342 |     // Liveness: the control view renders its own conversation's messages, so its emptiness above is meaningful.
  343 |     const otherInput = other.getByLabel("Message input");
  344 |     await otherInput.fill(f.probe.userText);
  345 |     await other.getByRole("button", { name: "Send message" }).click();
  346 |     await expect(other.locator(`li[data-message-id="${f.probe.messageId}"]`)).toContainText(f.probe.text);
  347 |     await expect(otherInput).toBeEnabled();
  348 |     const afterProbe = { chat: await domList(chat), mirror: await domList(mirror), other: await domList(other) };
  349 |     controlReached = true;
  350 |     control.evidence.afterProbe = { ...afterProbe, digests: { chat: digest(afterProbe.chat), mirror: digest(afterProbe.mirror), other: digest(afterProbe.other) } };
  351 |     check(control, "liveness: the control view renders its own conversation's run",
  352 |       afterProbe.other.some((item) => item.id === f.probe.messageId && item.text === f.probe.text), { other: afterProbe.other });
  353 |     check(control, "liveness: the probe run does not appear in either view of the main conversation",
  354 |       same(afterProbe.chat, chatList) && same(afterProbe.mirror, mirrorList), { chatDigest: digest(afterProbe.chat), mirrorDigest: digest(afterProbe.mirror) });
  355 |     check(oracle, "no uncaught page errors", pageErrors.length === 0, pageErrors);
  356 |   } catch (cause) {
  357 |     result.error = `harness error: ${harnessError(cause)}`;
  358 |   }
  359 |   settle(oracle, oracleReached);
  360 |   settle(control, controlReached && oracle.exercised);
  361 |   record(result);
  362 |   expect(result.error, result.error).toBeUndefined();
> 363 |   expect(oracle.status, JSON.stringify(oracle.checks.filter((item) => !item.pass))).toBe("PASS");
      |                                                                                     ^ Error: [{"name":"TEXT_MESSAGE_START/CONTENT/END render the complete assistant message, no longer streaming","pass":false,"detail":{"dom":{"id":"m-1","role":"assistant","text":"Invoice inv-42 is overdue by 12 days.lookup_invoice{\"invoiceId\":\"inv-42\"}"},"graph":{"id":"m-1","role":"assistant","content":"Invoice inv-42 is overdue by 12 days.","createdAt":"2026-11-13T01:13:17.247Z","streaming":false,"conversationId":"upg10-main","toolCalls":[{"id":"tc-1","type":"function","function":{"name":"lookup_invoice","arguments":"{\"invoiceId\":\"inv-42\"}"}}]}}}]
  364 |   expect(control.status, JSON.stringify(control.checks.filter((item) => !item.pass))).toBe("PASS");
  365 | });
  366 | 
  367 | // ── UPG-11 ──
  368 | 
  369 | interface Upg11Snapshot {
  370 |   supersede: { seq: number; at: number } | null;
  371 |   writes: Array<{ seq: number; bucket: string; conversationId: string; messageId: string; at: number }>;
  372 |   writesBeforeSupersede: Record<string, number> | null;
  373 |   writesAfterSupersede: Record<string, number> | null;
  374 |   streams: StreamSnapshot[];
  375 |   graph: { superseded: ConversationSnapshot; control: ConversationSnapshot };
  376 | }
  377 | 
  378 | test("UPG-11 Cancellation stops superseded streams", async ({ page }) => {
  379 |   const f = fixtures.upg11;
  380 |   const oracle = part();
  381 |   const control = part();
  382 |   const pageErrors: string[] = [];
  383 |   const result: ScenarioResult = { kind: "scenario", id: "UPG-11", name: "Cancellation stops superseded streams", oracle, negativeControl: control, pageErrors };
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
```