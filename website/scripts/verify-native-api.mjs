import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {lstat, mkdtemp, readFile, realpath, rm, unlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectNativeApiArtifactFiles, verifyNativeApiManifest} from './native-api-manifest.mjs';

if (process.argv.includes('--write')) {
  throw new Error('native API manifests may only be written by the canonical generator');
}

const websiteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = path.resolve(websiteRoot, '..');
const generatedRoot = await mkdtemp(path.join(tmpdir(), 'prometheus-native-api-'));
const temporaryToken = randomBytes(32).toString('hex');
await writeFile(path.join(generatedRoot, '.prometheus-native-api-owner'), temporaryToken, {flag: 'wx'});

async function removeOwnedTemporaryRoot() {
  const stats = await lstat(generatedRoot);
  if (stats.isSymbolicLink()) {
    await unlink(generatedRoot);
    throw new Error(`refused recursive cleanup of symbolic native API root: ${generatedRoot}`);
  }
  const systemTempReal = await realpath(tmpdir());
  const generatedReal = await realpath(generatedRoot);
  const ownerPath = path.join(generatedRoot, '.prometheus-native-api-owner');
  const ownerStats = await lstat(ownerPath);
  if (
    !stats.isDirectory()
    || ownerStats.isSymbolicLink()
    || !ownerStats.isFile()
    || !generatedReal.startsWith(`${systemTempReal}${path.sep}prometheus-native-api-`)
    || (await readFile(ownerPath, 'utf8')) !== temporaryToken
  ) {
    throw new Error(`refused cleanup of unowned native API root: ${generatedRoot}`);
  }
  await rm(generatedRoot, {recursive: true});
}

function artifactDelta(committed, regenerated) {
  const committedByPath = new Map(committed.map((record) => [record.path, record]));
  const regeneratedByPath = new Map(regenerated.map((record) => [record.path, record]));
  const paths = new Set([...committedByPath.keys(), ...regeneratedByPath.keys()]);
  return [...paths]
    .toSorted()
    .filter((file) => JSON.stringify(committedByPath.get(file)) !== JSON.stringify(regeneratedByPath.get(file)))
    .slice(0, 12);
}

try {
  const manifest = await verifyNativeApiManifest();
  execFileSync(
    process.execPath,
    [path.join(websiteRoot, 'scripts/generate-native-api.mjs'), '--output', generatedRoot],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        NATIVE_API_TEMP_ROOT: generatedRoot,
        NATIVE_API_TEMP_TOKEN: temporaryToken,
      },
      stdio: 'inherit',
    },
  );
  const committed = await collectNativeApiArtifactFiles();
  const regenerated = await collectNativeApiArtifactFiles(generatedRoot);
  if (JSON.stringify(committed) !== JSON.stringify(regenerated)) {
    const changed = artifactDelta(committed, regenerated);
    throw new Error(
      `committed native API artifacts differ from an isolated regeneration (${changed.join(', ')}); run pnpm docs:native-api`,
    );
  }
  console.log(
    `Verified reproducible native API parity for ${manifest.sourceFiles.length} source files and ${manifest.artifactFileCount} generated files.`,
  );
} finally {
  await removeOwnedTemporaryRoot();
}
