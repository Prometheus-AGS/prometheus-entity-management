import {createHash} from 'node:crypto';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {assertEvidenceBinding, assertEvidenceImage, assertReceiptCertification} from './evidence-receipt.mjs';

const websiteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = path.resolve(websiteRoot, '..');
const allowlist = JSON.parse(await readFile(path.join(websiteRoot, 'evidence.allowlist.json'), 'utf8'));
const coverage = JSON.parse(await readFile(path.join(repositoryRoot, 'examples/coverage.json'), 'utf8'));
const validScenarios = new Set(coverage.showcases.flatMap(({scenarioIds}) => scenarioIds));
const outputRoot = path.join(websiteRoot, 'static/evidence');
const originalRoot = path.join(outputRoot, 'original');

if (allowlist.schemaVersion !== '1.0.0') throw new Error('unsupported evidence allowlist schema');
await rm(outputRoot, {recursive: true, force: true});
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
  assertReceiptCertification(asset.assetId, receiptData, asset.receiptAssertion);
  const receiptSha256 = createHash('sha256').update(receiptBytes).digest('hex');
  const sourceBytes = await readFile(source);
  const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
  assertEvidenceBinding(asset, sourceSha256, receiptSha256);
  const image = sharp(sourceBytes, {density: 144});
  const [metadata, statistics] = await Promise.all([image.metadata(), image.clone().stats()]);
  assertEvidenceImage(asset.assetId, metadata, statistics);
  const original = path.join(originalRoot, `${asset.assetId}.png`);
  await sharp(sourceBytes, {density: 144}).png().toFile(original);
  const publishedBytes = await readFile(original);
  const publishedSha256 = createHash('sha256').update(publishedBytes).digest('hex');
  for (const width of [640, 1280]) {
    await sharp(sourceBytes, {density: 144})
      .resize({width, withoutEnlargement: true})
      .webp({quality: 82})
      .toFile(path.join(outputRoot, `${asset.assetId}-${width}.webp`));
  }
  let sourceSha = asset.sourceSha ?? execFileSync('git', ['log', '-1', '--format=%H', '--', asset.sourcePath], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }).trim();
  if (!sourceSha) sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: repositoryRoot, encoding: 'utf8'}).trim();
  records.push({
    ...asset,
    sourceSha,
    sourceSha256,
    receiptSha256,
    width: metadata.width,
    height: metadata.height,
    sha256: publishedSha256,
  });
}

await writeFile(
  path.join(outputRoot, 'manifest.json'),
  `${JSON.stringify({schemaVersion: '1.0.0', assets: records}, null, 2)}\n`,
);

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
  'Every figure below resolves to an allowlisted source, scenario IDs, verification receipt, source SHA, dimensions, certification status, and SHA-256 in [`manifest.json`](pathname:///evidence/manifest.json). Select an image to download its original PNG.', '',
];
for (const [title, assets] of sections) {
  lines.push(`## ${title}`, '');
  for (const asset of assets) {
    lines.push(
      `<EvidenceFigure assetId="${asset.assetId}" alt="${asset.alt.replaceAll('"', '&quot;')}" caption="${asset.caption.replaceAll('"', '&quot;')}" width={${asset.width}} height={${asset.height}} />`,
      '',
    );
  }
}
await writeFile(path.join(websiteRoot, 'docs/evidence/gallery.mdx'), `${lines.join('\n').trimEnd()}\n`);
console.log(`Generated ${records.length} allowlisted evidence assets.`);
