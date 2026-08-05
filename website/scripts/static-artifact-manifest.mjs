import {execFileSync} from 'node:child_process';
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

export async function hashTrackedInputs(repositoryRoot, directories) {
  const output = execFileSync('git', ['ls-files', '-z', '--', ...directories], {
    cwd: repositoryRoot,
    encoding: 'buffer',
  });
  const files = output.toString('utf8').split('\0').filter(Boolean);
  files.sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const aggregate = createHash('sha256');
  for (const relative of files) {
    const bytes = await readFile(path.join(repositoryRoot, relative));
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    aggregate.update(relative).update('\0').update(sha256).update('\0');
  }
  return {
    sourceFileCount: files.length,
    sourceAggregateSha256: aggregate.digest('hex'),
  };
}
