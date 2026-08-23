import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const websiteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const docsRoot = path.join(websiteRoot, 'docs');
const output = path.join(websiteRoot, 'static/search-index.json');

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(child));
    else if (/\.mdx?$/.test(entry.name)) files.push(child);
  }
  return files;
}

function routeFor(file) {
  const relative = path.relative(docsRoot, file).replace(/\.mdx?$/, '').split(path.sep);
  if (relative.at(-1) === 'index') relative.pop();
  return `/docs/3.x/${relative.join('/')}${relative.length ? '/' : ''}`;
}

function searchableText(markdown) {
  return markdown
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/^import .*$/gm, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!??\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#|{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const records = [];
for (const file of (await markdownFiles(docsRoot)).toSorted()) {
  const markdown = await readFile(file, 'utf8');
  const frontmatterTitle = markdown.match(/^---[\s\S]*?^title:\s*(.+)$/m)?.[1]?.trim();
  const headingTitle = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = frontmatterTitle ?? headingTitle;
  if (!title) throw new Error(`${path.relative(websiteRoot, file)} has no searchable title`);
  const text = searchableText(markdown);
  records.push({title, route: routeFor(file), summary: text.slice(0, 240), text});
}

await writeFile(output, `${JSON.stringify({schemaVersion: '1.0.0', records}, null, 2)}\n`);
console.log(`Generated local search index for ${records.length} documentation pages.`);
