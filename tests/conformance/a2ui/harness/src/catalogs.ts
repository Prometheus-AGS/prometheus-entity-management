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
 * 0d2fcf3714a7a3725ed994b2861ffdd7d1f995bd (createDefaultAdapterCatalog,
 * buildExtraCatalog).
 */

import { createElement } from "react";
import { z } from "zod/v3";
import {
  createPrometheusA2uiCatalog,
  createPrometheusA2uiComponent,
  type PrometheusA2uiComponentRenderProps,
} from "@prometheus-ags/a2ui-react";
import type { ExtraCatalogEntry, StartCaseInput } from "./types.js";

type PrometheusCatalog = ReturnType<typeof createPrometheusA2uiCatalog>;

/** A function entry as the official catalog stores it (`createFunctionImplementation`'s shape). */
interface FunctionEntry {
  name: string;
  returnType: string;
  schema: unknown;
  allowedCallers?: string;
  requiresUserActivation?: boolean;
  execute?: (args: Record<string, unknown>, context: FunctionContext) => unknown;
}

interface FunctionContext {
  dataModel: { get(path: string): unknown; set(path: string, value: unknown): void };
}

/**
 * Harness-registered functions. The package allowlists only official basic
 * functions, so test functions are added to the catalog's function map after
 * construction, exactly where the official `Catalog` constructor puts them.
 * The upstream harness registers the same `incrementCounter` in its catalog.
 */
function addFunction(catalog: PrometheusCatalog, entry: FunctionEntry): void {
  (catalog.functions as unknown as Map<string, FunctionEntry>).set(entry.name, entry);
}

const incrementCounter: FunctionEntry = {
  name: "incrementCounter",
  returnType: "void",
  schema: z.object({
    path: z.string().optional(),
    targetPath: z.string().optional(),
    step: z.any().optional(),
    amount: z.any().optional(),
  }),
  execute(args, context) {
    const path = (args.path ?? args.targetPath ?? "/counter") as string;
    const delta = typeof args.step === "number" ? args.step : typeof args.amount === "number" ? args.amount : 1;
    context.dataModel.set(path, Number(context.dataModel.get(path) ?? 0) + delta);
  },
};

/**
 * The official basic catalog under the pinned catalog's id, allowlisting
 * exactly the components and functions `catalogs/basic/v1/catalog.json` names
 * (the upstream TypeScript runners likewise substitute their built-in basic
 * catalog for that file). Construction throws if the package lacks one.
 */
export function buildBasicCatalog(input: StartCaseInput["basicCatalog"]): PrometheusCatalog {
  const catalog = createPrometheusA2uiCatalog({
    protocolVersion: "1.0",
    id: input.catalogId,
    components: input.components as never,
    functions: input.functions as never,
  });
  addFunction(catalog, incrementCounter);
  return catalog;
}

const dynamicValue = z
  .union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.unknown())])
  .optional();

function customComponent(name: string, definition: NonNullable<ExtraCatalogEntry["components"]>[string]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const key of Object.keys(definition.properties ?? {})) {
    if (key !== "component") shape[key] = dynamicValue;
  }
  const render = ({ props }: PrometheusA2uiComponentRenderProps) =>
    createElement(
      "span",
      { "data-testid": `custom-${name}` },
      Object.entries(props)
        .filter(([key, value]) => !key.startsWith("set") && (typeof value === "string" || typeof value === "number"))
        .map(([, value]) => String(value))
        .join(" "),
    );
  return createPrometheusA2uiComponent({ name, schema: z.object(shape) } as never, render);
}

/**
 * A case-declared inline catalog. Components go through the package's public
 * custom-component path (`createPrometheusA2uiComponent` plus an allowlisted
 * implementation); declared functions are schema-only entries, which the
 * official processor routes to the agent as `callAgentFunction`.
 */
export function buildExtraCatalog(entry: ExtraCatalogEntry): PrometheusCatalog {
  const names = Object.keys(entry.components ?? {});
  const catalog = createPrometheusA2uiCatalog({
    protocolVersion: "1.0",
    id: entry.catalogId,
    components: names as never,
    functions: [],
    implementations: names.map((name) => customComponent(name, (entry.components ?? {})[name] ?? {})),
  });
  for (const [name, definition] of Object.entries(entry.functions ?? {})) {
    const allowedCallers = definition.allowedCallers;
    const requiresUserActivation = definition.requiresUserActivation;
    addFunction(catalog, {
      name,
      returnType: typeof definition.returnType === "string" ? definition.returnType : "any",
      schema: z.object({}).passthrough(),
      ...(typeof allowedCallers === "string" ? { allowedCallers } : {}),
      ...(typeof requiresUserActivation === "boolean" ? { requiresUserActivation } : {}),
    });
  }
  return catalog;
}
