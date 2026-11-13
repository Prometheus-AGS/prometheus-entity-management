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
 * 0d2fcf3714a7a3725ed994b2861ffdd7d1f995bd (case and step shapes).
 */

/** Case and step shapes shared by the browser page and the Playwright spec. */

export interface ExpectedAccessibilityNode {
  label?: string;
  description?: string;
  live?: string;
  hidden?: boolean;
  role?: string;
  checked?: boolean;
}

export interface ExpectedViewNode {
  id?: string;
  type?: string;
  state?: string;
  occupiesLayout?: boolean;
  isValid?: boolean;
  validationErrors?: string[];
  validationResults?: Array<Record<string, unknown>>;
  hints?: string[];
  children?: ExpectedViewNode[];
  [key: string]: unknown;
}

export interface ExpectedActionEvent {
  name: string;
  surfaceId?: string;
  sourceComponentId?: string;
  context?: Record<string, unknown>;
}

export interface ExpectedErrorEntry {
  code?: string;
  surfaceId?: string;
  message?: string;
}

export interface ExtraCatalogEntry {
  catalogId: string;
  protocolVersion?: string;
  components?: Record<string, { properties?: Record<string, { type?: string }> }>;
  functions?: Record<string, Record<string, unknown>>;
}

export type AdapterOp =
  | "process_messages"
  | "user_input"
  | "user_gesture"
  | "programmatic_invoke"
  | "unmount_surface";

export interface AdapterStep {
  description?: string;
  op?: AdapterOp;
  messages?: unknown[];
  targetNode?: string;
  inputValue?: unknown;
  userActivation?: boolean;
  expectViewTree?: ExpectedViewNode;
  expectAccessibilityTree?: Record<string, ExpectedAccessibilityNode>;
  expectDataModel?: Record<string, unknown>;
  expectActions?: ExpectedActionEvent[];
  expectErrors?: ExpectedErrorEntry[];
  expectOutbound?: Array<Record<string, unknown>>;
  expectSameViewIdentity?: string[];
  expectNewViewIdentity?: string[];
  expectDisposedNodes?: string[];
  expectSurfaceRemoved?: boolean;
  expectThemeAbsent?: boolean;
  expectActiveSubscriptions?: number;
}

/** What the spec hands the page to set a case up. */
export interface StartCaseInput {
  name: string;
  protocolVersion: string;
  surfaceId: string;
  /** The pinned basic catalog's id and entry names (`catalogs/basic/v1/catalog.json`). */
  basicCatalog: { catalogId: string; components: string[]; functions: string[] };
  catalogs: ExtraCatalogEntry[];
  /** Event action names the case's messages declare; the harness policy allows exactly these. */
  actionNames: string[];
}

/** A trusted browser action the spec performs with Playwright between beginStep and finishStep. */
export interface Instruction {
  kind: "click" | "fill" | "check" | "uncheck";
  selector: string;
  value?: string;
  description: string;
}

export interface BeginStepResult {
  instructions: Instruction[];
  failures: string[];
}

export interface StepResult {
  failures: string[];
  /** Assertion keys present on the step that this harness cannot observe. */
  unsupported: string[];
  /** Renderer-to-agent envelopes captured from `onRendererMessage` during the step. */
  outbound: Array<Record<string, unknown>>;
}

export interface ConformanceApi {
  startCase(input: StartCaseInput): Promise<void>;
  beginStep(step: AdapterStep): Promise<BeginStepResult>;
  settle(): Promise<void>;
  finishStep(step: AdapterStep): Promise<StepResult>;
}

declare global {
  interface Window {
    __a2uiConformance: ConformanceApi;
    __a2uiConformanceOpenedUrls: string[];
  }
}
