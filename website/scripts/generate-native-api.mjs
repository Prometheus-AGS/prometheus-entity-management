import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {existsSync} from 'node:fs';
import {cp, lstat, mkdtemp, mkdir, readFile, realpath, rm, unlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeNativeApiManifest} from './native-api-manifest.mjs';

const websiteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = path.resolve(websiteRoot, '..');
const flutterVersion = '3.44.8';
const flutterExecutable = process.env.NATIVE_API_FLUTTER_BIN ?? 'flutter';
const rustToolchain = '1.88.0';
const dartdocVersion = '9.0.5';
const temporaryOwnerFile = '.prometheus-native-api-owner';
const workingOwnerToken = randomBytes(32).toString('hex');
const canonicalOutput = path.join(websiteRoot, 'static/native-api');
const outputArgument = process.argv.indexOf('--output');
if (outputArgument !== -1 && !process.argv[outputArgument + 1]) {
  throw new Error('--output requires a directory');
}
const output = outputArgument === -1
  ? canonicalOutput
  : path.resolve(process.argv[outputArgument + 1]);
const dartOnly = process.argv.includes('--dart-only');
const refreshLock = process.argv.includes('--refresh-lock');
if (refreshLock && output !== canonicalOutput) {
  throw new Error('--refresh-lock may only be used with the canonical native API output');
}

function isWithin(parent, target) {
  return target === parent || target.startsWith(`${parent}${path.sep}`);
}

async function assertSafeOutput() {
  if (output === canonicalOutput) return;
  const approvedValue = process.env.NATIVE_API_TEMP_ROOT;
  const ownerToken = process.env.NATIVE_API_TEMP_TOKEN;
  if (!approvedValue || !ownerToken) {
    throw new Error('refusing unsafe native API output: temporary root and ownership token are required');
  }
  const approvedRoot = path.resolve(approvedValue);
  const approvedStats = await lstat(approvedRoot);
  if (approvedStats.isSymbolicLink() || !approvedStats.isDirectory()) {
    throw new Error(`refusing unsafe native API output: ${output}`);
  }
  const approvedReal = await realpath(approvedRoot);
  const systemTempReal = await realpath(tmpdir());
  const ownerPath = path.join(approvedRoot, temporaryOwnerFile);
  const ownerStats = await lstat(ownerPath);
  if (
    ownerStats.isSymbolicLink()
    || !ownerStats.isFile()
    || output !== approvedRoot
    || approvedReal === systemTempReal
    || !isWithin(systemTempReal, approvedReal)
    || !path.basename(approvedReal).startsWith('prometheus-native-api-')
    || isWithin(approvedReal, repositoryRoot)
    || isWithin(approvedReal, websiteRoot)
    || (await readFile(ownerPath, 'utf8')) !== ownerToken
  ) {
    throw new Error(`refusing unsafe native API output: ${output}`);
  }
}

async function removeGeneratedDirectory(target) {
  try {
    const stats = await lstat(target);
    if (stats.isSymbolicLink()) throw new Error(`refusing symbolic native API output: ${target}`);
    await rm(target, {recursive: true, force: true});
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

await assertSafeOutput();
const tempRoot = await mkdtemp(path.join(repositoryRoot, '.native-docs-'));
await writeFile(path.join(tempRoot, temporaryOwnerFile), workingOwnerToken, {flag: 'wx'});
const cargoTarget = path.join(repositoryRoot, `.native-docs-cache/cargo-${rustToolchain}`);

async function removeOwnedWorkingRoot() {
  const stats = await lstat(tempRoot);
  if (stats.isSymbolicLink()) {
    await unlink(tempRoot);
    throw new Error(`refused recursive cleanup of symbolic native documentation root: ${tempRoot}`);
  }
  const tempReal = await realpath(tempRoot);
  const repositoryReal = await realpath(repositoryRoot);
  const ownerPath = path.join(tempRoot, temporaryOwnerFile);
  const ownerStats = await lstat(ownerPath);
  if (
    !stats.isDirectory()
    || ownerStats.isSymbolicLink()
    || !ownerStats.isFile()
    || !tempReal.startsWith(`${repositoryReal}${path.sep}.native-docs-`)
    || (await readFile(ownerPath, 'utf8')) !== workingOwnerToken
  ) {
    throw new Error(`refused cleanup of unowned native documentation root: ${tempRoot}`);
  }
  await rm(tempRoot, {recursive: true});
}

function run(command, args, cwd = repositoryRoot) {
  execFileSync(command, args, {cwd, stdio: 'inherit'});
}

function assertPinnedFlutter() {
  const output = execFileSync(flutterExecutable, ['--version', '--machine'], {encoding: 'utf8'});
  const jsonStart = output.indexOf('{');
  if (jsonStart === -1) throw new Error('Flutter --version --machine did not return JSON');
  const details = JSON.parse(output.slice(jsonStart));
  if (details.frameworkVersion !== flutterVersion) {
    throw new Error(`native API generation requires Flutter ${flutterVersion}; found ${details.frameworkVersion}`);
  }
}

try {
  assertPinnedFlutter();
  await assertSafeOutput();
  if (output === canonicalOutput) {
    await removeGeneratedDirectory(dartOnly ? path.join(output, 'dart') : output);
  } else {
    await removeGeneratedDirectory(path.join(output, 'dart'));
    if (!dartOnly) await removeGeneratedDirectory(path.join(output, 'rust'));
  }
  await mkdir(output, {recursive: true});

  const dartPackage = path.join(repositoryRoot, 'packages/entity_graph_flutter');
  const dartDocumentationPackage = path.join(tempRoot, 'entity_graph_flutter');
  await cp(dartPackage, dartDocumentationPackage, {
    recursive: true,
    filter(source) {
      return !source.split(path.sep).some((segment) => ['.dart_tool', 'build', 'doc'].includes(segment));
    },
  });
  const pubspecPath = path.join(dartDocumentationPackage, 'pubspec.yaml');
  const pubspec = await readFile(pubspecPath, 'utf8');
  await writeFile(
    pubspecPath,
    pubspec
      .replace(/^resolution: workspace\n/m, '')
      .replace(/^dev_dependencies:[\s\S]*?(?=^flutter:)/m, `dev_dependencies:\n  dartdoc: ${dartdocVersion}\n\n`),
  );
  const documentationLock = path.join(websiteRoot, 'native-api-pubspec.lock');
  const temporaryLock = path.join(dartDocumentationPackage, 'pubspec.lock');
  if (existsSync(documentationLock) && !refreshLock) {
    await cp(documentationLock, temporaryLock);
    run(flutterExecutable, ['pub', 'get', '--enforce-lockfile'], dartDocumentationPackage);
  } else {
    run(flutterExecutable, ['pub', 'get'], dartDocumentationPackage);
    await cp(temporaryLock, documentationLock);
  }
  run(
    flutterExecutable,
    ['pub', 'run', 'dartdoc', '--validate-links', '--output', path.join(output, 'dart'), '.'],
    dartDocumentationPackage,
  );

  if (!dartOnly) {
    await rm(path.join(cargoTarget, 'doc'), {recursive: true, force: true});
    for (const manifest of [
      'packages/entity-graph-cli/Cargo.toml',
      'packages/entity-graph-mcp/Cargo.toml',
      'packages/entity-graph-tauri/rust-plugin/Cargo.toml',
    ]) {
      run('cargo', [
        `+${rustToolchain}`,
        'doc',
        '--locked',
        '--no-deps',
        '--manifest-path',
        path.join(repositoryRoot, manifest),
        '--target-dir',
        cargoTarget,
      ]);
    }
    await cp(path.join(cargoTarget, 'doc'), path.join(output, 'rust'), {recursive: true});
    await writeFile(
      path.join(output, 'rust/index.html'),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Prometheus Entity Management Rust API</title>
    <style>
      :root { color-scheme: light dark; font-family: Inter, system-ui, sans-serif; }
      body { max-width: 52rem; margin: 0 auto; padding: 3rem 1.25rem; line-height: 1.6; }
      h1 { color: #e04e28; }
      a { color: #c43f1e; }
      a:focus-visible { outline: 3px solid #e04e28; outline-offset: 3px; }
      li { margin-block: .75rem; }
      @media (prefers-color-scheme: dark) { h1, a { color: #ff6a3d; } }
    </style>
  </head>
  <body>
    <p><a href="../../docs/3.x/packages/">← Packages &amp; API</a></p>
    <h1>Rust API reference</h1>
    <p>Crate-scoped rustdoc generated with locked dependencies and <code>--no-deps</code>.</p>
    <ul>
      <li><a href="entity_graph/">Entity Graph CLI</a></li>
      <li><a href="entity_graph_mcp/">Entity Graph MCP server</a></li>
      <li><a href="entity_graph_tauri/">Entity Graph Tauri plugin</a></li>
    </ul>
  </body>
</html>
`,
    );
  }
  console.log(
    dartOnly
      ? 'Generated canonical dartdoc reference.'
      : 'Generated canonical dartdoc and crate-scoped rustdoc references.',
  );
  if (output === canonicalOutput) await writeNativeApiManifest();
} finally {
  await removeOwnedWorkingRoot();
}
