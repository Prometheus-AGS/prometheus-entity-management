# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a2ui-examples.spec.ts >> agentic-a2ui-app: streams the task surface and executes Mark task done
- Location: tests/browser/a2ui-examples.spec.ts:125:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByTestId('agent-lifecycle')
Expected: "completed"
Received: "validation-failed"
Timeout:  20000ms

Call log:
  - Expect "toHaveText" with timeout 20000ms
  - waiting for getByTestId('agent-lifecycle')
    3 × locator resolved to <span data-testid="agent-lifecycle">…</span>
      - unexpected value "working"
    40 × locator resolved to <span data-testid="agent-lifecycle">…</span>
       - unexpected value "validation-failed"

```

```yaml
- text: validation-failed
```

# Test source

```ts
  35  |   surface: Record<string, unknown> | null;
  36  |   action: Record<string, unknown> | null;
  37  |   records: CaptureRecord[];
  38  |   tap: { installed: boolean; sseFrames: number; errors: string[] } | null;
  39  |   screenshots: string[];
  40  |   error: string | null;
  41  | }
  42  | 
  43  | interface ExampleEntry {
  44  |   id: string;
  45  |   port: number;
  46  | }
  47  | 
  48  | const artifactsDirectory = resolve(
  49  |   process.env.A2UI_EXAMPLES_ARTIFACTS ?? resolve(tmpdir(), "a2ui-examples-artifacts"),
  50  | );
  51  | const only = (process.env.A2UI_EXAMPLES_ONLY ?? "")
  52  |   .split(",")
  53  |   .map((id) => id.trim())
  54  |   .filter((id) => id.length > 0);
  55  | 
  56  | function example(id: string): ExampleEntry {
  57  |   const entry = (A2UI_EXAMPLES as readonly ExampleEntry[]).find((candidate) => candidate.id === id);
  58  |   if (!entry) throw new Error(`Unknown example ${id}.`);
  59  |   return entry;
  60  | }
  61  | 
  62  | function baseUrl(id: string): string {
  63  |   return `http://127.0.0.1:${example(id).port}`;
  64  | }
  65  | 
  66  | function isSelected(id: string): boolean {
  67  |   return only.length === 0 || only.includes(id);
  68  | }
  69  | 
  70  | async function screenshot(page: Page, capture: ExampleCapture, name: string): Promise<void> {
  71  |   const fileName = `${capture.exampleId}-${name}.png`;
  72  |   await page.screenshot({ path: resolve(artifactsDirectory, fileName), fullPage: true });
  73  |   capture.screenshots.push(fileName);
  74  | }
  75  | 
  76  | function writeCapture(capture: ExampleCapture): void {
  77  |   mkdirSync(artifactsDirectory, { recursive: true });
  78  |   writeFileSync(
  79  |     resolve(artifactsDirectory, `${capture.exampleId}.captures.json`),
  80  |     `${JSON.stringify(capture, null, 2)}\n`,
  81  |   );
  82  | }
  83  | 
  84  | /** Drive one example; the capture file is written whether the flow passes or not. */
  85  | async function withCapture(
  86  |   page: Page,
  87  |   id: string,
  88  |   flow: (capture: ExampleCapture) => Promise<void>,
  89  | ): Promise<void> {
  90  |   const capture: ExampleCapture = {
  91  |     exampleId: id,
  92  |     url: baseUrl(id),
  93  |     surface: null,
  94  |     action: null,
  95  |     records: [],
  96  |     tap: null,
  97  |     screenshots: [],
  98  |     error: null,
  99  |   };
  100 |   await page.addInitScript(installA2uiTap, [...A2UI_MESSAGE_KEYS]);
  101 |   try {
  102 |     await flow(capture);
  103 |   } catch (error) {
  104 |     capture.error = error instanceof Error ? error.message : String(error);
  105 |     throw error;
  106 |   } finally {
  107 |     if (!page.isClosed()) {
  108 |       try {
  109 |         const tap = await readA2uiTap(page);
  110 |         capture.tap = { installed: tap.installed, sseFrames: tap.sseFrames, errors: tap.errors };
  111 |         for (const record of tap.records as Array<{ source: string; text: string }>) {
  112 |           capture.records.push({ source: record.source, payload: JSON.parse(record.text) });
  113 |         }
  114 |       } catch (error) {
  115 |         capture.error ??= `tap read failed: ${error instanceof Error ? error.message : String(error)}`;
  116 |       }
  117 |     }
  118 |     writeCapture(capture);
  119 |   }
  120 | }
  121 | 
  122 | test.describe.configure({ mode: "serial" });
  123 | test.beforeAll(() => mkdirSync(artifactsDirectory, { recursive: true }));
  124 | 
  125 | test("agentic-a2ui-app: streams the task surface and executes Mark task done", async ({ page }) => {
  126 |   test.skip(!isSelected("agentic-a2ui-app"), "example build did not succeed");
  127 |   await withCapture(page, "agentic-a2ui-app", async (capture) => {
  128 |     await page.goto(`${capture.url}/`);
  129 |     await expect(
  130 |       page.getByRole("heading", { name: "Agentic UI with an application-owned safety boundary." }),
  131 |     ).toBeVisible();
  132 |     await expect(page.getByTestId("agent-mode")).toHaveText("deterministic");
  133 | 
  134 |     await page.getByRole("button", { name: "Stream task surface" }).click();
> 135 |     await expect(page.getByTestId("agent-lifecycle")).toHaveText("completed");
      |                                                       ^ Error: expect(locator).toHaveText(expected) failed
  136 |     await expect(page.getByTestId("artifact-count")).toHaveText("1");
  137 |     const surface = page.getByTestId("a2ui-surface-stage");
  138 |     const markDone = surface.getByRole("button", { name: "Mark task done" });
  139 |     await expect(markDone).toBeVisible();
  140 |     capture.surface = { rendered: true, lifecycle: "completed", artifacts: 1, button: "Mark task done" };
  141 |     await screenshot(page, capture, "surface");
  142 | 
  143 |     await markDone.click();
  144 |     await expect(page.getByTestId("detail-status")).toHaveText("done");
  145 |     await expect(page.getByTestId("decision-task.update")).toContainText("executed");
  146 |     capture.action = { name: "task.update", decision: "executed", detailStatus: "done" };
  147 |     await screenshot(page, capture, "action");
  148 |   });
  149 | });
  150 | 
  151 | test("agentic-a2ui: renders the task board surface and executes Mark done", async ({ page }) => {
  152 |   test.skip(!isSelected("agentic-a2ui"), "example build did not succeed");
  153 |   await withCapture(page, "agentic-a2ui", async (capture) => {
  154 |     await page.goto(`${capture.url}/`);
  155 |     await expect(page.getByRole("heading", { name: "Agentic A2UI console" })).toBeVisible();
  156 |     await expect(page.getByTestId("surface-fallback")).toBeVisible();
  157 | 
  158 |     await page.getByTestId("run-surface").click();
  159 |     const panel = page.getByTestId("a2ui-panel");
  160 |     const markDone = panel.getByRole("button", { name: "Mark done" });
  161 |     await expect(markDone).toBeVisible();
  162 |     const detail = page.getByTestId("task-detail").locator("p").first();
  163 |     const detailBefore = await detail.innerText();
  164 |     capture.surface = { rendered: true, surfaceId: "surface-task-sync", detailBefore };
  165 |     await screenshot(page, capture, "surface");
  166 | 
  167 |     await markDone.click();
  168 |     await expect(detail).toContainText("— done");
  169 |     await expect(page.getByTestId("policy-log")).toContainText(
  170 |       /prometheus\.entity\.upsert — allowed/,
  171 |     );
  172 |     capture.action = {
  173 |       name: "prometheus.entity.upsert",
  174 |       decision: "allowed",
  175 |       detailAfter: await detail.innerText(),
  176 |     };
  177 |     await screenshot(page, capture, "action");
  178 |   });
  179 | });
  180 | 
  181 | interface SseTap {
  182 |   frames: unknown[];
  183 |   stop(): Promise<unknown[]>;
  184 | }
  185 | 
  186 | /** A second subscriber on the producer's SSE stream: the activity stream as the producer sent it. */
  187 | async function openSseTap(url: string): Promise<SseTap> {
  188 |   const controller = new AbortController();
  189 |   const response = await fetch(url, {
  190 |     signal: controller.signal,
  191 |     headers: { accept: "text/event-stream" },
  192 |   });
  193 |   if (!response.ok || !response.body) {
  194 |     throw new Error(`SSE tap could not subscribe: HTTP ${response.status}.`);
  195 |   }
  196 |   const frames: unknown[] = [];
  197 |   const reader = response.body.getReader();
  198 |   const decoder = new TextDecoder();
  199 |   let failure: unknown = null;
  200 |   const reading = (async () => {
  201 |     let buffer = "";
  202 |     try {
  203 |       for (;;) {
  204 |         const { done, value } = await reader.read();
  205 |         if (done) break;
  206 |         buffer += decoder.decode(value, { stream: true });
  207 |         let boundary = buffer.indexOf("\n\n");
  208 |         while (boundary >= 0) {
  209 |           const frame = buffer.slice(0, boundary);
  210 |           buffer = buffer.slice(boundary + 2);
  211 |           const data = frame
  212 |             .split("\n")
  213 |             .filter((line) => line.startsWith("data:"))
  214 |             .map((line) => line.slice(5).trimStart())
  215 |             .join("\n");
  216 |           if (data) frames.push(JSON.parse(data));
  217 |           boundary = buffer.indexOf("\n\n");
  218 |         }
  219 |       }
  220 |     } catch (error) {
  221 |       if (!controller.signal.aborted) failure = error;
  222 |     }
  223 |   })();
  224 |   return {
  225 |     frames,
  226 |     async stop() {
  227 |       controller.abort();
  228 |       await reading;
  229 |       if (failure) throw failure instanceof Error ? failure : new Error(String(failure));
  230 |       return frames;
  231 |     },
  232 |   };
  233 | }
  234 | 
  235 | /** The lab surface: a producer-owned note and one action the lab policy executes. */
```