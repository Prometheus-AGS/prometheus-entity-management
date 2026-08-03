#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  buildReleaseCandidateManifest,
  createReleaseCommandAdapters,
  rehearseReleaseCandidate,
  resolveCandidateBundlePath,
  runReleaseCommand,
  stageReleaseCandidate,
  validateRehearsalForStaging,
} from "./release-candidate-pipeline.mjs";

const [command, ...rawArguments] = process.argv.slice(2);

try {
  const argumentsByName = parseArguments(rawArguments);
  if (command === "plan") {
    const output = resolve(required(argumentsByName, "output"));
    const manifest = await candidateManifest(argumentsByName);
    await writeJson(output, manifest);
    process.stdout.write(`candidate manifest written: ${output}\n`);
  } else if (command === "rehearse") {
    const outputDirectory = resolve(required(argumentsByName, "output-dir"));
    const packageDirectory = resolve(outputDirectory, "packages");
    await mkdir(packageDirectory, { recursive: true });
    const manifest = await candidateManifest(argumentsByName);
    const adapters = createReleaseCommandAdapters({
      root: process.cwd(),
      candidateDirectory: packageDirectory,
      runCommand: runReleaseCommand,
    });
    const report = await rehearseReleaseCandidate(manifest, adapters);
    await writeJson(resolve(outputDirectory, "manifest.json"), manifest);
    await writeJson(resolve(outputDirectory, "rehearsal.json"), report);
    process.stdout.write(`candidate rehearsal complete without registry mutation: ${outputDirectory}\n`);
  } else if (command === "stage") {
    const manifestPath = resolve(required(argumentsByName, "manifest"));
    const rehearsalPath = resolve(required(argumentsByName, "rehearsal"));
    const output = resolve(required(argumentsByName, "output"));
    const manifest = await readJson(manifestPath);
    const rehearsal = await readJson(rehearsalPath);
    const rehearsedCandidates = validateRehearsalForStaging(manifest, rehearsal);
    const candidates = Object.fromEntries(
      manifest.npm.publishOrder.map((packageName) => {
        const packed = rehearsedCandidates[packageName];
        return [
          packageName,
          {
            path: resolveCandidateBundlePath(dirname(manifestPath), packed.bundlePath),
            integrity: packed.integrity,
          },
        ];
      }),
    );
    const adapters = createReleaseCommandAdapters({
      root: process.cwd(),
      candidateDirectory: dirname(manifestPath),
      runCommand: runReleaseCommand,
      allowMutation: true,
      env: process.env,
    });
    const report = await stageReleaseCandidate(manifest, candidates, adapters, {
      onProgress: async (progressReport) => await writeJson(output, progressReport),
    });
    await writeJson(output, report);
    process.stdout.write(`RC packages staged under ${manifest.release.distTag}: ${output}\n`);
  } else {
    throw new Error(
      "usage: release-candidate.mjs <plan|rehearse|stage> [command options]",
    );
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

function parseArguments(argumentsList) {
  const result = {};
  for (let index = 0; index < argumentsList.length; index += 2) {
    const flag = argumentsList[index];
    const value = argumentsList[index + 1];
    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(`invalid argument sequence near ${flag ?? "<end>"}`);
    }
    result[flag.slice(2)] = value;
  }
  return result;
}

function required(argumentsByName, name) {
  const value = argumentsByName[name];
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

async function candidateManifest(argumentsByName) {
  return await buildReleaseCandidateManifest({
    root: process.cwd(),
    sourceSha: required(argumentsByName, "source-sha"),
    createdAt: required(argumentsByName, "created-at"),
  });
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
