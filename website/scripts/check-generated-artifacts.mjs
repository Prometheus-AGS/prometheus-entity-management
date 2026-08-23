import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {PUBLIC_PACKAGES} from '../../scripts/public-packages.mjs';
import {
  assertEvidenceBinding,
  assertReceiptCertification,
} from './evidence-receipt.mjs';
import {hashArtifactTree, hashPackedApiInputs} from './static-artifact-manifest.mjs';

const websiteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = path.resolve(websiteRoot, '..');

async function readJson(target) {
  return JSON.parse(await readFile(target, 'utf8'));
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}; received ${actual}`);
}

const apiRoot = path.join(websiteRoot, 'static/api');
const apiInventory = await readJson(path.join(apiRoot, 'packed-inventory.json'));
assertEqual(apiInventory.schemaVersion, '1.0.0', 'packed API schema');
const registryStatus = await readJson(path.join(repositoryRoot, 'release/npm-registry-status.json'));
assertEqual(apiInventory.revision, registryStatus.candidateSourceSha, 'packed API candidate revision drift');
assertEqual(
  apiInventory.fingerprint,
  sha256(Buffer.from(JSON.stringify(apiInventory.packages))),
  'packed API inventory fingerprint drift',
);
const expectedPackages = [];
for (const declared of PUBLIC_PACKAGES) {
  const manifest = await readJson(path.join(repositoryRoot, declared.directory, 'package.json'));
  expectedPackages.push({
    name: manifest.name,
    version: manifest.version,
    role: manifest.description,
    types: manifest.types,
  });
}
assertEqual(
  apiInventory.packages.length,
  expectedPackages.length,
  'packed API package inventory length drift',
);
for (const [index, expected] of expectedPackages.entries()) {
  const actual = apiInventory.packages[index];
  for (const field of Object.keys(expected)) {
    assertEqual(actual?.[field], expected[field], `${expected.name} packed API ${field} drift`);
  }
}
const apiSources = await hashPackedApiInputs(repositoryRoot, PUBLIC_PACKAGES);
assertEqual(apiSources.apiInputFileCount, apiInventory.apiInputFileCount, 'packed API input file count drift');
assertEqual(
  apiSources.apiInputAggregateSha256,
  apiInventory.apiInputAggregateSha256,
  'packed API input hash drift',
);
const apiArtifacts = await hashArtifactTree(apiRoot, {exclude: ['packed-inventory.json']});
assertEqual(apiArtifacts.artifactFileCount, apiInventory.artifactFileCount, 'packed API file count drift');
assertEqual(
  apiArtifacts.artifactAggregateSha256,
  apiInventory.artifactAggregateSha256,
  'packed API artifact hash drift',
);

const evidenceRoot = path.join(websiteRoot, 'static/evidence');
const evidenceManifest = await readJson(path.join(evidenceRoot, 'manifest.json'));
assertEqual(evidenceManifest.schemaVersion, '1.0.0', 'evidence schema');
const galleryBytes = await readFile(path.join(websiteRoot, 'docs/evidence/gallery.mdx'));
assertEqual(sha256(galleryBytes), evidenceManifest.gallerySha256, 'evidence gallery drift');
const evidenceArtifacts = await hashArtifactTree(evidenceRoot, {exclude: ['manifest.json']});
assertEqual(
  evidenceArtifacts.artifactFileCount,
  evidenceManifest.artifactFileCount,
  'evidence file count drift',
);
assertEqual(
  evidenceArtifacts.artifactAggregateSha256,
  evidenceManifest.artifactAggregateSha256,
  'evidence artifact hash drift',
);

const allowlist = await readJson(path.join(websiteRoot, 'evidence.allowlist.json'));
const certificationBytes = await readFile(path.join(websiteRoot, 'evidence-certifications.json'));
const certification = JSON.parse(certificationBytes.toString('utf8'));
assertEqual(
  sha256(certificationBytes),
  evidenceManifest.certificationReceiptSha256,
  'evidence certification receipt drift',
);
const records = new Map(evidenceManifest.assets.map((asset) => [asset.assetId, asset]));
const certifications = new Map(certification.records.map((record) => [record.assetId, record]));
if (records.size !== allowlist.assets.length || certifications.size !== allowlist.assets.length) {
  throw new Error('evidence inventory does not match its allowlist and certification receipt');
}

for (const asset of allowlist.assets) {
  const record = records.get(asset.assetId);
  if (!record) throw new Error(`${asset.assetId}: committed evidence record is missing`);
  const sourceBytes = await readFile(path.join(repositoryRoot, asset.sourcePath));
  const receiptBytes = await readFile(path.join(repositoryRoot, asset.receipt));
  const sourceHash = sha256(sourceBytes);
  const receiptHash = sha256(receiptBytes);
  assertEvidenceBinding(asset, sourceHash, receiptHash);
  assertReceiptCertification(
    asset,
    JSON.parse(receiptBytes.toString('utf8')),
    asset.receiptAssertion,
    certifications.get(asset.assetId),
  );
  assertEqual(record.sourceSha256, sourceHash, `${asset.assetId} manifest source drift`);
  assertEqual(record.receiptSha256, receiptHash, `${asset.assetId} manifest receipt drift`);
  const sourceGitBlobSha = execFileSync('git', ['rev-parse', `HEAD:${asset.sourcePath}`], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }).trim();
  assertEqual(record.sourceGitBlobSha, sourceGitBlobSha, `${asset.assetId} source Git blob drift`);
  const published = await readFile(path.join(evidenceRoot, 'original', `${asset.assetId}.png`));
  assertEqual(sha256(published), record.sha256, `${asset.assetId} published original drift`);
  records.delete(asset.assetId);
  certifications.delete(asset.assetId);
}
if (records.size !== 0 || certifications.size !== 0) {
  throw new Error('unallowlisted evidence records remain');
}

console.log(
  `Verified ${apiArtifacts.artifactFileCount} packed API files and ` +
  `${evidenceArtifacts.artifactFileCount} evidence files against committed manifests.`,
);
