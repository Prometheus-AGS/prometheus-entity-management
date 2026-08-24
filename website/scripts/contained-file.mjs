import {realpath, stat} from 'node:fs/promises';
import path from 'node:path';

function isWithin(anchor, candidate) {
  return candidate === anchor || candidate.startsWith(`${anchor}${path.sep}`);
}

export async function resolveContainedFile(anchor, candidate) {
  try {
    const anchorReal = await realpath(anchor);
    const candidateReal = await realpath(candidate);
    if (!isWithin(anchorReal, candidateReal)) return null;
    const metadata = await stat(candidateReal);
    if (metadata.isFile()) return candidateReal;
    if (!metadata.isDirectory()) return null;
    const indexReal = await realpath(path.join(candidateReal, 'index.html'));
    if (!isWithin(anchorReal, indexReal)) return null;
    const indexMetadata = await stat(indexReal);
    return indexMetadata.isFile() ? indexReal : null;
  } catch {
    return null;
  }
}
