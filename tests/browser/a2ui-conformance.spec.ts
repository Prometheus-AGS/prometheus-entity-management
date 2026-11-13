import AxeBuilder from "@axe-core/playwright";
import { test, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AdapterStep, BeginStepResult, Instruction, StepResult } from "../conformance/a2ui/harness/src/types";
import { checkOutbound, createOutboundValidator } from "../conformance/a2ui/node/outbound";
import {
  ACCESSIBILITY_SUITE,
  ADAPTER_SUITE,
  accessibilityCaseKeyErrors,
  accessibilitySteps,
  adapterCaseKeyErrors,
  loadSuite,
  startCaseInput,
} from "../conformance/a2ui/node/suite";

/*
 * Drives each pinned upstream case through the conformance page. Per-case
 * results are appended to A2UI_CONFORMANCE_RESULTS (JSON Lines) as soon as a
 * case finishes, because Playwright restarts the worker after a failed test.
 * With A2UI_CONFORMANCE_CASES_FILE set (the negative control), only the cases
 * in that file run and a FAIL is recorded, not asserted. Failures carry a
 * `steps[<i>] ` prefix; scripts/verify-a2ui-conformance.mjs decides whether a
 * FAIL is excused by tests/conformance/a2ui/divergences.json.
 */

type Case = ReturnType<typeof loadSuite>[number];
type Status = "PASS" | "FAIL";

interface CaseResult {
  kind: "case";
  suite: string;
  name: string;
  status: Status;
  reason?: string;
  failures: string[];
  notes: string[];
  steps: Array<{ index: number; op: string; failures: string[]; outbound: unknown[] }>;
}

const resultsPath = process.env.A2UI_CONFORMANCE_RESULTS;
if (!resultsPath) throw new Error("A2UI_CONFORMANCE_RESULTS must name the results file.");
const casesFile = process.env.A2UI_CONFORMANCE_CASES_FILE;
const validateOutbound = createOutboundValidator();

function record(entry: object): void {
  mkdirSync(dirname(resultsPath as string), { recursive: true });
  appendFileSync(resultsPath as string, `${JSON.stringify(entry)}\n`);
}

function plannedCases(): Array<{ suite: string; testCase: Case }> {
  if (casesFile) {
    const override = JSON.parse(readFileSync(casesFile, "utf8")) as { suite: string; cases: Case[] };
    return override.cases.map((testCase) => ({ suite: override.suite, testCase }));
  }
  return [
    ...loadSuite(ADAPTER_SUITE).map((testCase) => ({ suite: ADAPTER_SUITE, testCase })),
    ...loadSuite(ACCESSIBILITY_SUITE).map((testCase) => ({ suite: ACCESSIBILITY_SUITE, testCase })),
  ];
}

async function perform(page: Page, instruction: Instruction): Promise<void> {
  const target = page.locator(instruction.selector);
  const options = { timeout: 5_000 };
  if (instruction.kind === "click") await target.click(options);
  else if (instruction.kind === "fill") await target.fill(instruction.value ?? "", options);
  else if (instruction.kind === "check") await target.check(options);
  else await target.uncheck(options);
}

async function runAxe(page: Page, rules: string[]): Promise<string[]> {
  const result = await new AxeBuilder({ page }).include("#a2ui-conformance-root").withRules(rules).analyze();
  const failures: string[] = [];
  for (const rule of rules) {
    const violation = result.violations.find((item) => item.id === rule);
    if (violation) {
      failures.push(`axeCore ${rule}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
    } else if (result.incomplete.some((item) => item.id === rule)) {
      failures.push(`axeCore ${rule}: axe could not decide (incomplete)`);
    } else if (![...result.passes, ...result.inapplicable].some((item) => item.id === rule)) {
      failures.push(`axeCore ${rule}: rule did not run`);
    }
  }
  return failures;
}

async function runStep(
  page: Page,
  step: AdapterStep,
  index: number,
  axeRules: string[] | undefined,
  result: CaseResult,
): Promise<void> {
  const failures: string[] = [];
  const begin = await page.evaluate((input) => window.__a2uiConformance.beginStep(input), step) as BeginStepResult;
  failures.push(...begin.failures);
  for (const instruction of begin.instructions) {
    try {
      await perform(page, instruction);
    } catch (cause) {
      failures.push(`${instruction.description}: ${cause instanceof Error ? cause.message.split("\n")[0] : String(cause)}`);
    }
    await page.evaluate(() => window.__a2uiConformance.settle());
  }
  const finish = await page.evaluate((input) => window.__a2uiConformance.finishStep(input), step) as StepResult;
  failures.push(...finish.failures);
  failures.push(...checkOutbound(validateOutbound, finish.outbound, step.expectOutbound));
  if (axeRules && axeRules.length > 0) failures.push(...await runAxe(page, axeRules));
  for (const key of finish.unsupported) failures.push(`harness cannot observe ${key}`);
  result.steps.push({ index, op: step.op ?? "process_messages", failures, outbound: finish.outbound });
  result.failures.push(...failures.map((failure) => `steps[${index}] ${failure}`));
}

async function runCase(page: Page, suite: string, testCase: Case): Promise<CaseResult> {
  const result: CaseResult = { kind: "case", suite, name: testCase.name, status: "PASS", failures: [], notes: [], steps: [] };
  const isAdapter = suite === ADAPTER_SUITE;
  const keyErrors = isAdapter ? adapterCaseKeyErrors(testCase) : accessibilityCaseKeyErrors(testCase);
  if (keyErrors.length > 0) return { ...result, status: "FAIL", reason: keyErrors.join("; "), failures: keyErrors };

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.a2uiConformanceReady === "true");
  await page.evaluate((input) => window.__a2uiConformance.startCase(input), startCaseInput(testCase));

  if (isAdapter) {
    const steps = (testCase.steps as AdapterStep[]) ?? [];
    for (const [index, step] of steps.entries()) await runStep(page, step, index, undefined, result);
  } else {
    for (const [index, step] of accessibilitySteps(testCase).entries()) {
      const adapterStep: AdapterStep = {
        op: "process_messages",
        messages: step.messages,
        ...(step.assertions.accessibilityTree ? { expectAccessibilityTree: step.assertions.accessibilityTree } : {}),
      };
      await runStep(page, adapterStep, index, step.assertions.axeCore, result);
    }
  }
  result.failures.push(...pageErrors.map((message) => `uncaught page error: ${message}`));
  if (testCase.strictMode !== undefined) {
    result.notes.push(
      `case sets strictMode: ${String(testCase.strictMode)}, which the package cannot apply (CreatePrometheusA2uiRuntimeOptions has no validation option); the case ran with the package defaults`,
    );
  }
  return result.failures.length > 0 ? { ...result, status: "FAIL", reason: result.failures.slice(0, 6).join(" | ") } : result;
}

// Not serial mode: a failed case must not skip the cases after it. One worker
// and fullyParallel: false keep file order.
for (const { suite, testCase } of plannedCases()) {
  test(`${suite}#${testCase.name}`, async ({ page }) => {
    let result: CaseResult;
    try {
      result = await runCase(page, suite, testCase);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.split("\n")[0] ?? cause.message : String(cause);
      result = { kind: "case", suite, name: testCase.name, status: "FAIL", reason: `harness error: ${message}`, failures: [`harness error: ${message}`], notes: [], steps: [] };
    }
    // Record only: scripts/verify-a2ui-conformance.mjs judges each case against the
    // divergence list, and treats any nonzero Playwright exit as a runner failure.
    record(result);
  });
}
