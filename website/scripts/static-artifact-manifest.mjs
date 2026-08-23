import {createHash} from 'node:crypto';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';

export async function hashArtifactTree(root, {exclude = []} = {}) {
  const excluded = new Set(exclude);
  const files = [];

  async function visit(directory) {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (excluded.has(relative)) continue;
      if (entry.isSymbolicLink()) {
        throw new Error(`artifact tree contains a symbolic link: ${relative}`);
      }
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        files.push({absolute, relative});
      }
    }
  }

  await visit(root);
  files.sort((left, right) => left.relative < right.relative ? -1 : left.relative > right.relative ? 1 : 0);
  const aggregate = createHash('sha256');
  for (const file of files) {
    const bytes = await readFile(file.absolute);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    aggregate.update(file.relative).update('\0').update(sha256).update('\0');
  }
  return {
    artifactFileCount: files.length,
    artifactAggregateSha256: aggregate.digest('hex'),
  };
}

export async function hashPackedApiInputs(repositoryRoot, packages) {
  const files = [];
  async function addDeclarations(directory) {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`packed API declaration tree contains a symbolic link: ${absolute}`);
      } else if (entry.isDirectory()) {
        await addDeclarations(absolute);
      } else if (entry.isFile() && /\.d\.(?:c|m)?ts$/.test(entry.name)) {
        files.push(absolute);
      }
    }
  }

  for (const declared of packages) {
    const packageRoot = path.join(repositoryRoot, declared.directory);
    files.push(path.join(packageRoot, 'package.json'), path.join(packageRoot, 'README.md'));
    await addDeclarations(path.join(packageRoot, 'dist'));
  }
  files.push(
    path.join(repositoryRoot, 'scripts/public-packages.mjs'),
    path.join(repositoryRoot, 'website/package.json'),
    path.join(repositoryRoot, 'website/scripts/generate-packed-api.mjs'),
    path.join(repositoryRoot, 'website/src/css/typedoc.css'),
  );
  files.sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const aggregate = createHash('sha256');
  for (const absolute of files) {
    const relative = path.relative(repositoryRoot, absolute).split(path.sep).join('/');
    const bytes = await readFile(absolute);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    aggregate.update(relative).update('\0').update(sha256).update('\0');
  }
  return {
    apiInputFileCount: files.length,
    apiInputAggregateSha256: aggregate.digest('hex'),
  };
}
