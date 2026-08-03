import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = resolve(workspaceRoot, "packages/entity-graph-a2a/dist");
const indexPath = resolve(distDirectory, "index.d.cts");

const originalSdkBlock = `import { AgentProvider, AgentSkill, AgentExtension, SecurityScheme, SecurityRequirement, AgentCard, Artifact } from '@a2a-js/sdk';
export { A2A_PROTOCOL_VERSION, A2A_VERSION_HEADER, AGENT_CARD_PATH, AgentCapabilities, AgentCard, AgentExtension, AgentInterface, AgentSkill, Artifact, CancelTaskRequest, GetTaskRequest, HTTP_EXTENSION_HEADER, ListTasksRequest, ListTasksResponse, Message, Part, Role, SecurityRequirement, SecurityScheme, SendMessageRequest, SendMessageResponse, StreamResponse, SubscribeToTaskRequest, Task, TaskArtifactUpdateEvent, TaskState, TaskStatus, TaskStatusUpdateEvent } from '@a2a-js/sdk';`;
const compatibleSdkBlock = `import type * as A2ASdk from '@a2a-js/sdk' with { "resolution-mode": "import" };
type AgentProvider = A2ASdk.AgentProvider;
type AgentSkill = A2ASdk.AgentSkill;
type AgentExtension = A2ASdk.AgentExtension;
type SecurityScheme = A2ASdk.SecurityScheme;
type SecurityRequirement = A2ASdk.SecurityRequirement;
type AgentCard = A2ASdk.AgentCard;
type Artifact = A2ASdk.Artifact;
type AgentCapabilities = A2ASdk.AgentCapabilities;
type AgentInterface = A2ASdk.AgentInterface;
type CancelTaskRequest = A2ASdk.CancelTaskRequest;
type GetTaskRequest = A2ASdk.GetTaskRequest;
type ListTasksRequest = A2ASdk.ListTasksRequest;
type ListTasksResponse = A2ASdk.ListTasksResponse;
type Message = A2ASdk.Message;
type Part = A2ASdk.Part;
type SendMessageRequest = A2ASdk.SendMessageRequest;
type SendMessageResponse = A2ASdk.SendMessageResponse;
type StreamResponse = A2ASdk.StreamResponse;
type SubscribeToTaskRequest = A2ASdk.SubscribeToTaskRequest;
type Task = A2ASdk.Task;
type TaskArtifactUpdateEvent = A2ASdk.TaskArtifactUpdateEvent;
type TaskStatus = A2ASdk.TaskStatus;
type TaskStatusUpdateEvent = A2ASdk.TaskStatusUpdateEvent;
declare const A2A_PROTOCOL_VERSION: typeof A2ASdk.A2A_PROTOCOL_VERSION;
declare const A2A_VERSION_HEADER: typeof A2ASdk.A2A_VERSION_HEADER;
declare const AGENT_CARD_PATH: typeof A2ASdk.AGENT_CARD_PATH;
declare const HTTP_EXTENSION_HEADER: typeof A2ASdk.HTTP_EXTENSION_HEADER;
declare const Role: typeof A2ASdk.Role;
declare const TaskState: typeof A2ASdk.TaskState;
export { A2A_PROTOCOL_VERSION, A2A_VERSION_HEADER, AGENT_CARD_PATH, HTTP_EXTENSION_HEADER, Role, TaskState, type AgentCapabilities, type AgentCard, type AgentExtension, type AgentInterface, type AgentSkill, type Artifact, type CancelTaskRequest, type GetTaskRequest, type ListTasksRequest, type ListTasksResponse, type Message, type Part, type SecurityRequirement, type SecurityScheme, type SendMessageRequest, type SendMessageResponse, type StreamResponse, type SubscribeToTaskRequest, type Task, type TaskArtifactUpdateEvent, type TaskStatus, type TaskStatusUpdateEvent };`;

const originalServerBlock = `import { AgentExecutor, ExecutionEventBus, RequestContext } from '@a2a-js/sdk/server';
export { InMemoryTaskStore, TaskStore } from '@a2a-js/sdk/server';`;
const compatibleServerBlock = `import type * as A2AServerSdk from '@a2a-js/sdk/server' with { "resolution-mode": "import" };
type AgentExecutor = A2AServerSdk.AgentExecutor;
type ExecutionEventBus = A2AServerSdk.ExecutionEventBus;
type RequestContext = A2AServerSdk.RequestContext;
type TaskStore = A2AServerSdk.TaskStore;
declare const InMemoryTaskStore: typeof A2AServerSdk.InMemoryTaskStore;
export { InMemoryTaskStore, type TaskStore };`;

let indexDeclaration = await readFile(indexPath, "utf8");
if (!indexDeclaration.includes(originalSdkBlock) || !indexDeclaration.includes(originalServerBlock)) {
  throw new Error(
    "A2A CommonJS root declaration shape drifted; update import-mode normalization deliberately.",
  );
}
indexDeclaration = indexDeclaration
  .replace(originalSdkBlock, compatibleSdkBlock)
  .replace(originalServerBlock, compatibleServerBlock);
await writeFile(indexPath, normalizeTypeImports(indexDeclaration));

for (const filename of await readdir(distDirectory)) {
  if (!filename.endsWith(".d.cts") || filename === "index.d.cts") continue;
  const path = resolve(distDirectory, filename);
  const declaration = await readFile(path, "utf8");
  await writeFile(path, normalizeTypeImports(declaration));
}

process.stdout.write(
  "[a2a-declarations] CommonJS SDK types use import-mode resolution.\n",
);

function normalizeTypeImports(declaration) {
  return declaration
    .replace(
      /import \{ ([^;]+) \} from '(@a2a-js\/sdk(?:\/[^']+)?)';/g,
      'import type { $1 } from \'$2\' with { "resolution-mode": "import" };',
    )
    .replace(/^import '@a2a-js\/sdk(?:\/[^']+)?';\n?/gm, "");
}
