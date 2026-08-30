import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const receiptPath = new URL(
  "../.kbd-orchestrator/phases/v3-devtools-parity/evidence/v3-devtools-react-inspector/usability-study/operator-revision-receipt.json",
  import.meta.url,
);
const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));

function prometheus(...args) {
  return execFileSync("prometheus", args, { encoding: "utf8" });
}

const version = prometheus("--version").trim();
const status = JSON.parse(prometheus("kbd", "status", "--json"));
const events = JSON.parse(prometheus("kbd", "audit", "--since", String(receipt.revision), "--json"));
const decisionEvent = events.find((event) => event.commandId === receipt.commandId);

if (!decisionEvent) throw new Error(`Missing signed KBD event ${receipt.commandId}`);
if (decisionEvent.eventId !== receipt.eventId) throw new Error("Decision event id mismatch");
if (decisionEvent.integrityHash !== receipt.integrityHash) throw new Error("Decision integrity hash mismatch");
if (decisionEvent.signerKeyId !== receipt.signerKeyId) throw new Error("Decision signer mismatch");
if (decisionEvent.signature !== receipt.signature) throw new Error("Decision signature mismatch");
if (decisionEvent.kind?.payload?.decision?.id !== receipt.decisionId) throw new Error("Decision id mismatch");
if (decisionEvent.kind?.payload?.decision?.summary !== receipt.summary) throw new Error("Decision summary mismatch");
if (status.commandRevisions?.[receipt.commandId] !== receipt.revision) throw new Error("Decision revision mismatch");
if (status.decisions?.[receipt.decisionId]?.summary !== receipt.summary) throw new Error("Folded decision mismatch");
if (status.planRevision !== receipt.planRevisionAfterRevision) throw new Error("Plan revision mismatch");
if (!status.operatorKeyIds?.includes(receipt.signerKeyId)) throw new Error("Decision signer is not an operator key");

console.log(JSON.stringify({
  schemaVersion: 1,
  status: "pass",
  verifier: "scripts/verify-devtools-study-decision.mjs",
  runtime: version,
  command: "prometheus kbd status --json + prometheus kbd audit --since 437 --json",
  runtimeReplayContract: "KBD status/audit call Runtime::replay before returning local state/events; replay verifies the signed event chain and rejects invalid signatures.",
  verifiedDecision: {
    commandId: receipt.commandId,
    decisionId: receipt.decisionId,
    revision: receipt.revision,
    eventId: receipt.eventId,
    integrityHash: receipt.integrityHash,
    signerKeyId: receipt.signerKeyId,
  },
  foldedState: {
    revision: status.revision,
    planRevision: status.planRevision,
    decisionCommandRevision: status.commandRevisions[receipt.commandId],
    signerAuthority: "active-operator-key",
  },
}, null, 2));
