import {execFileSync} from 'node:child_process';
import {createHash, randomBytes} from 'node:crypto';
import {mkdtemp, mkdir, readdir, readFile, symlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {Application} from 'typedoc';

import {PUBLIC_PACKAGES} from '../../scripts/public-packages.mjs';
import {removeContainedDirectory, removeOwnedDirectory} from './contained-directory.mjs';

const websiteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = path.resolve(websiteRoot, '..');
const output = path.join(websiteRoot, 'static/api');
const tempRoot = await mkdtemp(path.join(repositoryRoot, '.typedoc-packed-'));
const temporaryOwnerFile = '.prometheus-packed-api-owner';
const temporaryOwnerToken = randomBytes(32).toString('hex');
await writeFile(path.join(tempRoot, temporaryOwnerFile), temporaryOwnerToken, {flag: 'wx'});
const packRoot = path.join(tempRoot, 'tarballs');
const extractRoot = path.join(tempRoot, 'packages');
const dependencyRoot = path.join(tempRoot, 'node_modules');

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function packageSlug(name) {
  return name.replace('@prometheus-ags/', '');
}

async function sanitizeGeneratedSources(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await sanitizeGeneratedSources(target);
      continue;
    }
    if (!/\.(?:html|js|json)$/.test(entry.name)) continue;
    const content = await readFile(target, 'utf8');
    const sanitized = content.replace(/\.typedoc-packed-[^/]+\/packages\//g, 'packages/');
    if (sanitized !== content) await writeFile(target, sanitized);
  }
}

try {
  await mkdir(packRoot, {recursive: true});
  await mkdir(extractRoot, {recursive: true});
  await mkdir(dependencyRoot, {recursive: true});
  const installedDependencyRoot = path.join(repositoryRoot, 'node_modules/.pnpm/node_modules');
  for (const dependency of await readdir(installedDependencyRoot)) {
    if (dependency === '@prometheus-ags') continue;
    await symlink(
      path.join(installedDependencyRoot, dependency),
      path.join(dependencyRoot, dependency),
      'dir',
    );
  }
  await mkdir(path.join(dependencyRoot, '@prometheus-ags'), {recursive: true});
  const entryPoints = [];
  const inventory = [];

  for (const declared of PUBLIC_PACKAGES) {
    const packageRoot = path.join(repositoryRoot, declared.directory);
    const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
    const packed = JSON.parse(run('pnpm', ['--dir', packageRoot, 'pack', '--pack-destination', packRoot, '--json']));
    const tarball = path.resolve(packageRoot, packed.filename);
    const tarballBytes = await readFile(tarball);
    const extracted = path.join(extractRoot, packageSlug(declared.name));
    await mkdir(extracted, {recursive: true});
    run('tar', ['-xzf', tarball, '-C', extracted, '--strip-components=1']);
    const packedManifest = JSON.parse(await readFile(path.join(extracted, 'package.json'), 'utf8'));
    if (packedManifest.name !== declared.name || packedManifest.version !== manifest.version) {
      throw new Error(`packed manifest mismatch for ${declared.name}`);
    }
    // TypeDoc reads the packed declaration files. External peer types resolve through
    // the dependency graph certified by the repository lockfile, while internal imports
    // resolve back to these packed extractions rather than the source workspace.
    await symlink(dependencyRoot, path.join(extracted, 'node_modules'), 'dir');
    await symlink(
      extracted,
      path.join(dependencyRoot, '@prometheus-ags', declared.name.slice('@prometheus-ags/'.length)),
      'dir',
    );
    await writeFile(
      path.join(extracted, 'tsconfig.json'),
      `${JSON.stringify(
        {
          compilerOptions: {
            lib: ['ES2023', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            moduleResolution: 'Bundler',
            types: ['node'],
          },
          include: ['dist/**/*.d.ts'],
        },
        null,
        2,
      )}\n`,
    );
    entryPoints.push(extracted);
    inventory.push({
      name: declared.name,
      version: manifest.version,
      role: manifest.description,
      types: manifest.types,
      tarballSha256: createHash('sha256').update(tarballBytes).digest('hex'),
      tarballIntegrity: `sha512-${createHash('sha512').update(tarballBytes).digest('base64')}`,
    });
  }

  await removeContainedDirectory(websiteRoot, output);
  const registryStatus = JSON.parse(
    await readFile(path.join(repositoryRoot, 'release/npm-registry-status.json'), 'utf8'),
  );
  const revision = registryStatus.candidateSourceSha;
  if (!/^[0-9a-f]{40}$/.test(revision ?? '')) {
    throw new Error('npm registry status must identify the immutable candidate source SHA');
  }
  const app = await Application.bootstrap({
    entryPoints,
    entryPointStrategy: 'packages',
    compilerOptions: {types: ['node']},
    out: output,
    readme: 'none',
    cleanOutputDir: true,
    githubPages: false,
    name: 'Prometheus Entity Management API',
    customCss: path.join(websiteRoot, 'src/css/typedoc.css'),
    gitRevision: revision,
    sourceLinkTemplate:
      'https://github.com/Prometheus-AGS/prometheus-entity-management/blob/{gitRevision}/{path}#L{line}',
  });
  const project = await app.convert();
  if (!project) throw new Error('TypeDoc could not convert the packed package set');
  await app.generateDocs(project, output);
  await sanitizeGeneratedSources(output);

  const fingerprint = createHash('sha256').update(JSON.stringify(inventory)).digest('hex');
  await writeFile(
    path.join(output, 'packed-inventory.json'),
    `${JSON.stringify({schemaVersion: '1.0.0', revision, fingerprint, packages: inventory}, null, 2)}\n`,
  );
  console.log(`Generated packed TypeDoc reference for ${inventory.length} packages (${fingerprint}).`);
} finally {
  await removeOwnedDirectory({
    anchor: repositoryRoot,
    target: tempRoot,
    markerName: temporaryOwnerFile,
    ownerToken: temporaryOwnerToken,
  });
}
