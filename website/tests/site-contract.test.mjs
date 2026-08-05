import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  assertEvidenceBinding,
  assertEvidenceImage,
  assertReceiptCertification,
} from '../scripts/evidence-receipt.mjs';
import {removeContainedDirectory} from '../scripts/contained-directory.mjs';
import {resolveContainedFile} from '../scripts/contained-file.mjs';

const config = await readFile(new URL('../docusaurus.config.ts', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/css/custom.css', import.meta.url), 'utf8');
const brand = await readFile(new URL('../BRAND.md', import.meta.url), 'utf8');
const evidenceFigure = await readFile(new URL('../src/components/EvidenceFigure.tsx', import.meta.url), 'utf8');
const evidenceGenerator = await readFile(new URL('../scripts/generate-evidence.mjs', import.meta.url), 'utf8');
const nativeApiChecker = await readFile(new URL('../scripts/check-native-api.mjs', import.meta.url), 'utf8');
const nativeApiManifest = await readFile(new URL('../scripts/native-api-manifest.mjs', import.meta.url), 'utf8');
const releasing = await readFile(new URL('../../RELEASING.md', import.meta.url), 'utf8');
const flintEvidenceSource = await readFile(
  new URL('../evidence-source/flint-realtime-contract.svg', import.meta.url),
  'utf8',
);

test('uses the repository Pages origin, base path, and explicit trailing slash', () => {
  assert.match(config, /url: 'https:\/\/prometheus-ags\.github\.io'/);
  assert.match(config, /baseUrl: '\/prometheus-entity-management\/'/);
  assert.match(config, /trailingSlash: true/);
});

test('keeps every Docusaurus package on the 3.10.2 line', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const docusaurus = Object.entries({...manifest.dependencies, ...manifest.devDependencies})
    .filter(([name]) => name.startsWith('@docusaurus/'));
  assert.ok(docusaurus.length >= 5);
  for (const [name, version] of docusaurus) assert.equal(version, '3.10.2', name);
  assert.equal(manifest.private, true);
  assert.match(manifest.dependencies.react, /^19\./);
});

test('publishes the complete primary navigation and RC boundary', () => {
  for (const label of [
    'Start Here', 'Concepts', 'Frameworks', 'Integrations', 'Examples',
    'Packages & API', 'Evidence', 'Migration & Operations',
  ]) assert.match(config, new RegExp(`label: '${label.replace('&', '\\&')}'`));
  assert.match(config, /3\.0 RC/);
  assert.match(config, /label: '3\.x'/);
});

test('documents Ember tokens, self-hosted fonts, focus, and reduced motion', () => {
  for (const token of ['#e04e28', '#ff6a3d', '#0b0f14']) assert.match(css, new RegExp(token, 'i'));
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(brand, /OFL-1\.1/);
});

test('keeps the package chooser and packed reference in release-contract parity', async () => {
  const contract = JSON.parse(await readFile(new URL('../../release/v3-release-contract.json', import.meta.url), 'utf8'));
  const inventory = JSON.parse(await readFile(new URL('../static/api/packed-inventory.json', import.meta.url), 'utf8'));
  const chooser = await readFile(new URL('../docs/packages/chooser.md', import.meta.url), 'utf8');
  const expected = contract.artifacts
    .filter(({ecosystem}) => ecosystem === 'npm')
    .map(({packageName}) => packageName);
  assert.equal(expected.length, 12);
  assert.deepEqual(
    inventory.packages.map(({name}) => name).toSorted(),
    expected.toSorted(),
  );
  for (const item of inventory.packages) {
    assert.match(item.tarballSha256, /^[0-9a-f]{64}$/, `${item.name} tarball SHA-256`);
    assert.match(item.tarballIntegrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/, `${item.name} tarball SRI`);
  }
  assert.equal(
    inventory.fingerprint,
    createHash('sha256').update(JSON.stringify(inventory.packages)).digest('hex'),
  );
  const registryStatus = JSON.parse(
    await readFile(new URL('../../release/npm-registry-status.json', import.meta.url), 'utf8'),
  );
  assert.equal(inventory.revision, registryStatus.candidateSourceSha);
  assert.match(inventory.revision, /^[0-9a-f]{40}$/);
  for (const packageName of expected) assert.match(chooser, new RegExp(packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('evidence hashes authenticate each downloadable published original', async () => {
  assert.match(evidenceFigure, /download=\{`\$\{assetId\}\.png`\}/);
  assert.match(evidenceGenerator, /\['rev-parse', `HEAD:\$\{asset\.sourcePath\}`\]/);
  assert.match(evidenceGenerator, /git', \['cat-file', 'blob', sourceGitBlobSha\]/);
  assert.match(evidenceGenerator, /source Git blob \$\{sourceGitBlobSha\} does not match the allowlisted SHA-256/);
  const manifest = JSON.parse(await readFile(new URL('../static/evidence/manifest.json', import.meta.url), 'utf8'));
  const certificationReceipt = await readFile(new URL('../evidence-certifications.json', import.meta.url));
  assert.equal(
    createHash('sha256').update(certificationReceipt).digest('hex'),
    manifest.certificationReceiptSha256,
  );
  for (const asset of manifest.assets) {
    assert.match(asset.sourceGitBlobSha, /^[0-9a-f]{40}$/, `${asset.assetId} source Git blob`);
    assert.match(asset.sourceSha256, /^[0-9a-f]{64}$/, `${asset.assetId} source hash`);
    assert.match(asset.receiptSha256, /^[0-9a-f]{64}$/, `${asset.assetId} receipt hash`);
    const published = await readFile(new URL(`../static/evidence/original/${asset.assetId}.png`, import.meta.url));
    assert.equal(
      createHash('sha256').update(published).digest('hex'),
      asset.sha256,
      `${asset.assetId} published hash`,
    );
    for (const variant of asset.variants) {
      assert.ok(variant.width <= asset.width, `${asset.assetId} variant is not enlarged`);
      assert.equal(variant.path, `${asset.assetId}-${variant.width}.webp`);
    }
  }
});

test('Flint evidence typography is host-independent and remains accessible', () => {
  assert.match(flintEvidenceSource, /<title id="title">Flint realtime entity graph contract<\/title>/);
  assert.match(flintEvidenceSource, /<desc id="desc">/);
  assert.doesNotMatch(flintEvidenceSource, /<text\b/);
  assert.doesNotMatch(flintEvidenceSource, /font-family=/);
  assert.match(flintEvidenceSource, /aria-hidden="true"/);
});

test('evidence receipt assertions bind the successful receipt to the exact asset and scenarios', () => {
  const assertion = {field: 'status', equals: 'pass'};
  const asset = {
    assetId: 'valid',
    sourcePath: 'evidence/valid.png',
    sourceSha256: 'a'.repeat(64),
    receipt: 'evidence/valid.json',
    receiptSha256: 'b'.repeat(64),
    scenarioIds: ['example.valid'],
    certificationStatus: 'verified-browser',
  };
  const certification = {
    assetId: asset.assetId,
    sourcePath: asset.sourcePath,
    sourceSha256: asset.sourceSha256,
    executionReceipt: asset.receipt,
    executionReceiptSha256: asset.receiptSha256,
    scenarioIds: asset.scenarioIds,
    certificationStatus: asset.certificationStatus,
  };
  assert.doesNotThrow(() => assertReceiptCertification(asset, {status: 'pass'}, assertion, certification));
  for (const status of ['bypass', 'bypassed', 'not passed', 'failed', 'in-progress']) {
    assert.throws(
      () => assertReceiptCertification(asset, {status}, assertion, certification),
      /receipt status must equal pass/,
    );
  }
  assert.throws(
    () => assertReceiptCertification(asset, {status: 'bypassed'}, {field: 'status', equals: 'bypassed'}, certification),
    /unsupported certified receipt outcome/,
  );
  assert.throws(
    () => assertReceiptCertification(
      asset,
      {status: 'pass'},
      assertion,
      {...certification, executionReceipt: 'evidence/unrelated-success.json'},
    ),
    /certification executionReceipt does not match/,
  );
  assert.throws(
    () => assertReceiptCertification(
      asset,
      {status: 'pass'},
      assertion,
      {...certification, scenarioIds: ['example.unrelated']},
    ),
    /certification scenarioIds do not match/,
  );
});

test('evidence review binds an exact source and receipt pair', () => {
  const hash = 'a'.repeat(64);
  const asset = {
    assetId: 'bound',
    sourceSha256: hash,
    receiptSha256: hash,
    visualReview: ['no-visible-secrets', 'no-internal-paths', 'not-blank', 'not-icon'],
  };
  assert.doesNotThrow(() => assertEvidenceBinding(asset, hash, hash));
  assert.throws(() => assertEvidenceBinding(asset, 'b'.repeat(64), hash), /sourceSha256 does not match/);
  assert.throws(
    () => assertEvidenceBinding({...asset, visualReview: ['not-blank']}, hash, hash),
    /complete hash-bound visualReview is required/,
  );
});

test('evidence image checks reject blank and icon-sized inputs', () => {
  assert.doesNotThrow(() => assertEvidenceImage('valid', {width: 1280, height: 720}, {entropy: 2.5}));
  assert.throws(
    () => assertEvidenceImage('icon', {width: 64, height: 64}, {entropy: 2.5}),
    /image is too small/,
  );
  assert.throws(
    () => assertEvidenceImage('blank', {width: 1280, height: 720}, {entropy: 0}),
    /appears blank or icon-like/,
  );
});

test('Pages workflow builds pull requests but deploys only protected main', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/docs-pages.yml', import.meta.url), 'utf8');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /environment:\n      name: github-pages/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /pnpm run docs:native-api:check/);
  assert.doesNotMatch(workflow, /pnpm run docs:native-api:verify/);
  assert.doesNotMatch(workflow, /subosito\/flutter-action/);
  assert.doesNotMatch(workflow, /rustup toolchain install/);
  assert.match(workflow, /pnpm run docs:test:browser/);
  assert.match(workflow, /audit:deployed/);
  assert.match(workflow, /DOCS_BASE_URL/);
  assert.match(workflow, /git status --porcelain --untracked-files=all/);
  assert.match(workflow, /for readiness_attempt in \{1\.\.30\}/);
  assert.match(workflow, /curl --fail --silent --output \/dev\/null/);
  assert.doesNotMatch(workflow, /pnpm run ci\b/);
  for (const watchedPath of [
    'tests/browser/v3-docs-pages*',
    'tests/browser/v3-docs-pages.spec.ts-snapshots/**',
    'tests/release/npm-trusted-publishing.test.mjs',
    '.github/workflows/publish.yml',
  ]) assert.match(workflow, new RegExp(watchedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const pushTrigger = workflow.match(/  push:\n([\s\S]*?)  workflow_dispatch:/)?.[1] ?? '';
  assert.doesNotMatch(pushTrigger, /paths:/);
  for (const action of ['actions/checkout', 'pnpm/action-setup', 'actions/setup-node', 'actions/configure-pages', 'actions/upload-pages-artifact', 'actions/deploy-pages']) {
    assert.match(workflow, new RegExp(`${action.replace('/', '\\/')}@[0-9a-f]{40}`));
  }
  const browserConfig = await readFile(new URL('../../tests/browser/v3-docs-pages.playwright.config.ts', import.meta.url), 'utf8');
  assert.match(browserConfig, /reuseExistingServer: false/);
});

test('keeps documentation search I/O behind hook, store, and service boundaries', async () => {
  const page = await readFile(new URL('../src/pages/search.tsx', import.meta.url), 'utf8');
  const hook = await readFile(new URL('../src/features/search/hooks/useDocumentationSearch.ts', import.meta.url), 'utf8');
  const store = await readFile(new URL('../src/features/search/stores/searchIndexStore.ts', import.meta.url), 'utf8');
  const service = await readFile(new URL('../src/features/search/services/loadSearchIndex.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /\bfetch\s*\(/);
  assert.match(page, /useDocumentationSearch/);
  assert.match(hook, /createSearchIndexStore/);
  assert.match(store, /loadSearchIndex/);
  assert.match(service, /\bfetch\s*\(/);
});

test('release native API verification regenerates while Pages validates content-addressed artifacts', async () => {
  const verifier = await readFile(new URL('../scripts/verify-native-api.mjs', import.meta.url), 'utf8');
  const generator = await readFile(new URL('../scripts/generate-native-api.mjs', import.meta.url), 'utf8');
  assert.match(verifier, /--output/);
  assert.match(verifier, /committed native API artifacts differ from an isolated regeneration/);
  assert.match(verifier, /native API manifests may only be written by the canonical generator/);
  assert.match(verifier, /refused recursive cleanup of symbolic native API root/);
  assert.match(verifier, /refused cleanup of unowned native API root/);
  assert.match(generator, /output === canonicalOutput/);
  assert.match(generator, /refused recursive cleanup of symbolic native documentation root/);
  assert.match(generator, /refused cleanup of unowned native documentation root/);
  assert.match(generator, /const flutterVersion = '3\.44\.8'/);
  assert.match(generator, /const rustToolchain = '1\.88\.0'/);
  assert.match(generator, /const dartdocVersion = '9\.0\.5'/);
  assert.match(nativeApiChecker, /verifyNativeApiManifest/);
  assert.doesNotMatch(nativeApiChecker, /generate-native-api|execFile/);
  assert.match(nativeApiManifest, /createHash\('sha256'\)/);
  assert.match(nativeApiManifest, /artifactAggregateSha256/);
  assert.match(releasing, /pnpm run docs:native-api:verify/);
  assert.match(releasing, /git diff --exit-code -- website\/static\/native-api/);
});

test('native API generation rejects destructive output targets before tool execution', () => {
  const generator = fileURLToPath(new URL('../scripts/generate-native-api.mjs', import.meta.url));
  const repository = fileURLToPath(new URL('../../', import.meta.url));
  const result = spawnSync(process.execPath, [generator, '--output', repository], {
    cwd: repository,
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing unsafe native API output/);
});

test('native API generation rejects partial canonical re-signing before tool execution', () => {
  const generator = fileURLToPath(new URL('../scripts/generate-native-api.mjs', import.meta.url));
  const repository = fileURLToPath(new URL('../../', import.meta.url));
  const result = spawnSync(process.execPath, [generator, '--dart-only'], {
    cwd: repository,
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must regenerate Dart and Rust together/);
});

test('contained directory removal rejects a symlinked ancestor without touching its target', async () => {
  const parent = await mkdtemp(path.join(tmpdir(), 'contained-directory-test-'));
  const anchor = path.join(parent, 'anchor');
  const outside = path.join(parent, 'outside');
  const proof = path.join(outside, 'proof.txt');
  try {
    await mkdir(anchor);
    await mkdir(path.join(outside, 'child'), {recursive: true});
    await writeFile(proof, 'retained');
    await symlink(outside, path.join(anchor, 'linked'), 'dir');
    await assert.rejects(
      removeContainedDirectory(anchor, path.join(anchor, 'linked', 'child')),
      /symbolic or non-directory path component/,
    );
    assert.equal(await readFile(proof, 'utf8'), 'retained');
  } finally {
    await rm(parent, {recursive: true, force: true});
  }
});

test('built-site file resolution rejects symlinks that escape the build root', async () => {
  const parent = await mkdtemp(path.join(tmpdir(), 'contained-file-test-'));
  const root = path.join(parent, 'build');
  const outside = path.join(parent, 'outside');
  try {
    await mkdir(root);
    await mkdir(outside);
    await writeFile(path.join(root, 'inside.html'), 'inside');
    await writeFile(path.join(outside, 'secret.html'), 'outside');
    await symlink(outside, path.join(root, 'linked'), 'dir');
    assert.equal(
      await resolveContainedFile(root, path.join(root, 'linked', 'secret.html')),
      null,
    );
    assert.equal(
      await readFile(await resolveContainedFile(root, path.join(root, 'inside.html')), 'utf8'),
      'inside',
    );
  } finally {
    await rm(parent, {recursive: true, force: true});
  }
});

test('native API generation rejects a symlinked temporary ownership root', async () => {
  const generator = fileURLToPath(new URL('../scripts/generate-native-api.mjs', import.meta.url));
  const repository = fileURLToPath(new URL('../../', import.meta.url));
  const attackParent = await mkdtemp(path.join(tmpdir(), 'native-api-safety-test-'));
  const approvedRoot = path.join(attackParent, 'prometheus-native-api-symlink');
  try {
    await symlink(repository, approvedRoot, 'dir');
    const result = spawnSync(process.execPath, [generator, '--output', approvedRoot], {
      cwd: repository,
      encoding: 'utf8',
      env: {
        ...process.env,
        NATIVE_API_TEMP_ROOT: approvedRoot,
        NATIVE_API_TEMP_TOKEN: 'not-an-owner',
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /refusing unsafe native API output|symbolic link/i);
  } finally {
    await rm(attackParent, {recursive: true, force: true});
  }
});
