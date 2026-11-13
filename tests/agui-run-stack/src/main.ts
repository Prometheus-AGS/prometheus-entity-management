/**
 * Entry of the UPG-10/11/12 page. `?scenario=upg10|upg11|upg12&agent=<url>`
 * picks the scenario and the scripted agent; each scenario gets a fresh,
 * isolated graph (`createGraphStore`) passed to the chat components through
 * their `graphStore` option. The spec drives the DOM and reads
 * `window.__aguiRunStack.snapshot()`.
 */
import { createRoot } from "react-dom/client";
import { createGraphStore, type GraphStore } from "@prometheus-ags/entity-graph-core";
import type { ReactElement } from "react";
import { setupUpg10 } from "./upg10.js";
import { setupUpg11 } from "./upg11.js";
import { setupUpg12 } from "./upg12.js";

declare global {
  interface Window {
    __aguiRunStack: {
      scenario: string;
      snapshot(): Record<string, unknown>;
      dispose(): void;
    };
  }
}

const params = new URLSearchParams(window.location.search);
const scenario = params.get("scenario") ?? "";
const agentBase = params.get("agent") ?? "";
const container = document.getElementById("agui-run-stack-root");

function fail(message: string): never {
  document.documentElement.dataset.aguiRunStackError = message;
  throw new Error(message);
}

if (!container) fail("missing #agui-run-stack-root");
if (!/^https?:\/\//.test(agentBase)) fail("the agent query parameter must be the scripted agent's http URL");

const graph = createGraphStore();
interface ScenarioHandle {
  element: ReactElement;
  snapshot(): Record<string, unknown>;
  dispose?(): void;
}

const setups: Record<string, (graph: GraphStore, agentBase: string) => ScenarioHandle> = {
  upg10: setupUpg10,
  upg11: setupUpg11,
  upg12: setupUpg12,
};
const setup = Object.hasOwn(setups, scenario) ? setups[scenario] : undefined;
if (!setup) fail(`unknown scenario ${JSON.stringify(scenario)}`);

const handle = setup(graph, agentBase);
window.__aguiRunStack = {
  scenario,
  snapshot: () => handle.snapshot(),
  dispose: () => handle.dispose?.(),
};
createRoot(container as HTMLElement).render(handle.element);
document.documentElement.dataset.aguiRunStackReady = "true";
