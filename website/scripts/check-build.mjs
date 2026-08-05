import {existsSync} from 'node:fs';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const build = path.join(root, 'build');
const routes = JSON.parse(await readFile(path.join(root, 'routes.json'), 'utf8'));
const required = [
  'index.html',
  '404.html',
  '.nojekyll',
  'sitemap.xml',
  'search-index.json',
  'evidence/manifest.json',
  'api/index.html',
  'native-api/dart/index.html',
  'native-api/rust/index.html',
  'native-api/manifest.json',
  ...routes.routes.map(({path: route}) => `${route.replace(/^\//, '')}index.html`),
];
const failures = [];
for (const relative of required) {
  if (!existsSync(path.join(build, relative))) failures.push(`missing built route/artifact ${relative}`);
}

const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else files.push(file);
  }
}
await walk(build);
for (const file of files) {
  if (!/\.(html|js|json|xml|txt|css)$/.test(file)) continue;
  const content = await readFile(file, 'utf8');
  if (/\/(?:Users|home|private\/tmp)\//.test(content)) failures.push(`internal absolute path in ${path.relative(build, file)}`);
  if (!/\.(?:js|css)$/.test(file) && /\b(?:TODO|TBD|lorem ipsum)\b/i.test(content)) {
    failures.push(`unfinished content in ${path.relative(build, file)}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Built site contract passed for ${routes.routes.length} deep routes and ${files.length} files.`);
}
