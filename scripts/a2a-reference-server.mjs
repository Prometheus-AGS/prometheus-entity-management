import { createServer } from "node:http";
import { Readable } from "node:stream";

import {
  buildAgentCard,
  createA2AServer,
} from "../packages/entity-graph-a2a/dist/index.mjs";
import { A2ATckScenarioExecutor } from "./a2a-tck-scenario-executor.mjs";

const requestedPort = Number.parseInt(process.env.A2A_TCK_PORT ?? "0", 10);
if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65_535) {
  throw new Error("A2A_TCK_PORT must be a valid TCP port.");
}

let a2aServer;

const httpServer = createServer(async (incoming, outgoing) => {
  try {
    if (incoming.url === "/health") {
      outgoing.writeHead(200, { "content-type": "application/json" });
      outgoing.end(JSON.stringify({ status: "ok" }));
      return;
    }
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const address = httpServer.address();
    const port = typeof address === "object" && address ? address.port : requestedPort;
    const request = new Request(`http://127.0.0.1:${port}${incoming.url ?? "/"}`, {
      method: incoming.method,
      headers: incoming.headers,
      ...(body.length > 0 ? { body, duplex: "half" } : {}),
    });
    const response = await a2aServer.fetch(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    if (!response.body) {
      outgoing.end();
      return;
    }
    Readable.fromWeb(response.body).pipe(outgoing);
  } catch (error) {
    outgoing.writeHead(500, { "content-type": "application/json" });
    outgoing.end(JSON.stringify({ error: "reference-server-failure" }));
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  }
});

httpServer.listen(requestedPort, "127.0.0.1", () => {
  const address = httpServer.address();
  if (!address || typeof address === "string") throw new Error("No TCP address assigned.");
  const endpoint = `http://127.0.0.1:${address.port}/`;
  a2aServer = createA2AServer({
    card: buildAgentCard({ url: endpoint }),
    executor: new A2ATckScenarioExecutor(),
  });
  process.stdout.write(`A2A_TCK_READY ${endpoint}\n`);
});

async function stop() {
  await new Promise((resolve) => httpServer.close(resolve));
  process.exit(0);
}

process.on("SIGTERM", stop);
process.on("SIGINT", stop);
