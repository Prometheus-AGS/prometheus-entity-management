import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {assertEvidenceBinding, assertEvidenceImage, assertReceiptCertification} from './evidence-receipt.mjs';
import {removeContainedDirectory} from './contained-directory.mjs';
import {hashArtifactTree} from './static-artifact-manifest.mjs';

const websiteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = path.resolve(websiteRoot, '..');
const allowlist = JSON.parse(await readFile(path.join(websiteRoot, 'evidence.allowlist.json'), 'utf8'));
const certificationPath = path.join(websiteRoot, 'evidence-certifications.json');
const certificationBytes = await readFile(certificationPath);
const certificationReceipt = JSON.parse(certificationBytes.toString('utf8'));
const coverage = JSON.parse(await readFile(path.join(repositoryRoot, 'examples/coverage.json'), 'utf8'));
const validScenarios = new Set(coverage.showcases.flatMap(({scenarioIds}) => scenarioIds));
const outputRoot = path.join(websiteRoot, 'static/evidence');
const originalRoot = path.join(outputRoot, 'original');

function resolveVerifiedSourceBlob(asset) {
  const sourceGitBlobSha = execFileSync(
    'git',
    ['rev-parse', `HEAD:${asset.sourcePath}`],
    {cwd: repositoryRoot, encoding: 'utf8'},
  ).trim();
  if (!/^[0-9a-f]{40}$/.test(sourceGitBlobSha)) {
    throw new Error(`${asset.assetId}: evidence source must resolve to an exact Git blob SHA`);
  }
  let committedSourceBytes;
  try {
    committedSourceBytes = execFileSync('git', ['cat-file', 'blob', sourceGitBlobSha], {
      cwd: repositoryRoot,
      encoding: null,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(
      `${asset.assetId}: source Git blob ${sourceGitBlobSha} is unavailable`,
      {cause: error},
    );
  }
  const committedSourceSha256 = createHash('sha256').update(committedSourceBytes).digest('hex');
  if (committedSourceSha256 !== asset.sourceSha256) {
    throw new Error(
      `${asset.assetId}: source Git blob ${sourceGitBlobSha} does not match the allowlisted SHA-256`,
    );
  }
  return sourceGitBlobSha;
}

if (allowlist.schemaVersion !== '1.0.0') throw new Error('unsupported evidence allowlist schema');
if (certificationReceipt.schemaVersion !== '1.0.0') {
  throw new Error('unsupported evidence certification schema');
}
const certifications = new Map();
for (const record of certificationReceipt.records ?? []) {
  if (certifications.has(record.assetId)) {
    throw new Error(`duplicate evidence certification ${String(record.assetId)}`);
  }
  certifications.set(record.assetId, record);
}
if (certifications.size !== allowlist.assets.length) {
  throw new Error('evidence certification inventory does not match the allowlist');
}
const certificationReceiptSha256 = createHash('sha256').update(certificationBytes).digest('hex');
await removeContainedDirectory(websiteRoot, outputRoot);
await mkdir(originalRoot, {recursive: true});

const records = [];
for (const asset of allowlist.assets) {
  if (!/^[a-z0-9-]+$/.test(asset.assetId)) throw new Error(`invalid asset ID ${asset.assetId}`);
  if (/failure|diff|blank|icon|\.app\//i.test(asset.sourcePath)) {
    throw new Error(`forbidden product-gallery source ${asset.sourcePath}`);
  }
  for (const scenarioId of asset.scenarioIds) {
    if (!validScenarios.has(scenarioId)) throw new Error(`${asset.assetId}: unknown scenario ${scenarioId}`);
  }
  const source = path.join(repositoryRoot, asset.sourcePath);
  const receipt = path.join(repositoryRoot, asset.receipt);
  const receiptBytes = await readFile(receipt);
  const receiptData = JSON.parse(receiptBytes.toString('utf8'));
  const certification = certifications.get(asset.assetId);
  assertReceiptCertification(asset, receiptData, asset.receiptAssertion, certification);
  certifications.delete(asset.assetId);
  const receiptSha256 = createHash('sha256').update(receiptBytes).digest('hex');
  const sourceBytes = await readFile(source);
  const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
  assertEvidenceBinding(asset, sourceSha256, receiptSha256);
  const sourceGitBlobSha = resolveVerifiedSourceBlob(asset);
  const image = sharp(sourceBytes, {density: 144});
  const [metadata, statistics] = await Promise.all([image.metadata(), image.clone().stats()]);
  assertEvidenceImage(asset.assetId, metadata, statistics);
  const original = path.join(originalRoot, `${asset.assetId}.png`);
  await sharp(sourceBytes, {density: 144}).png().toFile(original);
  const publishedBytes = await readFile(original);
  const publishedSha256 = createHash('sha256').update(publishedBytes).digest('hex');
  const variantWidths = [...new Set([640, 1280].map((width) => Math.min(width, metadata.width)))];
  for (const width of variantWidths) {
    await sharp(sourceBytes, {density: 144})
      .resize({width, withoutEnlargement: true})
      .webp({quality: 82})
      .toFile(path.join(outputRoot, `${asset.assetId}-${width}.webp`));
  }
  records.push({
    ...asset,
    sourceGitBlobSha,
    sourceSha256,
    receiptSha256,
    width: metadata.width,
    height: metadata.height,
    variants: variantWidths.map((width) => ({width, path: `${asset.assetId}-${width}.webp`})),
    sha256: publishedSha256,
  });
}
if (certifications.size !== 0) throw new Error('unused evidence certification records remain');

const sections = new Map([
  ['React and Next.js', records.filter(({assetId}) => assetId.startsWith('react-') || assetId.startsWith('next-'))],
  ['Agentic A2UI', records.filter(({assetId}) => assetId.startsWith('a2ui-'))],
  ['Flutter and provenance', records.filter(({assetId}) => assetId.startsWith('flutter-'))],
  ['Tauri desktop and mobile', records.filter(({assetId}) => assetId.startsWith('tauri-'))],
  ['Flint and release operations', records.filter(({assetId}) => assetId.startsWith('flint-') || assetId.startsWith('release-'))],
]);
const lines = [
  '---', 'title: Evidence gallery', 'sidebar_position: 1', '---', '',
  "import EvidenceFigure from '@site/src/components/EvidenceFigure';", '',
  '# Evidence gallery', '',
  'Every figure below resolves to an allowlisted source, scenario IDs, verification receipt, content-addressed Git blob SHA, dimensions, certification status, and SHA-256 in [`manifest.json`](pathname:///evidence/manifest.json). Select an image to download its original PNG.', '',
];
for (const [title, assets] of sections) {
  lines.push(`## ${title}`, '');
  for (const asset of assets) {
    const [small, large = small] = asset.variants;
    lines.push(
      `<EvidenceFigure assetId="${asset.assetId}" alt="${asset.alt.replaceAll('"', '&quot;')}" caption="${asset.caption.replaceAll('"', '&quot;')}" width={${asset.width}} height={${asset.height}} smallWidth={${small.width}} largeWidth={${large.width}} />`,
      '',
    );
  }
}
const galleryContent = `${lines.join('\n').trimEnd()}\n`;
const artifactManifest = await hashArtifactTree(outputRoot, {exclude: ['manifest.json']});
await writeFile(
  path.join(outputRoot, 'manifest.json'),
  `${JSON.stringify({
    schemaVersion: '1.0.0',
    certificationReceipt: 'website/evidence-certifications.json',
    certificationReceiptSha256,
    gallerySha256: createHash('sha256').update(galleryContent).digest('hex'),
    ...artifactManifest,
    assets: records,
  }, null, 2)}\n`,
);
await writeFile(path.join(websiteRoot, 'docs/evidence/gallery.mdx'), galleryContent);
console.log(`Generated ${records.length} allowlisted evidence assets.`);
