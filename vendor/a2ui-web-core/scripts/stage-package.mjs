import {access, cp, mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const [directory] = process.argv.slice(2);
if (!directory) {
  throw new Error('Pass a new staging directory for the compiled package.');
}

const source = fileURLToPath(new URL('../', import.meta.url));
const destination = resolve(directory);
const manifest = JSON.parse(await readFile(resolve(source, 'package.json'), 'utf8'));
delete manifest.scripts;
delete manifest.private;

await access(resolve(source, 'dist/index.js'));
await access(resolve(source, 'dist/index.d.ts'));
await mkdir(destination);
await cp(resolve(source, 'dist'), resolve(destination, 'dist'), {recursive: true});
await cp(resolve(source, 'src'), resolve(destination, 'dist'), {
  recursive: true,
  filter: async entry => (await stat(entry)).isDirectory() || ['.json', '.css', '.svg'].includes(extname(entry)),
});
for (const file of ['LICENSE', 'README.md', 'CHANGELOG.md', 'ORIGIN.md']) {
  await cp(resolve(source, file), resolve(destination, file));
}
await writeFile(resolve(destination, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
