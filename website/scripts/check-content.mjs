import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(filePath);
    else files.push(filePath);
  }
}

await walk(path.join(root, 'docs'));
await walk(path.join(root, 'src'));

const failures = [];
for (const file of files) {
  if (!/\.(md|mdx|ts|tsx|css)$/.test(file)) continue;
  const content = await readFile(file, 'utf8');
  if (/\/(Users|home|private\/tmp)\//.test(content)) {
    failures.push(`${path.relative(root, file)} contains an internal absolute path`);
  }
  if (/\b(TODO|TBD|lorem ipsum|placeholder)\b/i.test(content)) {
    failures.push(`${path.relative(root, file)} contains placeholder content`);
  }
  if (/(?:NPM_TOKEN|NODE_AUTH_TOKEN)\s*[:=]\s*[^}\s]|_authToken\s*=/.test(content)) {
    failures.push(`${path.relative(root, file)} contains a token-shaped string`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Documentation content contract passed for ${files.length} files.`);
}
