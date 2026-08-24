import { commands } from "../../../../packages/entity-graph-tauri/src/generated-bindings";

type ContractState = "checking" | "passed" | "denied" | "failed";

const status = document.querySelector<HTMLElement>("[data-contract-status]");
const response = document.querySelector<HTMLElement>("[data-contract-response]");

function render(state: ContractState, value: unknown): void {
  if (!status || !response) throw new Error("contract screen is missing its status elements");
  status.dataset.state = state;
  status.textContent = state.toUpperCase();
  response.textContent = typeof value === "string" ? value : JSON.stringify(value);
  document.documentElement.dataset.contractState = state;
}

async function verifyNativeBridge(): Promise<void> {
  render("checking", "Calling commands.graphPlatformPing() …");

  try {
    const result = await commands.graphPlatformPing();
    if (result.status === "ok") {
      render("passed", result.data);
      return;
    }
    render("denied", String(result.error));
  } catch (error) {
    render("failed", error instanceof Error ? error.message : String(error));
  }
}

void verifyNativeBridge();
