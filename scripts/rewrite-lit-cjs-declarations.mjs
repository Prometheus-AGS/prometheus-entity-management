import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const generatedHeader = [
  "import * as lit from 'lit';",
  "import { ReactiveController, ReactiveControllerHost, LitElement, nothing } from 'lit';",
].join("\n");

const litImport = 'import("lit", { with: { "resolution-mode": "import" } })';
const cjsSafeHeader = [
  `type LitModule = typeof ${litImport};`,
  `type ReactiveController = ${litImport}.ReactiveController;`,
  `type ReactiveControllerHost = ${litImport}.ReactiveControllerHost;`,
  'declare const LitElement: LitModule["LitElement"];',
  'declare const nothing: LitModule["nothing"];',
].join("\n");

export async function rewriteLitCjsDeclarations(path) {
  const declarationPath = resolve(path);
  const source = await readFile(declarationPath, "utf8");

  if (!source.startsWith(generatedHeader)) {
    throw new Error(
      `Refusing to rewrite ${declarationPath}: the generated Lit declaration header changed`,
    );
  }

  const rewritten = source
    .replace(generatedHeader, cjsSafeHeader)
    .replaceAll("lit.CSSResult", `${litImport}.CSSResult`)
    .replaceAll("lit.TemplateResult", `${litImport}.TemplateResult`);

  if (rewritten.includes("lit.")) {
    throw new Error(
      `Refusing to write ${declarationPath}: an unhandled Lit namespace reference remains`,
    );
  }

  await writeFile(declarationPath, rewritten);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await rewriteLitCjsDeclarations(process.argv[2] ?? "dist/index.d.cts");
}
