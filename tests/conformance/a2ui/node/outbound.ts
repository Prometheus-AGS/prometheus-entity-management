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
 * typescript/renderers/react/tests/adapter_harness.tsx (isMatchAny,
 * assertMatchesExpectedOutbound) and conformance/tests/test_outbound_envelopes.py
 * (the catalog.json stub) at commit 0d2fcf3714a7a3725ed994b2861ffdd7d1f995bd.
 */

import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { repoPath } from "./suite";

type Envelope = Record<string, unknown>;

/**
 * `common_types.json` references `catalog.json#/$defs/anyFunction`, which a
 * real catalog supplies. As upstream's static outbound check does, a stub
 * catalog accepts any function object there.
 */
const CATALOG_STUB = {
  $id: "https://a2ui.org/specification/v1_0/catalog.json",
  $defs: { anyFunction: { type: "object", additionalProperties: true } },
};

/** RFC 3339 date-time (the schema's `format: date-time`); ajv-formats is not installed. */
const DATE_TIME = /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;

function loadJson(relative: string): object {
  return JSON.parse(readFileSync(repoPath(relative), "utf8")) as object;
}

export function createOutboundValidator(): (envelope: Envelope) => string[] {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  ajv.addFormat("date-time", (value: string) => DATE_TIME.test(value) && !Number.isNaN(Date.parse(value)));
  ajv.addSchema(loadJson("specification/v1_0/json/common_types.json"));
  ajv.addSchema(CATALOG_STUB);
  const validate = ajv.compile(loadJson("specification/v1_0/json/renderer_to_agent.json"));
  return (envelope) =>
    validate(envelope)
      ? []
      : (validate.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "invalid"}`);
}

function isMatchAny(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    (value as Record<string, unknown>).$match === "any"
  );
}

/** Deep equality where `{"$match": "any"}` accepts any defined, non-null value. */
export function outboundMismatches(actual: unknown, expected: unknown, where: string, out: string[] = []): string[] {
  if (isMatchAny(expected)) {
    if (actual === undefined || actual === null) out.push(`${where}: expected a defined non-null value`);
    return out;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      out.push(`${where}: expected array of ${expected.length}, got ${JSON.stringify(actual)}`);
      return out;
    }
    expected.forEach((item, index) => outboundMismatches(actual[index], item, `${where}[${index}]`, out));
    return out;
  }
  if (typeof expected === "object" && expected !== null) {
    if (typeof actual !== "object" || actual === null || Array.isArray(actual)) {
      out.push(`${where}: expected object, got ${JSON.stringify(actual)}`);
      return out;
    }
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      out.push(`${where}: keys ${JSON.stringify(actualKeys)} != expected ${JSON.stringify(expectedKeys)}`);
    }
    for (const key of expectedKeys) {
      outboundMismatches((actual as Envelope)[key], (expected as Envelope)[key], `${where}.${key}`, out);
    }
    return out;
  }
  if (actual !== expected) out.push(`${where}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  return out;
}

/** Schema-validate every captured envelope, then match the step's `expectOutbound` when present. */
export function checkOutbound(
  validate: (envelope: Envelope) => string[],
  captured: Envelope[],
  expected: Envelope[] | undefined,
): string[] {
  const failures: string[] = [];
  captured.forEach((envelope, index) => {
    for (const problem of validate(envelope)) {
      failures.push(`outbound[${index}] fails renderer_to_agent.json: ${problem} (${JSON.stringify(envelope)})`);
    }
  });
  if (expected === undefined) return failures;
  if (captured.length !== expected.length) {
    failures.push(`expectOutbound length: expected ${expected.length}, got ${captured.length} (${JSON.stringify(captured)})`);
    return failures;
  }
  expected.forEach((item, index) => failures.push(...outboundMismatches(captured[index], item, `expectOutbound[${index}]`)));
  return failures;
}
