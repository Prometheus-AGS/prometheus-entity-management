import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const declarationPath = resolve(
  workspaceRoot,
  "packages/a2ui-react/dist/index.d.cts",
);

const originalImport =
  "import { ComponentApi, ComponentContext, Catalog, A2uiClientAction, MessageProcessor, SurfaceModel, A2uiClientCapabilities, A2uiClientDataModel } from '@a2ui/web_core/v0_9';";
const compatibleImport =
  "import type { ComponentApi, ComponentContext, Catalog, A2uiClientAction, MessageProcessor, SurfaceModel, A2uiClientCapabilities, A2uiClientDataModel } from '@a2ui/web_core/v0_9' with { \"resolution-mode\": \"import\" };";
const originalExport =
  "export { A2uiClientAction, A2uiClientCapabilities, A2uiClientDataModel, A2uiMessage, Catalog, SurfaceModel } from '@a2ui/web_core/v0_9';";
const compatibleExport =
  "export type { A2uiClientAction, A2uiClientCapabilities, A2uiClientDataModel, A2uiMessage, Catalog, SurfaceModel } from '@a2ui/web_core/v0_9' with { \"resolution-mode\": \"import\" };";

const declaration = await readFile(declarationPath, "utf8");
if (!declaration.includes(originalImport) || !declaration.includes(originalExport)) {
  throw new Error(
    "A2UI CommonJS declaration shape drifted; update the import-mode normalization deliberately.",
  );
}

await writeFile(
  declarationPath,
  declaration
    .replace(originalImport, compatibleImport)
    .replace(originalExport, compatibleExport),
);

process.stdout.write(
  "[a2ui-declarations] CommonJS protocol types use import-mode resolution.\n",
);
