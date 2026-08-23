#!/usr/bin/env node

import {existsSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {PUBLIC_PACKAGES} from './public-packages.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJson = async (name) => JSON.parse(await readFile(path.join(root, name), 'utf8'));
const contract = await readJson('release/v3-release-contract.json');
const coverage = await readJson('examples/coverage.json');
const registry = await readJson('release/npm-registry-status.json');
const pubdev = await readJson('release/pubdev-registry-status.json');
const rootManifest = await readJson('package.json');
const routes = await readJson('website/routes.json');

function marker(name, content) {
  return `<!-- BEGIN GENERATED:${name} -->\n${content}\n<!-- END GENERATED:${name} -->`;
}

const artifacts = contract.artifacts.filter(({ecosystem}) => ecosystem === 'npm');
const manifestByName = new Map();
for (const declared of PUBLIC_PACKAGES) {
  manifestByName.set(declared.name, await readJson(`${declared.directory}/package.json`));
}

const packageRows = [
  '| Package | Candidate | Stability | Role |',
  '| --- | --- | --- | --- |',
  ...artifacts.map(({packageName, stability, role}) =>
    `| \`${packageName}\` | \`${manifestByName.get(packageName)?.version ?? 'missing'}\` | ${stability} | ${role} |`,
  ),
];

const releaseRows = [
  `Registry snapshot: ${registry.verifiedAt}. Expected candidate: \`${registry.expectedCandidate}\`.`,
  '',
  '| Package | `latest` | `alpha` | `next` | Release state |',
  '| --- | --- | --- | --- | --- |',
  ...Object.entries(registry.packages).map(([name, tags]) =>
    `| \`${name}\` | \`${tags.latest ?? 'absent'}\` | \`${tags.alpha ?? 'absent'}\` | \`${tags.next ?? 'absent'}\` | ${tags.candidateState} |`,
  ),
];

const pubdevConsumerSentence = pubdev.consumerVerification === 'passed'
  ? 'The published archive passed a clean consumer resolution, import, and analyzer check.'
  : 'Published consumer verification is not recorded as passed.';
const pubdevPublisherSentence = pubdev.publisherId === null
  ? 'pub.dev does not yet associate the package with a verified publisher.'
  : `Verified publisher: \`${pubdev.publisherId}\`.`;
const nativeReleaseRows = [
  `pub.dev snapshot: ${pubdev.verifiedAt}.`,
  '',
  '| Package | Version | State | Published |',
  '| --- | --- | --- | --- |',
  `| [\`${pubdev.packageName}\`](${pubdev.packageUrl}) | \`${pubdev.version}\` | ${pubdev.releaseStatus} | ${pubdev.publishedAt} |`,
  '',
  pubdevConsumerSentence,
  pubdevPublisherSentence,
];

const exampleRows = [
  '| Example | Status | Source | Verification |',
  '| --- | --- | --- | --- |',
  ...coverage.showcases.map(({id, status, path: sourcePath, runtimeEvidence}) =>
    `| ${id} | ${status} | [\`${sourcePath}\`](${sourcePath}/) | \`${runtimeEvidence.command}\` |`,
  ),
];

const scenarioRows = [
  '| Capability | Stability | Scenarios | Evidence status |',
  '| --- | --- | --- | --- |',
  ...coverage.capabilities.map(({title, stability, scenarioIds, releaseEvidence}) => {
    const states = [...new Set((releaseEvidence ?? []).map(({status}) => status))].join(', ') || 'semantic only';
    return `| ${title} | ${stability} | ${scenarioIds.map((id) => `\`${id}\``).join('<br/>')} | ${states} |`;
  }),
];

const commands = [
  ['Install', 'pnpm install --frozen-lockfile'],
  ['Site type/content contract', 'pnpm run docs:check'],
  ['Site unit contracts', 'pnpm run docs:test'],
  ['Site desktop/mobile routes', 'pnpm run docs:test:browser'],
  ['Site production build', 'pnpm run docs:build'],
  ['Packed TypeScript API', 'pnpm run docs:api'],
  ['Dart and Rust APIs', 'pnpm run docs:native-api'],
  ['README parity', 'pnpm run verify:readme-parity'],
  ['Example coverage', 'pnpm run verify:example-coverage'],
  ['Packed npm contracts', 'pnpm run verify:package-contracts'],
  ['React/Vite showcase', 'pnpm run verify:vite-react19'],
  ['Next.js showcase', 'pnpm run verify:nextjs-app-router'],
  ['Agentic A2UI showcase', 'pnpm run verify:agentic-a2ui'],
  ['Flutter workspace', 'pnpm run dart:ci'],
  ['Tauri universal contract', 'pnpm run verify:tauri-universal'],
  ['Flint portable contract', 'pnpm run verify:flint-contracts'],
  ['npm trust relationship', 'pnpm run release:npm-trust:verify'],
];
const commandRows = [
  '| Purpose | Command |', '| --- | --- |',
  ...commands.map(([purpose, command]) => `| ${purpose} | \`${command}\` |`),
];

const generated = new Map([
  ['RELEASE_TAGS', releaseRows.join('\n')],
  ['NATIVE_RELEASES', nativeReleaseRows.join('\n')],
  ['PACKAGES', packageRows.join('\n')],
  ['EXAMPLES', exampleRows.join('\n')],
  ['SCENARIOS', scenarioRows.join('\n')],
  ['COMMANDS', commandRows.join('\n')],
]);
const siteGenerated = new Map([
  ['NPM_REGISTRY_STATUS', releaseRows.join('\n')],
  ['PUBDEV_REGISTRY_STATUS', nativeReleaseRows.join('\n')],
]);

function replaceGenerated(source, blocks = generated, label = 'README') {
  for (const [name, content] of blocks) {
    const pattern = new RegExp(`<!-- BEGIN GENERATED:${name} -->[\\s\\S]*?<!-- END GENERATED:${name} -->`);
    if (!pattern.test(source)) throw new Error(`${label} is missing generated block ${name}`);
    source = source.replace(pattern, marker(name, content));
  }
  return source;
}

function verifyCommands() {
  for (const [, command] of commands) {
    const match = command.match(/^pnpm run ([^ ]+)$/);
    if (match && !rootManifest.scripts[match[1]]) throw new Error(`README command does not exist: ${command}`);
  }
}

function verifyInventory() {
  const publicNames = new Set(PUBLIC_PACKAGES.map(({name}) => name));
  const artifactNames = new Set(artifacts.map(({packageName}) => packageName));
  const registryNames = new Set(Object.keys(registry.packages));
  for (const [label, names] of [['release contract', artifactNames], ['registry status', registryNames]]) {
    if (names.size !== publicNames.size || [...publicNames].some((name) => !names.has(name))) {
      throw new Error(`${label} package inventory differs from public package inventory`);
    }
  }
  if (registry.releaseStatus === 'rc-registration-blocked' &&
      Object.values(registry.packages).some((tags) => tags.next)) {
    throw new Error('registry status says registration blocked but next already exists');
  }
  for (const [name, tags] of Object.entries(registry.packages)) {
    const published = tags.candidateState === 'published';
    // RC lines bind publication to the next tag; stable lines bind it to latest.
    const isStable = !registry.expectedCandidate.includes('-');
    const tagHoldsCandidate = (isStable ? tags.latest : tags.next) === registry.expectedCandidate;
    if (published !== tagHoldsCandidate) {
      throw new Error(`${name} candidate state conflicts with its ${isStable ? 'latest' : 'next'} tag`);
    }
  }
  const dartArtifact = contract.artifacts.find(({ecosystem}) => ecosystem === 'dart');
  if (pubdev.packageName !== dartArtifact?.packageName || pubdev.version !== contract.versionPolicy.native.version) {
    throw new Error('pub.dev status differs from the Dart release contract');
  }
  if (pubdev.releaseStatus !== 'published' || !/^[0-9a-f]{64}$/.test(pubdev.archiveSha256)) {
    throw new Error('pub.dev status is not a verified publication');
  }
  if (pubdev.consumerVerification !== 'passed') {
    throw new Error('pub.dev consumer verification has not passed');
  }
}

function verifyRoutesAndLinks(readme) {
  for (const route of routes.routes) {
    if (!existsSync(path.join(root, 'website', route.source))) throw new Error(`missing documentation route source ${route.source}`);
  }
  const links = [...readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(([, target]) => target);
  for (const target of links) {
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const clean = decodeURIComponent(target.split('#')[0]);
    if (clean && !existsSync(path.resolve(root, clean))) throw new Error(`broken README link: ${target}`);
  }
}

function verifyArchitecture(readme) {
  const architecture = 'Components → Hooks/ViewModels → Stores → Services/Adapters → External systems';
  if (!readme.replace(/\s+/g, ' ').includes(architecture)) throw new Error('README architecture flow drifted');
  for (const source of ['AGENTS.md', 'prometheus-entity-skills/_shared/references/architecture-rules.md']) {
    if (!existsSync(path.join(root, source))) throw new Error(`missing architecture authority ${source}`);
  }
}

let readme = await readFile(path.join(root, 'README.md'), 'utf8');
const expected = replaceGenerated(readme);
let releaseGuide = await readFile(path.join(root, 'website/docs/operations/release.md'), 'utf8');
const expectedReleaseGuide = replaceGenerated(releaseGuide, siteGenerated, 'release guide');
verifyCommands();
verifyInventory();
if (process.argv.includes('--write')) {
  await writeFile(path.join(root, 'README.md'), expected);
  await writeFile(path.join(root, 'website/docs/operations/release.md'), expectedReleaseGuide);
  console.log('README and release-guide generated blocks updated.');
} else {
  if (expected !== readme) throw new Error('README generated blocks are stale; run pnpm run readme:write');
  if (expectedReleaseGuide !== releaseGuide) throw new Error('release-guide registry blocks are stale; run pnpm run readme:write');
  verifyRoutesAndLinks(readme);
  verifyArchitecture(readme);
  console.log(`README parity passed for ${artifacts.length} packages, ${coverage.showcases.length} examples, ${coverage.capabilities.length} capabilities, and ${commands.length} commands.`);
}
