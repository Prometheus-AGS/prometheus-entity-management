import {lstat, readFile, realpath, rm} from 'node:fs/promises';
import path from 'node:path';

function isWithin(parent, target) {
  return target === parent || target.startsWith(`${parent}${path.sep}`);
}

export async function assertContainedDirectory(anchor, target) {
  const anchorPath = path.resolve(anchor);
  const targetPath = path.resolve(target);
  if (targetPath === anchorPath || !isWithin(anchorPath, targetPath)) {
    throw new Error(`refusing directory outside containment anchor: ${targetPath}`);
  }

  const relative = path.relative(anchorPath, targetPath);
  let current = anchorPath;
  for (const segment of ['', ...relative.split(path.sep)]) {
    if (segment) current = path.join(current, segment);
    const stats = await lstat(current);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error(`refusing symbolic or non-directory path component: ${current}`);
    }
  }

  const [anchorReal, targetReal] = await Promise.all([realpath(anchorPath), realpath(targetPath)]);
  if (!isWithin(anchorReal, targetReal)) {
    throw new Error(`refusing directory outside real containment anchor: ${targetReal}`);
  }
}

export async function removeContainedDirectory(anchor, target) {
  try {
    await assertContainedDirectory(anchor, target);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  await rm(path.resolve(target), {recursive: true});
}

export async function removeOwnedDirectory({anchor, target, markerName, ownerToken}) {
  await assertContainedDirectory(anchor, target);
  const marker = path.join(path.resolve(target), markerName);
  const markerStats = await lstat(marker);
  if (
    markerStats.isSymbolicLink()
    || !markerStats.isFile()
    || (await readFile(marker, 'utf8')) !== ownerToken
  ) {
    throw new Error(`refusing cleanup of unowned directory: ${target}`);
  }
  await removeContainedDirectory(anchor, target);
}
