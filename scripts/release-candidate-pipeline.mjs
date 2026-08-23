import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Resolve a tarball recorded by the rehearsal job inside a freshly downloaded
 * candidate bundle. Absolute paths and traversal are rejected because the
 * rehearsal and stage jobs run in different runner workspaces.
 */
export function resolveCandidateBundlePath(bundleRoot, bundlePath) {
  assert(typeof bundlePath === "string" && bundlePath, "candidate bundle path is required");
  const rootPath = resolve(bundleRoot);
  const candidatePath = resolve(rootPath, bundlePath);
  const relativePath = relative(rootPath, candidatePath);
  const insideBundle =
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(bundlePath) &&
    !isAbsolute(relativePath);
  const insidePackages =
    relativePath.startsWith(`packages${sep}`) && relativePath.endsWith(".tgz");
  assert(
    insideBundle && insidePackages,
    "candidate tarball must remain inside the downloaded candidate bundle packages directory",
  );
  return candidatePath;
}

/**
 * Enforce the semantic boundary between alpha development packages and a
 * release candidate. The channel is policy-owned and the numeric identifier is
 * required so every immutable retry addresses one exact candidate version.
 */
export function assertReleaseCandidateVersion(targetVersion, candidateVersion, channel) {
  assert(targetVersion && candidateVersion && channel, "candidate version inputs are required");
  if (channel === "stable") {
    assert(
      candidateVersion === targetVersion && !candidateVersion.includes("-"),
      `stable candidate version ${candidateVersion} must equal ${targetVersion} exactly, with no prerelease suffix`,
    );
    return candidateVersion;
  }
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expected = new RegExp(`^${escape(targetVersion)}-${escape(channel)}\\.[0-9]+$`);
  assert(
    expected.test(candidateVersion),
    `candidate version ${candidateVersion} must use a numbered ${channel} prerelease for ${targetVersion}`,
  );
  return candidateVersion;
}

/**
 * Return a deterministic dependency-first order for release artifacts.
 *
 * Only dependencies present in `artifacts` participate in the graph. External
 * packages are registry prerequisites, not nodes in this release transaction.
 */
export function topologicalOrder(artifacts) {
  const byName = new Map();
  for (const artifact of artifacts) {
    assert(typeof artifact.name === "string" && artifact.name, "artifact name is required");
    assert(!byName.has(artifact.name), `duplicate release artifact ${artifact.name}`);
    byName.set(artifact.name, artifact);
  }

  const dependants = new Map([...byName.keys()].map((name) => [name, new Set()]));
  const remainingDependencies = new Map();
  for (const [name, artifact] of byName) {
    const dependencies = new Set(
      (artifact.internalDependencies ?? []).filter((dependency) => byName.has(dependency)),
    );
    remainingDependencies.set(name, dependencies);
    for (const dependency of dependencies) dependants.get(dependency).add(name);
  }

  const ready = [...byName.keys()]
    .filter((name) => remainingDependencies.get(name).size === 0)
    .sort();
  const ordered = [];
  while (ready.length > 0) {
    const name = ready.shift();
    ordered.push(name);
    for (const dependant of [...dependants.get(name)].sort()) {
      const dependencies = remainingDependencies.get(dependant);
      dependencies.delete(name);
      if (dependencies.size === 0 && !ordered.includes(dependant) && !ready.includes(dependant)) {
        ready.push(dependant);
        ready.sort();
      }
    }
  }

  if (ordered.length !== byName.size) {
    const cycle = [...byName.keys()].filter((name) => !ordered.includes(name)).sort();
    throw new Error(`dependency cycle: ${cycle.join(", ")}`);
  }
  return ordered;
}

/**
 * Build the immutable input manifest consumed by candidate rehearsal and RC
 * staging. This function performs no network or registry mutation.
 */
export async function buildReleaseCandidateManifest({
  root = new URL("..", import.meta.url),
  sourceSha,
  createdAt,
} = {}) {
  assert(/^[0-9a-f]{40}$/i.test(sourceSha ?? ""), "sourceSha must be a 40-character git SHA");
  assert(!Number.isNaN(Date.parse(createdAt ?? "")), "createdAt must be an ISO timestamp");

  const rootPath = normalizeRoot(root);
  const contract = await readJson(join(rootPath, "release/v3-release-contract.json"));
  const policy = await readJson(join(rootPath, "release/release-candidate-policy.json"));
  const workspaceManifest = await readJson(join(rootPath, "package.json"));
  assert(workspaceManifest.private === true, "workspace root must remain private");
  assert(
    !contract.versionPolicy.npm.packages.includes(workspaceManifest.name),
    "workspace root cannot be part of the public npm release set",
  );
  assert(
    contract.versionPolicy.npm.prereleaseTag !== contract.versionPolicy.npm.stableTag,
    "candidate and stable npm tags must differ",
  );
  assert(policy.candidate.publicationAuthorized === false, "RC policy cannot pre-authorize publication");
  assert(policy.candidate.latestMutationAllowed === false, "RC policy cannot authorize npm latest");

  const npmNames = new Set(contract.versionPolicy.npm.packages);
  const npmArtifacts = [];
  for (const artifact of contract.artifacts.filter(({ ecosystem }) => ecosystem === "npm")) {
    const packageManifest = await readJson(join(rootPath, artifact.path, "package.json"));
    assert(packageManifest.name === artifact.packageName, `${artifact.id}: package name drift`);
    assert(packageManifest.private !== true, `${artifact.packageName}: release package cannot be private`);
    const internalDependencies = internalPackageDependencies(packageManifest, npmNames);
    npmArtifacts.push({
      id: artifact.id,
      ecosystem: "npm",
      packageName: artifact.packageName,
      path: artifact.path,
      registry: artifact.registry,
      registryDecision: artifact.registryDecision,
      version: packageManifest.version,
      internalDependencies,
    });
  }

  assert(npmArtifacts.length === npmNames.size, "npm artifact count does not match the fixed group");
  const versions = new Set(npmArtifacts.map(({ version }) => version));
  assert(versions.size === 1, "fixed npm packages must share one candidate version");
  const [candidateVersion] = versions;
  const stablePromotion = policy.stablePromotion ?? {};
  const isStable = candidateVersion === contract.release.version;
  if (isStable) {
    assert(
      stablePromotion.requiresExplicitHumanAuthority === true,
      "stable promotion requires explicit human authority",
    );
    assert(stablePromotion.npmAction, "stable promotion npm action is required");
    assert(stablePromotion.environment, "stable promotion environment is required");
  }
  const channel = isStable ? "stable" : policy.candidate.channel;
  const distTag = isStable
    ? contract.versionPolicy.npm.stableTag
    : contract.versionPolicy.npm.prereleaseTag;
  const npmAction = isStable ? stablePromotion.npmAction : policy.candidate.npmAction;
  assertReleaseCandidateVersion(contract.release.version, candidateVersion, channel);
  for (const artifact of npmArtifacts) {
    artifact.distTag = distTag;
    artifact.action = npmAction;
  }

  const publishOrder = topologicalOrder(
    npmArtifacts.map(({ packageName: name, internalDependencies }) => ({
      name,
      internalDependencies,
    })),
  );
  const npmByName = new Map(npmArtifacts.map((artifact) => [artifact.packageName, artifact]));
  const orderedNpmArtifacts = publishOrder.map((name) => npmByName.get(name));

  const nativeArtifacts = [];
  for (const artifact of contract.artifacts.filter(({ ecosystem }) => ecosystem !== "npm")) {
    const action = policy.native[artifact.id];
    assert(action, `${artifact.id}: native release disposition is required`);
    nativeArtifacts.push({
      id: artifact.id,
      ecosystem: artifact.ecosystem,
      packageName: artifact.packageName,
      path: artifact.path,
      registry: artifact.registry,
      registryDecision: artifact.registryDecision,
      version: await readNativeVersion(rootPath, artifact),
      action,
    });
  }

  return {
    schemaVersion: "1.0.0",
    source: {
      contract: "release/v3-release-contract.json",
      policy: "release/release-candidate-policy.json",
      sha: sourceSha,
      createdAt,
    },
    release: {
      targetVersion: contract.release.version,
      candidateVersion,
      channel,
      distTag,
      stableTag: contract.versionPolicy.npm.stableTag,
    },
    publication: {
      authorized: false,
      latestMutationAllowed: false,
      stablePromotionChange: policy.stablePromotion.change,
      authorityEnvironment: isStable ? stablePromotion.environment : "npm-rc",
    },
    npm: {
      publishOrder,
      action: policy.candidate.npmAction,
      trustedPublishing: policy.trustedPublishing,
    },
    protectedTags: {
      names: [contract.versionPolicy.npm.stableTag],
      snapshotRequired: policy.rehearsal.protectedTagSnapshotRequired,
    },
    recovery: policy.recovery,
    artifacts: [...orderedNpmArtifacts, ...nativeArtifacts],
  };
}

/**
 * Classify an exact package version before a retry. Registry errors are not
 * treated as absence; callers must pass `null` only for an authoritative 404.
 */
export function classifyRegistryVersion(candidate, registryVersion) {
  assert(candidate?.packageName, "candidate packageName is required");
  assert(candidate?.version, "candidate version is required");
  assert(candidate?.integrity, "candidate integrity is required");
  if (registryVersion === null) {
    return { classification: "absent", action: "submit" };
  }
  assert(
    registryVersion?.version === candidate.version,
    `registry returned unexpected version for ${candidate.packageName}@${candidate.version}`,
  );
  assert(
    typeof registryVersion.integrity === "string" && registryVersion.integrity,
    `registry integrity is missing for ${candidate.packageName}@${candidate.version}`,
  );
  if (registryVersion.integrity !== candidate.integrity) {
    throw new Error(
      `immutable registry conflict for ${candidate.packageName}@${candidate.version}: ` +
        `${registryVersion.integrity} != ${candidate.integrity}`,
    );
  }
  return { classification: "matching", action: "skip-and-record" };
}

const RECOVERY_STATES = Object.freeze([
  "declared",
  "packed",
  "verified",
  "classified",
  "submitted",
  "registry-verified",
  "complete",
]);

/**
 * Prove that the portable rehearsal is complete, internally consistent, and
 * covers the exact manifest before any mutating staging adapter is created.
 * Returns the immutable packed-candidate evidence keyed by package name.
 */
export function validateRehearsalForStaging(manifest, rehearsal) {
  assert(manifest?.schemaVersion === "1.0.0", "candidate manifest schema is unsupported");
  assert(rehearsal?.schemaVersion === "1.0.0", "rehearsal schema is unsupported");
  assert(rehearsal.registryMutation === false, "rehearsal must record no registry mutation");
  assert(rehearsal.protectedTags?.unchanged === true, "rehearsal must preserve protected tags");
  assertProtectedTagsUnchanged(
    rehearsal.protectedTags.before,
    rehearsal.protectedTags.after,
    manifest.protectedTags?.names?.[0] ?? "latest",
  );

  const journal = rehearsal.journal;
  assert(journal?.schemaVersion === "1.0.0", "rehearsal journal schema is unsupported");
  assert(journal.sourceSha === manifest.source.sha, "rehearsal SHA does not match the candidate manifest");
  assert(
    journal.candidateVersion === manifest.release.candidateVersion,
    "rehearsal candidate version does not match the candidate manifest",
  );
  assert(journal.distTag === manifest.release.distTag, "rehearsal dist-tag does not match the candidate manifest");
  assertExactStringArray(journal.order, manifest.npm.publishOrder, "rehearsal publish order");

  const npmArtifacts = manifest.artifacts.filter(({ ecosystem }) => ecosystem === "npm");
  const npmByName = new Map(npmArtifacts.map((artifact) => [artifact.packageName, artifact]));
  assertExactStringArray(
    Object.keys(journal.artifacts ?? {}).sort(),
    [...manifest.npm.publishOrder].sort(),
    "rehearsal journal artifacts",
  );
  assertExactStringArray(
    Object.keys(rehearsal.protectedTags.before ?? {}).sort(),
    [...manifest.npm.publishOrder].sort(),
    "protected tag package set",
  );

  const receiptById = uniqueRecordsById(rehearsal.receipts, "rehearsal receipts");
  const packedCandidates = {};
  for (const packageName of manifest.npm.publishOrder) {
    const expected = npmByName.get(packageName);
    const actual = journal.artifacts[packageName];
    assert(expected, `manifest publish order references unknown npm artifact ${packageName}`);
    assert(actual?.id === expected.id, `${packageName}: rehearsal artifact id does not match manifest`);
    assert(actual.packageName === packageName, `${packageName}: rehearsal package name does not match manifest`);
    assertExactStringArray(
      actual.dependencies,
      expected.internalDependencies,
      `${packageName}: rehearsal dependencies`,
    );
    assert(actual.state === "complete", `${packageName}: rehearsal journal is not complete`);
    assertExactStringArray(
      actual.history?.map(({ state }) => state),
      RECOVERY_STATES,
      `${packageName}: rehearsal state history`,
    );

    const evidence = Object.fromEntries(
      actual.history.map((entry) => [entry.state, entry.evidence]),
    );
    assert(
      evidence.declared?.sourceSha === manifest.source.sha,
      `${packageName}: declared source SHA is invalid`,
    );
    assert(
      typeof evidence.packed?.bundlePath === "string" && evidence.packed.bundlePath,
      `${packageName}: packed bundlePath is required`,
    );
    resolveCandidateBundlePath("/candidate-bundle", evidence.packed.bundlePath);
    assert(
      typeof evidence.packed.integrity === "string" && evidence.packed.integrity,
      `${packageName}: packed integrity is required`,
    );
    assert(
      evidence.verified?.gate === "npm-publish-dry-run",
      `${packageName}: verified gate must be npm-publish-dry-run`,
    );
    assert(
      typeof evidence.verified.receipt === "string" && evidence.verified.receipt,
      `${packageName}: npm dry-run receipt is required`,
    );
    assert(
      evidence.classified?.classification === "absent" &&
        evidence.classified?.scope === "disposable-dry-run-registry",
      `${packageName}: rehearsal registry classification is invalid`,
    );
    assert(
      evidence.submitted?.outcome === "dry-run-no-upload" &&
        evidence.submitted?.receipt === evidence.verified.receipt,
      `${packageName}: rehearsal submission evidence is invalid`,
    );
    assert(
      evidence["registry-verified"]?.registry === "disposable-dry-run-registry" &&
        evidence["registry-verified"]?.registryIntegrity === evidence.packed.integrity,
      `${packageName}: rehearsal registry evidence does not match packed integrity`,
    );
    assert(
      evidence.complete?.receipt === evidence.verified.receipt,
      `${packageName}: completion receipt does not match the npm dry run`,
    );

    const receipt = receiptById.get(expected.id);
    assert(receipt, `${expected.id}: rehearsal receipt is missing`);
    assert(receipt.receipt === evidence.verified.receipt, `${expected.id}: rehearsal receipt does not match journal`);
    assert(receipt.integrity === evidence.packed.integrity, `${expected.id}: rehearsal receipt integrity does not match journal`);
    packedCandidates[packageName] = {
      bundlePath: evidence.packed.bundlePath,
      integrity: evidence.packed.integrity,
    };
  }

  const expectedDryRunIds = manifest.artifacts
    .filter(({ ecosystem, action }) => ecosystem !== "npm" && action === "dry-run-only")
    .map(({ id }) => id)
    .sort();
  const expectedEmbeddedIds = manifest.artifacts
    .filter(({ ecosystem, action }) => ecosystem !== "npm" && action === "embedded-in-npm")
    .map(({ id }) => id)
    .sort();
  const expectedReceiptIds = [...npmArtifacts.map(({ id }) => id), ...expectedDryRunIds].sort();
  assertExactStringArray([...receiptById.keys()].sort(), expectedReceiptIds, "rehearsal receipt artifact set");
  for (const id of expectedDryRunIds) {
    const receipt = receiptById.get(id);
    assert(typeof receipt?.receipt === "string" && receipt.receipt, `${id}: native dry-run receipt is required`);
    assert(!Object.hasOwn(receipt, "integrity"), `${id}: native dry-run receipt cannot claim npm integrity`);
  }

  const skippedById = uniqueRecordsById(rehearsal.skipped, "rehearsal skipped artifacts");
  assertExactStringArray([...skippedById.keys()].sort(), expectedEmbeddedIds, "embedded native artifact set");
  for (const id of expectedEmbeddedIds) {
    assert(skippedById.get(id)?.reason === "embedded-in-npm", `${id}: embedded disposition is invalid`);
  }
  return packedCandidates;
}

/**
 * Validate the authoritative JSON emitted by `npm stage publish --json`.
 * npm returns its registry-issued stage UUID together with the tarball SRI;
 * both must agree with the immutable rehearsed candidate.
 */
export function validateStagedNpmResult(candidate, stagedResult) {
  assert(candidate?.packageName, "staged candidate packageName is required");
  assert(candidate?.version, "staged candidate version is required");
  assert(candidate?.integrity, "staged candidate integrity is required");
  assert(stagedResult?.receipt, `${candidate.packageName}: staging receipt is required`);
  assert(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      stagedResult.stageId ?? "",
    ),
    `${candidate.packageName}: registry-issued stageId is required`,
  );
  assert(
    stagedResult.packageName === candidate.packageName,
    `${candidate.packageName}: staged package name differs from the candidate`,
  );
  assert(
    stagedResult.version === candidate.version,
    `${candidate.packageName}: staged version differs from the candidate`,
  );
  assert(
    typeof stagedResult.integrity === "string" && stagedResult.integrity,
    `${candidate.packageName}: staged integrity is required`,
  );
  assert(
    stagedResult.integrity === candidate.integrity,
    `${candidate.packageName}: staged integrity differs from the rehearsed candidate`,
  );
  return stagedResult;
}

export function createRecoveryJournal(manifest) {
  assert(Array.isArray(manifest?.npm?.publishOrder), "manifest npm publish order is required");
  const npmArtifacts = manifest.artifacts.filter(({ ecosystem }) => ecosystem === "npm");
  const byName = new Map(npmArtifacts.map((artifact) => [artifact.packageName, artifact]));
  assert(
    manifest.npm.publishOrder.every((name) => byName.has(name)),
    "manifest publish order references an unknown npm artifact",
  );
  return {
    schemaVersion: "1.0.0",
    sourceSha: manifest.source.sha,
    candidateVersion: manifest.release.candidateVersion,
    distTag: manifest.release.distTag,
    order: [...manifest.npm.publishOrder],
    artifacts: Object.fromEntries(
      manifest.npm.publishOrder.map((name) => {
        const artifact = byName.get(name);
        return [
          name,
          {
            id: artifact.id,
            packageName: name,
            dependencies: [...artifact.internalDependencies],
            state: "declared",
            history: [{ state: "declared", evidence: { sourceSha: manifest.source.sha } }],
          },
        ];
      }),
    ),
  };
}

export function advanceRecoveryJournal(journal, packageName, nextState, evidence) {
  const artifact = journal?.artifacts?.[packageName];
  assert(artifact, `unknown journal artifact ${packageName}`);
  assert(evidence && typeof evidence === "object", `${nextState} evidence is required`);
  const currentIndex = RECOVERY_STATES.indexOf(artifact.state);
  const nextIndex = RECOVERY_STATES.indexOf(nextState);
  assert(nextIndex >= 0, `unknown recovery state ${nextState}`);
  assert(
    nextIndex === currentIndex + 1,
    `invalid recovery transition ${artifact.state} -> ${nextState}`,
  );

  if (nextState === "packed") assert(evidence.integrity, "packed integrity is required");
  if (nextState === "verified") assert(evidence.gate, "verified gate evidence is required");
  if (nextState === "classified") {
    assert(
      ["absent", "matching", "conflicting"].includes(evidence.classification),
      "registry classification evidence is required",
    );
    assert(evidence.classification !== "conflicting", "conflicting registry version blocks recovery");
  }
  if (nextState === "submitted") {
    assert(evidence.outcome, "submission outcome evidence is required");
    for (const dependency of artifact.dependencies) {
      assert(
        journal.artifacts[dependency]?.state === "complete",
        `dependency ${dependency} is not complete`,
      );
    }
  }
  if (nextState === "registry-verified") {
    assert(evidence.registryIntegrity, "registry verification integrity is required");
  }
  if (nextState === "complete") assert(evidence.receipt, "completion receipt is required");

  const nextJournal = structuredClone(journal);
  nextJournal.artifacts[packageName].state = nextState;
  nextJournal.artifacts[packageName].history.push({ state: nextState, evidence });
  return nextJournal;
}

export function assertProtectedTagsUnchanged(before, after, tag = "latest") {
  assert(before && after, "protected tag snapshots are required");
  const beforeNames = Object.keys(before).sort();
  const afterNames = Object.keys(after).sort();
  for (const packageName of beforeNames) {
    assert(
      Object.hasOwn(after, packageName),
      `protected tag snapshot missing package ${packageName}`,
    );
    assert(
      Object.hasOwn(before[packageName], tag) && Object.hasOwn(after[packageName], tag),
      `protected tag snapshot missing ${tag} for ${packageName}`,
    );
    const previous = before[packageName][tag];
    const current = after[packageName][tag];
    assert(
      previous === current,
      `protected npm tag changed: ${packageName} ${tag} ${previous} -> ${current}`,
    );
  }
  for (const packageName of afterNames) {
    assert(
      Object.hasOwn(before, packageName),
      `protected tag snapshot contains unexpected package ${packageName}`,
    );
  }
}

/**
 * Exercise the complete candidate plan using only pack and dry-run adapters.
 * The adapters are injected so tests and CI can use real commands without
 * coupling the state machine to a particular process runner.
 */
export async function rehearseReleaseCandidate(manifest, adapters) {
  assert(manifest.publication?.authorized === false, "rehearsal cannot use a publication-authorized manifest");
  assert(
    manifest.publication?.latestMutationAllowed === false,
    "rehearsal cannot allow npm latest mutation",
  );
  for (const name of ["snapshotTags", "packNpm", "dryRunNpm", "dryRunNative"]) {
    assert(typeof adapters?.[name] === "function", `${name} adapter is required`);
  }

  const before = await adapters.snapshotTags(manifest);
  let journal = createRecoveryJournal(manifest);
  const receipts = [];
  const npmByName = new Map(
    manifest.artifacts
      .filter(({ ecosystem }) => ecosystem === "npm")
      .map((artifact) => [artifact.packageName, artifact]),
  );
  for (const packageName of manifest.npm.publishOrder) {
    const artifact = npmByName.get(packageName);
    assert(artifact, `publish order references unknown artifact ${packageName}`);
    const candidate = await adapters.packNpm(artifact, manifest);
    assert(candidate?.path, `${packageName}: packed candidate path is required`);
    assert(candidate?.bundlePath, `${packageName}: bundle-relative candidate path is required`);
    assert(candidate?.integrity, `${packageName}: packed candidate integrity is required`);
    journal = advanceRecoveryJournal(journal, packageName, "packed", {
      bundlePath: candidate.bundlePath,
      integrity: candidate.integrity,
    });
    const dryRun = await adapters.dryRunNpm(artifact, candidate, manifest);
    assert(dryRun?.receipt, `${packageName}: npm dry-run receipt is required`);
    journal = advanceRecoveryJournal(journal, packageName, "verified", {
      gate: "npm-publish-dry-run",
      receipt: dryRun.receipt,
    });
    journal = advanceRecoveryJournal(journal, packageName, "classified", {
      classification: "absent",
      scope: "disposable-dry-run-registry",
    });
    journal = advanceRecoveryJournal(journal, packageName, "submitted", {
      outcome: "dry-run-no-upload",
      receipt: dryRun.receipt,
    });
    journal = advanceRecoveryJournal(journal, packageName, "registry-verified", {
      registryIntegrity: candidate.integrity,
      registry: "disposable-dry-run-registry",
    });
    journal = advanceRecoveryJournal(journal, packageName, "complete", {
      receipt: dryRun.receipt,
    });
    receipts.push({ id: artifact.id, receipt: dryRun.receipt, integrity: candidate.integrity });
  }

  const skipped = [];
  for (const artifact of manifest.artifacts.filter(({ ecosystem }) => ecosystem !== "npm")) {
    if (artifact.action === "embedded-in-npm") {
      skipped.push({ id: artifact.id, reason: "embedded-in-npm" });
      continue;
    }
    assert(artifact.action === "dry-run-only", `${artifact.id}: unsupported rehearsal action ${artifact.action}`);
    const dryRun = await adapters.dryRunNative(artifact, manifest);
    assert(dryRun?.receipt, `${artifact.id}: native dry-run receipt is required`);
    receipts.push({ id: artifact.id, receipt: dryRun.receipt });
  }

  const after = await adapters.snapshotTags(manifest);
  assertProtectedTagsUnchanged(before, after);
  return {
    schemaVersion: "1.0.0",
    registryMutation: false,
    protectedTags: { before, after, unchanged: true },
    journal,
    receipts,
    skipped,
  };
}

/**
 * Stage an already rehearsed RC in dependency order. Exact versions already
 * present with matching integrity are recovery skips; any mismatch blocks.
 */
export async function stageReleaseCandidate(manifest, candidates, adapters, { onProgress } = {}) {
  for (const name of ["assertStageAuthority", "snapshotTags", "lookupNpmVersion", "stageNpm"]) {
    assert(typeof adapters?.[name] === "function", `${name} adapter is required`);
  }
  assert(onProgress === undefined || typeof onProgress === "function", "onProgress must be a function");
  let journal = createRecoveryJournal(manifest);
  const staged = [];
  const attempts = [];
  let before;
  let after;
  const npmByName = new Map(
    manifest.artifacts
      .filter(({ ecosystem }) => ecosystem === "npm")
      .map((artifact) => [artifact.packageName, artifact]),
  );

  const report = (status, error) => ({
    schemaVersion: "1.0.0",
    status,
    registryMutation: attempts.length > 0 || staged.length > 0,
    staged: [...staged],
    attempts: attempts.map((attempt) => ({ ...attempt })),
    latestUnchanged:
      status === "complete" ? manifest.release?.channel !== "stable" : null,
    protectedTags: { before: before ?? null, after: after ?? null },
    journal,
    ...(error ? { error: { name: error.name, message: error.message } } : {}),
  });
  const persist = async (status = "in-progress", error) => {
    const progressReport = report(status, error);
    if (onProgress) await onProgress(progressReport);
    return progressReport;
  };
  const advance = async (packageName, state, evidence) => {
    journal = advanceRecoveryJournal(journal, packageName, state, evidence);
    await persist();
  };

  try {
    await adapters.assertStageAuthority(manifest);
    before = await adapters.snapshotTags(manifest);
    await persist();
    for (const packageName of manifest.npm.publishOrder) {
      const artifact = npmByName.get(packageName);
      const candidate = candidates[packageName];
      assert(artifact, `publish order references unknown artifact ${packageName}`);
      assert(candidate?.path && candidate?.integrity, `${packageName}: rehearsed candidate is required`);
      await advance(packageName, "packed", candidate);
      await advance(packageName, "verified", {
        gate: "candidate-rehearsal",
        integrity: candidate.integrity,
      });

      const registryVersion = await adapters.lookupNpmVersion(artifact, manifest);
      const classification = classifyRegistryVersion(
        {
          packageName,
          version: artifact.version,
          integrity: candidate.integrity,
        },
        registryVersion,
      );
      await advance(packageName, "classified", {
        classification: classification.classification,
      });

      let receipt;
      let outcome;
      if (classification.classification === "matching") {
        receipt = `registry-match:${packageName}@${artifact.version}`;
        outcome = "skipped-matching";
      } else {
        attempts.push({ packageName, state: "attempting" });
        await persist();
        const rawStagedResult = await adapters.stageNpm(artifact, candidate, manifest);
        attempts[attempts.length - 1] = {
          packageName,
          state: "responded",
          receipt: rawStagedResult?.receipt ?? null,
          stageId: rawStagedResult?.stageId ?? null,
          integrity: rawStagedResult?.integrity ?? null,
        };
        await persist();
        const stagedResult = validateStagedNpmResult(
          { packageName, version: artifact.version, integrity: candidate.integrity },
          rawStagedResult,
        );
        attempts[attempts.length - 1] = {
          packageName,
          state: "validated",
          receipt: stagedResult.receipt,
          stageId: stagedResult.stageId,
          integrity: stagedResult.integrity,
        };
        receipt = stagedResult.receipt;
        outcome = "staged";
        staged.push(packageName);
        await persist();
        await advance(packageName, "submitted", {
          outcome,
          receipt,
          stageId: stagedResult.stageId,
        });
        await advance(packageName, "registry-verified", {
          registryIntegrity: stagedResult.integrity,
          stageId: stagedResult.stageId,
          authority: "npm-stage-publish-response",
          receipt,
        });
        await advance(packageName, "complete", { receipt });
        continue;
      }
      await advance(packageName, "submitted", { outcome, receipt });
      await advance(packageName, "registry-verified", {
        registryIntegrity: candidate.integrity,
        authority: "npm-public-registry-lookup",
        receipt,
      });
      await advance(packageName, "complete", { receipt });
    }

    after = await adapters.snapshotTags(manifest);
    if (manifest.release?.channel === "stable") {
      assertStableTagsPromoted(before, after, manifest.release.candidateVersion);
    } else {
      assertProtectedTagsUnchanged(before, after);
    }
    return await persist("complete");
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    const failureReport = report("failed", failure);
    Object.defineProperty(failure, "recoveryReport", {
      value: failureReport,
      configurable: true,
      enumerable: false,
    });
    if (onProgress) {
      try {
        await onProgress(failureReport);
      } catch (persistenceError) {
        Object.defineProperty(failure, "persistenceError", {
          value: persistenceError,
          configurable: true,
          enumerable: false,
        });
      }
    }
    throw failure;
  }
}

/**
 * Validate the external authority boundary before a mutating npm stage call.
 * A green rehearsal never satisfies this boundary on its own.
 */
export function assertRcStageAuthority(manifest, env) {
  assert(
    manifest.release?.channel !== "stable",
    "RC staging cannot use a stable-channel manifest",
  );
  assert(env.GITHUB_ACTIONS === "true", "GitHub Actions is required for RC staging");
  assert(
    env.PROMETHEUS_RELEASE_ENVIRONMENT === "npm-rc",
    "the protected npm-rc environment is required",
  );
  assert(
    env.PROMETHEUS_RELEASE_AUTHORITY === "stage-rc",
    "explicit stage-rc authority is required",
  );
  assert(
    env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
    "GitHub OIDC request credentials are required",
  );
  assert(
    !env.NODE_AUTH_TOKEN && !env.NPM_TOKEN,
    "long-lived npm write tokens are forbidden",
  );
  assert(
    manifest.release.distTag !== manifest.release.stableTag &&
      manifest.release.distTag !== "latest",
    "RC staging cannot target npm latest",
  );
  const candidateSha = env.PROMETHEUS_RELEASE_CANDIDATE_SHA || env.GITHUB_SHA;
  assert(
    /^[0-9a-f]{40}$/i.test(candidateSha ?? ""),
    "authorized candidate SHA must be a full Git commit",
  );
  assert(
    candidateSha === manifest.source.sha,
    "authorized candidate SHA does not match the candidate manifest",
  );
  assert(manifest.publication.latestMutationAllowed === false, "candidate manifest must protect npm latest");
  return {
    authorizedAction: "npm stage publish",
    environment: "npm-rc",
    distTag: manifest.release.distTag,
    sourceSha: candidateSha,
  };
}

/**
 * Validate the external authority boundary before a mutating stable publish.
 * Stable promotion moves npm latest, so it requires the dedicated npm-stable
 * environment and an explicit stage-stable authority flag; a green RC
 * rehearsal or RC authority never satisfies this boundary.
 */
export function assertStableStageAuthority(manifest, env) {
  assert(
    manifest.release?.channel === "stable",
    "stable staging requires a stable-channel manifest",
  );
  assert(env.GITHUB_ACTIONS === "true", "GitHub Actions is required for stable staging");
  assert(
    env.PROMETHEUS_RELEASE_ENVIRONMENT === "npm-stable",
    "the protected npm-stable environment is required",
  );
  assert(
    env.PROMETHEUS_RELEASE_AUTHORITY === "stage-stable",
    "explicit stage-stable authority is required",
  );
  assert(
    env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
    "GitHub OIDC request credentials are required",
  );
  assert(
    !env.NODE_AUTH_TOKEN && !env.NPM_TOKEN,
    "long-lived npm write tokens are forbidden",
  );
  assert(
    manifest.release.distTag === manifest.release.stableTag &&
      manifest.release.distTag === "latest",
    "stable staging must target npm latest exactly",
  );
  assert(
    env.GITHUB_SHA === manifest.source.sha,
    "workflow SHA does not match the stable manifest",
  );
  return {
    authorizedAction: "npm stable publish",
    environment: "npm-stable",
    distTag: manifest.release.distTag,
  };
}

export function assertStageAuthorityForChannel(manifest, env) {
  return manifest.release?.channel === "stable"
    ? assertStableStageAuthority(manifest, env)
    : assertRcStageAuthority(manifest, env);
}

/**
 * Stable promotion is the one flow allowed to move a protected tag: after a
 * stable stage, every published package's latest tag must equal the staged
 * version exactly — no more, no less.
 */
export function assertStableTagsPromoted(before, after, targetVersion, tag = "latest") {
  assert(before && after, "protected tag snapshots are required");
  assert(/^\d+\.\d+\.\d+$/.test(targetVersion ?? ""), "targetVersion must be an exact stable version");
  const beforeNames = Object.keys(before).sort();
  const afterNames = Object.keys(after).sort();
  assert(
    JSON.stringify(beforeNames) === JSON.stringify(afterNames),
    "stable promotion cannot add or remove packages",
  );
  for (const packageName of beforeNames) {
    const promoted = after[packageName]?.[tag];
    assert(
      promoted === targetVersion,
      `stable promotion incomplete: ${packageName} ${tag} is ${promoted ?? "missing"}, expected ${targetVersion}`,
    );
  }
}

export function createReleaseCommandAdapters({
  root,
  candidateDirectory,
  runCommand,
  allowMutation = false,
  env: releaseEnvironment = process.env,
}) {
  const rootPath = normalizeRoot(root);
  const candidatePath = resolve(candidateDirectory);
  assert(typeof runCommand === "function", "runCommand is required");

  return {
    assertStageAuthority(manifest, authorityEnvironment = releaseEnvironment) {
      return assertStageAuthorityForChannel(manifest, authorityEnvironment);
    },

    async snapshotTags(manifest) {
      const snapshot = {};
      for (const artifact of manifest.artifacts.filter(({ ecosystem }) => ecosystem === "npm")) {
        const result = await runCommand(
          "npm",
          ["view", artifact.packageName, "dist-tags", "--json"],
          { cwd: rootPath, mutation: false },
        );
        snapshot[artifact.packageName] = parseJsonOutput(result.stdout, artifact.packageName);
      }
      return snapshot;
    },

    async packNpm(artifact) {
      const result = await runCommand(
        "pnpm",
        ["--dir", join(rootPath, artifact.path), "pack", "--pack-destination", candidatePath, "--json"],
        { cwd: rootPath, mutation: false },
      );
      const output = parseJsonOutput(result.stdout, `${artifact.packageName} pack`);
      const packed = Array.isArray(output) ? output.at(-1) : output;
      assert(packed?.filename, `${artifact.packageName}: pnpm pack did not return a filename`);
      const tarballPath = join(candidatePath, basename(packed.filename));
      const integrity =
        packed.integrity ??
        `sha512-${createHash("sha512").update(await readFile(tarballPath)).digest("base64")}`;
      return {
        path: tarballPath,
        bundlePath: join("packages", basename(packed.filename)),
        integrity,
      };
    },

    async lookupNpmVersion(artifact) {
      const result = await runCommand(
        "npm",
        [
          "view",
          `${artifact.packageName}@${artifact.version}`,
          "version",
          "dist.integrity",
          "--json",
        ],
        { cwd: rootPath, mutation: false, acceptedExitCodes: [1] },
      );
      if (result.code === 1) {
        const code = parseNpmRegistryErrorCode(result);
        if (code === "E404") return null;
        throw new Error(
          `${artifact.packageName}@${artifact.version}: registry lookup failed with ${code ?? "unknown"}`,
        );
      }
      const registry = parseJsonOutput(
        result.stdout,
        `${artifact.packageName}@${artifact.version} registry lookup`,
      );
      return {
        version: registry.version,
        integrity: registry.dist?.integrity ?? registry["dist.integrity"],
      };
    },

    async dryRunNpm(artifact, candidate) {
      const result = await runCommand(
        "npm",
        [
          "publish",
          candidate.path,
          "--dry-run",
          "--tag",
          artifact.distTag,
          "--access",
          "public",
          "--json",
        ],
        { cwd: rootPath, mutation: false },
      );
      return { receipt: compactReceipt(result.stdout) };
    },

    async dryRunNative(artifact) {
      if (artifact.ecosystem === "dart") {
        const result = await runCommand("flutter", ["pub", "publish", "--dry-run"], {
          cwd: join(rootPath, artifact.path),
          mutation: false,
        });
        return { receipt: compactReceipt(result.stdout) };
      }
      if (artifact.ecosystem === "rust") {
        const result = await runCommand(
          "cargo",
          ["publish", "--dry-run", "--manifest-path", join(rootPath, artifact.path, "Cargo.toml")],
          { cwd: rootPath, mutation: false },
        );
        return { receipt: compactReceipt(result.stdout, result.stderr) };
      }
      throw new Error(`${artifact.id}: unsupported native ecosystem ${artifact.ecosystem}`);
    },

    async stageNpm(artifact, candidate, manifest, authorityEnvironment = releaseEnvironment) {
      assertStageAuthorityForChannel(manifest, authorityEnvironment);
      const result = await runCommand(
        "npm",
        [
          "stage",
          "publish",
          candidate.path,
          "--tag",
          artifact.distTag,
          "--access",
          "public",
          "--json",
        ],
        {
          cwd: rootPath,
          mutation: true,
          allowMutation,
          env: authorityEnvironment,
        },
      );
      const output = parseJsonOutput(result.stdout, `${artifact.packageName} stage publish`);
      const staged = output?.[artifact.packageName] ?? output;
      return {
        packageName: staged?.name,
        version: staged?.version,
        integrity: staged?.integrity,
        stageId: staged?.stageId,
        receipt: compactReceipt(result.stdout),
      };
    },
  };
}

export async function runReleaseCommand(command, args, options = {}) {
  const potentiallyMutating =
    command === "npm" &&
    ((args[0] === "publish" && !args.includes("--dry-run")) ||
      (args[0] === "stage" && args[1] === "publish"));
  if (potentiallyMutating && options.mutation !== true) {
    throw new Error("potentially mutating npm command was not declared as mutation");
  }
  if (options.mutation === true && options.allowMutation !== true) {
    throw new Error("mutating release command requires allowMutation");
  }

  const timeoutMs = options.timeoutMs ?? 15 * 60 * 1000;
  assert(Number.isSafeInteger(timeoutMs) && timeoutMs > 0, "release command timeout must be positive");
  return await new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      rejectCommand(
        new Error(`release command timed out after ${timeoutMs}ms: ${command} ${args.join(" ")}`),
      );
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timeout);
      rejectCommand(new Error(`release command could not start: ${command}: ${error.message}`));
    });
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0 || options.acceptedExitCodes?.includes(code)) {
        resolveCommand({ stdout, stderr, code });
        return;
      }
      rejectCommand(
        new Error(
          `release command failed (${code ?? signal ?? "unknown"}): ${command} ${args.join(" ")}\n${stderr}`,
        ),
      );
    });
  });
}

function compactReceipt(...channels) {
  const value = channels.map((channel) => channel.trim()).filter(Boolean).join("\n");
  assert(value, "release command returned an empty receipt");
  return value;
}

function parseJsonOutput(stdout, label) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${label}: command did not return JSON: ${error.message}`, { cause: error });
  }
}

function parseNpmRegistryErrorCode({ stdout = "", stderr = "" }) {
  const channels = [stdout, stderr].filter((value) => typeof value === "string" && value.trim());
  for (const channel of channels) {
    try {
      const parsed = JSON.parse(channel);
      const code = parsed?.error?.code ?? parsed?.code;
      if (typeof code === "string" && code.trim()) return code.trim().toUpperCase();
    } catch {
      // npm can emit human-readable errors even when --json was requested.
    }
  }

  const plainText = channels.join("\n");
  const plainTextCode =
    plainText.match(/\bcode\s+(E[A-Z0-9_]+)\b/i)?.[1] ??
    plainText.match(/\b(E\d{3})\b/i)?.[1] ??
    plainText.match(/npm\s+(?:ERR!|error)\s+(E[A-Z][A-Z0-9_]*)\b/i)?.[1];
  return plainTextCode?.toUpperCase();
}

function assertExactStringArray(actual, expected, label) {
  assert(Array.isArray(actual), `${label} must be an array`);
  assert(Array.isArray(expected), `${label} expectation must be an array`);
  assert(
    actual.length === expected.length && actual.every((value, index) => value === expected[index]),
    `${label} does not match the candidate manifest`,
  );
}

function uniqueRecordsById(records, label) {
  assert(Array.isArray(records), `${label} must be an array`);
  const byId = new Map();
  for (const record of records) {
    assert(typeof record?.id === "string" && record.id, `${label} contains an invalid artifact id`);
    assert(!byId.has(record.id), `${label} contains duplicate artifact ${record.id}`);
    byId.set(record.id, record);
  }
  return byId;
}

function internalPackageDependencies(manifest, npmNames) {
  const result = new Set();
  for (const section of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    for (const name of Object.keys(manifest[section] ?? {})) {
      if (npmNames.has(name)) result.add(name);
    }
  }
  return [...result].sort();
}

async function readNativeVersion(rootPath, artifact) {
  if (artifact.ecosystem === "dart") {
    const pubspec = await readFile(join(rootPath, artifact.path, "pubspec.yaml"), "utf8");
    const version = pubspec.match(/^version:\s*([^\s#]+)/m)?.[1];
    assert(version, `${artifact.id}: pubspec version is required`);
    return version;
  }
  if (artifact.ecosystem === "rust") {
    const cargo = await readFile(join(rootPath, artifact.path, "Cargo.toml"), "utf8");
    const afterPackageHeader = cargo.split(/^\[package\]\s*$/m)[1] ?? "";
    const packageSection = afterPackageHeader.split(/^\[[^\n]+\]\s*$/m)[0] ?? "";
    const version = packageSection.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
    assert(version, `${artifact.id}: Cargo package version is required`);
    return version;
  }
  throw new Error(`${artifact.id}: unsupported ecosystem ${artifact.ecosystem}`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeRoot(root) {
  if (root instanceof URL) return dirname(fileURLToPath(new URL("package.json", root)));
  return resolve(root);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
