import {createHash} from 'node:crypto';
import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const websiteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = path.resolve(websiteRoot, '..');
const outputRoot = path.join(websiteRoot, 'static/native-api');
const manifestPath = path.join(outputRoot, 'manifest.json');

const sourceRoots = [
  'packages/entity_graph_flutter/lib',
  'packages/entity_graph_flutter/pubspec.yaml',
  'packages/entity-graph-cli/src',
  'packages/entity-graph-cli/Cargo.toml',
  'packages/entity-graph-cli/Cargo.lock',
  'packages/entity-graph-mcp/src',
  'packages/entity-graph-mcp/Cargo.toml',
  'packages/entity-graph-mcp/Cargo.lock',
  'packages/entity-graph-tauri/rust-plugin/src',
  'packages/entity-graph-tauri/rust-plugin/Cargo.toml',
  'packages/entity-graph-tauri/rust-plugin/Cargo.lock',
  'website/native-api-pubspec.lock',
];

async function filesUnder(target) {
  const stats = await import('node:fs/promises').then(({stat}) => stat(target));
  if (stats.isFile()) return [target];
  const files = [];
  for (const entry of await readdir(target, {withFileTypes: true})) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

async function inventory(roots, excluded = new Set(), relativeRoot = repositoryRoot) {
  const files = [];
  for (const root of roots) files.push(...await filesUnder(root));
  const records = [];
  for (const file of files.toSorted()) {
    if (excluded.has(file)) continue;
    const bytes = await readFile(file);
    records.push({
      path: path.relative(relativeRoot, file).split(path.sep).join('/'),
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length,
    });
  }
  return records;
}

function aggregate(records) {
  return createHash('sha256')
    .update(records.map(({path: file, sha256, bytes}) => `${file}:${sha256}:${bytes}`).join('\n'))
    .digest('hex');
}

export async function collectNativeApiManifest() {
  const sourceFiles = await inventory(sourceRoots.map((entry) => path.join(repositoryRoot, entry)));
  const artifactFiles = await inventory([path.join(outputRoot, 'dart'), path.join(outputRoot, 'rust')]);
  return {
    schemaVersion: '1.0.0',
    sourceFiles,
    sourceAggregateSha256: aggregate(sourceFiles),
    artifactFileCount: artifactFiles.length,
    artifactAggregateSha256: aggregate(artifactFiles),
  };
}

export async function collectNativeApiArtifactFiles(root = outputRoot) {
  return inventory([path.join(root, 'dart'), path.join(root, 'rust')], new Set(), root);
}

export async function writeNativeApiManifest() {
  const manifest = await collectNativeApiManifest();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function verifyNativeApiManifest() {
  const expected = JSON.parse(await readFile(manifestPath, 'utf8'));
  const actual = await collectNativeApiManifest();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('native API sources or committed artifacts drifted; run pnpm docs:native-api');
  }
  return actual;
}
