/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Adapted for @prometheus-ags/a2ui-react from the A2UI project's
 * typescript/renderers/react/tests/adapter_harness.tsx at commit
 * 0d2fcf3714a7a3725ed994b2861ffdd7d1f995bd (KNOWN_KEYS,
 * assertKnownAdapterCase, assertKnownAccessibilityCase). Assertions this
 * harness cannot observe are recorded as failures and may only be excused by
 * an entry in tests/conformance/a2ui/divergences.json.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import type { AdapterStep, ExtraCatalogEntry, StartCaseInput } from "../harness/src/types";

/** Vendored suite root; repository-relative case paths resolve against it (the guide's REPO_ROOT). */
export const UPSTREAM_ROOT = resolve(process.cwd(), "tests/conformance/a2ui/upstream");
export const ADAPTER_SUITE = "core/adapter_conformance.yaml";
export const ACCESSIBILITY_SUITE = "core/accessibility.yaml";

export function repoPath(relative: string): string {
  return resolve(UPSTREAM_ROOT, relative);
}

export function conformancePath(relative: string): string {
  return resolve(UPSTREAM_ROOT, "conformance", relative);
}

type Case = Record<string, unknown> & { name: string; action: string };

/** YAML 1.2 (the `yaml` package's default core schema), converted to plain JSON values. */
export function loadSuite(suite: string): Case[] {
  const cases = JSON.parse(JSON.stringify(parse(readFileSync(conformancePath(suite), "utf8")))) as unknown;
  if (!Array.isArray(cases) || cases.length === 0) throw new Error(`${suite}: no cases loaded`);
  return cases as Case[];
}

const set = (...keys: string[]): ReadonlySet<string> => new Set(keys);

export const KNOWN_KEYS = {
  adapterCase: set("name", "description", "features", "action", "protocolVersion", "strictMode", "catalogPaths", "catalogs", "steps"),
  adapterCatalog: set("catalogId", "protocolVersion", "components", "functions"),
  adapterStep: set(
    "description", "op", "messages", "targetNode", "inputValue", "userActivation", "expectViewTree",
    "expectAccessibilityTree", "expectDataModel", "expectActions", "expectErrors", "expectOutbound",
    "expectSameViewIdentity", "expectNewViewIdentity", "expectDisposedNodes", "expectSurfaceRemoved",
    "expectThemeAbsent", "expectActiveSubscriptions",
  ),
  adapterOps: set("process_messages", "user_input", "user_gesture", "programmatic_invoke", "unmount_surface"),
  viewNode: set(
    "id", "type", "state", "occupiesLayout", "text", "value", "url", "name", "axis", "badgeText",
    "isValid", "validationErrors", "validationResults", "hints", "children",
  ),
  validationResult: set("valid", "code", "message", "severity"),
  expectedAction: set("name", "surfaceId", "sourceComponentId", "context"),
  expectedError: set("code", "surfaceId", "message"),
  accessibilityCase: set("name", "description", "features", "action", "protocolVersion", "catalogPath", "surface", "messages", "assertions", "steps"),
  accessibilityStep: set("description", "messages", "assertions"),
  accessibilityAssertions: set("accessibilityTree", "axeCore"),
  accessibilityNode: set("label", "description", "live", "hidden", "role", "checked"),
} as const;


function unknownKeys(value: unknown, allowed: ReadonlySet<string>, where: string, out: string[]): void {
  if (value === undefined || value === null) return;
  if (typeof value !== "object" || Array.isArray(value)) {
    out.push(`${where}: expected object`);
    return;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) out.push(`Unknown key '${key}' in ${where}`);
  }
}

function viewNodeKeys(node: unknown, where: string, out: string[]): void {
  if (!node || typeof node !== "object") return;
  unknownKeys(node, KNOWN_KEYS.viewNode, where, out);
  const record = node as Record<string, unknown>;
  (Array.isArray(record.validationResults) ? record.validationResults : []).forEach((item, index) =>
    unknownKeys(item, KNOWN_KEYS.validationResult, `${where}.validationResults[${index}]`, out));
  (Array.isArray(record.children) ? record.children : []).forEach((child, index) =>
    viewNodeKeys(child, `${where}.children[${index}]`, out));
}

/** The strict dispatch rule: every unknown action, op or key is reported, never ignored. */
export function adapterCaseKeyErrors(testCase: Case): string[] {
  const out: string[] = [];
  const where = `${ADAPTER_SUITE}#${testCase.name}`;
  unknownKeys(testCase, KNOWN_KEYS.adapterCase, where, out);
  if (testCase.action !== "render_surface") out.push(`Unknown action '${testCase.action}' in ${where}`);
  ((testCase.catalogs as unknown[]) ?? []).forEach((entry, index) =>
    unknownKeys(entry, KNOWN_KEYS.adapterCatalog, `${where}.catalogs[${index}]`, out));
  ((testCase.steps as AdapterStep[]) ?? []).forEach((step, index) => {
    const at = `${where}.steps[${index}]`;
    unknownKeys(step, KNOWN_KEYS.adapterStep, at, out);
    if (step.op !== undefined && !KNOWN_KEYS.adapterOps.has(step.op)) out.push(`Unknown op '${step.op}' in ${at}`);
    viewNodeKeys(step.expectViewTree, `${at}.expectViewTree`, out);
    for (const [id, node] of Object.entries(step.expectAccessibilityTree ?? {})) {
      unknownKeys(node, KNOWN_KEYS.accessibilityNode, `${at}.expectAccessibilityTree.${id}`, out);
    }
    (step.expectActions ?? []).forEach((item, i) => unknownKeys(item, KNOWN_KEYS.expectedAction, `${at}.expectActions[${i}]`, out));
    (step.expectErrors ?? []).forEach((item, i) => unknownKeys(item, KNOWN_KEYS.expectedError, `${at}.expectErrors[${i}]`, out));
  });
  return out;
}

export interface AccessibilityStep {
  messages: unknown[];
  assertions: { accessibilityTree?: Record<string, Record<string, unknown>>; axeCore?: string[] };
}

export function accessibilityCaseKeyErrors(testCase: Case): string[] {
  const out: string[] = [];
  const where = `${ACCESSIBILITY_SUITE}#${testCase.name}`;
  unknownKeys(testCase, KNOWN_KEYS.accessibilityCase, where, out);
  if (testCase.action !== "accessibility_check") out.push(`Unknown action '${testCase.action}' in ${where}`);
  const assertionKeys = (assertions: unknown, at: string): void => {
    unknownKeys(assertions, KNOWN_KEYS.accessibilityAssertions, at, out);
    const tree = (assertions as AccessibilityStep["assertions"] | undefined)?.accessibilityTree ?? {};
    for (const [id, node] of Object.entries(tree)) unknownKeys(node, KNOWN_KEYS.accessibilityNode, `${at}.accessibilityTree.${id}`, out);
  };
  assertionKeys(testCase.assertions, `${where}.assertions`);
  ((testCase.steps as unknown[]) ?? []).forEach((step, index) => {
    unknownKeys(step, KNOWN_KEYS.accessibilityStep, `${where}.steps[${index}]`, out);
    assertionKeys((step as AccessibilityStep).assertions, `${where}.steps[${index}].assertions`);
  });
  return out;
}

/**
 * Steps of an accessibility case. DOM adapters mount from `messages`/`steps`;
 * the inline `surface` map serves headless (non-DOM) inspectors only.
 */
export function accessibilitySteps(testCase: Case): AccessibilityStep[] {
  return (testCase.steps as AccessibilityStep[] | undefined) ?? [
    { messages: (testCase.messages as unknown[]) ?? [], assertions: (testCase.assertions as AccessibilityStep["assertions"]) ?? {} },
  ];
}

function walk(value: unknown, visit: (record: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
  else if (value && typeof value === "object") {
    visit(value as Record<string, unknown>);
    Object.values(value).forEach((item) => walk(item, visit));
  }
}

function messagesOf(testCase: Case): unknown[] {
  const steps = (testCase.steps as Array<{ messages?: unknown[] }> | undefined) ?? [];
  return [...((testCase.messages as unknown[]) ?? []), ...steps.flatMap((step) => step.messages ?? [])];
}

interface PinnedCatalog {
  catalogId: string;
  components: Record<string, unknown>;
  functions: Record<string, unknown>;
}

function pinnedCatalog(relative: string): StartCaseInput["basicCatalog"] {
  const catalog = JSON.parse(readFileSync(repoPath(relative), "utf8")) as PinnedCatalog;
  return { catalogId: catalog.catalogId, components: Object.keys(catalog.components), functions: Object.keys(catalog.functions) };
}

/** What the page needs to set a case up, derived from the case alone. */
export function startCaseInput(testCase: Case): StartCaseInput {
  const paths = (testCase.catalogPaths as string[] | undefined) ?? (testCase.catalogPath ? [testCase.catalogPath as string] : []);
  if (paths.length !== 1 || paths[0] !== "catalogs/basic/v1/catalog.json") {
    throw new Error(`${testCase.name}: unsupported catalog paths ${JSON.stringify(paths)}`);
  }
  const messages = messagesOf(testCase);
  const surfaceIds = new Set<string>();
  const actionNames = new Set<string>();
  walk(messages, (record) => {
    const created = record.createSurface as { surfaceId?: unknown } | undefined;
    if (created && typeof created.surfaceId === "string") surfaceIds.add(created.surfaceId);
    const event = record.event as { name?: unknown } | undefined;
    if (event && typeof event.name === "string") actionNames.add(event.name);
  });
  if (surfaceIds.size !== 1) throw new Error(`${testCase.name}: expected one surface id, found ${[...surfaceIds].join(", ")}`);
  return {
    name: testCase.name,
    protocolVersion: String(testCase.protocolVersion ?? "1.0"),
    surfaceId: [...surfaceIds][0] as string,
    basicCatalog: pinnedCatalog(paths[0]),
    catalogs: (testCase.catalogs as ExtraCatalogEntry[] | undefined) ?? [],
    actionNames: [...actionNames],
  };
}
