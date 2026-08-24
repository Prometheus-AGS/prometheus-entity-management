import { createHash } from "node:crypto";

export const ZERO_COMMIT = "0".repeat(40);
export const FORBIDDEN_FILTERED_PATH = /(?:^|\/)(?:\.dart_tool|build|apps?|secrets?)(?:\/|$)|(?:\.g\.dart|\.freezed\.dart|pubspec\.lock)$|ffi|gen_ui_flutter/i;

export function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function parseCommitMap(value) {
  const lines = value.trimEnd().split("\n");
  if (!/^old\s+new$/.test(lines[0]?.trim() ?? "")) return [];
  return lines.slice(1).map((line) => {
    const [original, filtered, ...extra] = line.trim().split(/\s+/);
    return {
      original,
      filtered,
      valid: extra.length === 0 && /^[a-f0-9]{40}$/.test(original ?? "") && /^[a-f0-9]{40}$/.test(filtered ?? ""),
    };
  });
}

export function parseRetainedMetadata(value) {
  return value.trimEnd().split("\n").slice(1).map((line) => {
    const [original, filtered, originalMetadata, filteredMetadata, ...extra] = line.split("\t");
    return { original, filtered, originalMetadata, filteredMetadata, valid: extra.length === 0 };
  });
}

/**
 * A normal merge preserves the destination provenance merge as an ancestor.
 * A GitHub squash merge preserves the approved file content but not that
 * ancestry. Accept the squash form only when every approved imported file is
 * byte-identical to the recorded destination merge.
 */
export function validateRepositoryHistoryBoundary({
  ancestryPreserved,
  approvedFilesUnchanged,
}) {
  if (ancestryPreserved) {
    return { valid: true, mode: "ancestry", errors: [] };
  }
  if (approvedFilesUnchanged) {
    return { valid: true, mode: "content-equivalent-squash", errors: [] };
  }
  return {
    valid: false,
    mode: "invalid",
    errors: [{
      code: "DESTINATION_HISTORY_DISCONNECTED",
      message:
        "the destination merge is not an ancestor and approved imported files differ from its recorded content",
    }],
  };
}

function sameSet(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

/**
 * Validate the portable, content-addressed portion of the Flutter source
 * provenance contract. Git object existence and merge ancestry remain the
 * responsibility of the repository verifier; this function owns the pure
 * fail-closed rules used by unit tests and BDD tamper scenarios.
 */
export function validatePortableProvenanceContract(input) {
  const errors = [];
  const add = (code, message) => errors.push({ code, message });
  const { authority, provenance, releaseContract, observations } = input;
  const knowMe = provenance.knowMe;

  if (authority.decision !== "approved-for-history-preserving-adaptation") {
    add("AUTHORITY_DECISION_INVALID", "history-preserving adaptation authority is absent");
  }
  if (authority.sources?.[0]?.revision !== knowMe.sourceRevision) {
    add("SOURCE_REVISION_MISMATCH", "authority and provenance source revisions differ");
  }
  if (authority.historyPolicy?.dirtyTreeImportAllowed !== false || observations.dirtyWorktreeImported !== false) {
    add("DIRTY_IMPORT_ALLOWED", "dirty working-tree content is not provably excluded");
  }
  if (!String(knowMe.filterMethod).includes("fresh-disposable")) {
    add("FILTER_METHOD_INVALID", "the filter was not rooted in a fresh disposable clone");
  }

  if (!sameSet(observations.filteredPaths, knowMe.approvedFiles)) {
    add("FILTERED_PATH_SET_MISMATCH", "the filtered tree differs from the approved file allowlist");
  }
  const forbidden = observations.filteredPaths.filter((path) => FORBIDDEN_FILTERED_PATH.test(path));
  if (forbidden.length > 0) {
    add("FORBIDDEN_FILTERED_PATH", `forbidden filtered paths: ${forbidden.join(", ")}`);
  }
  if (!sameSet(observations.mergeDelta, knowMe.approvedFiles)) {
    add("MERGE_DELTA_MISMATCH", "the destination merge delta differs from the approved file allowlist");
  }

  const mappings = parseCommitMap(observations.commitMapText);
  const retained = mappings.filter(({ filtered }) => filtered !== ZERO_COMMIT);
  const metadata = parseRetainedMetadata(observations.metadataText);
  if (mappings.length !== knowMe.commitMap.sourceCommitsExamined || mappings.some(({ valid }) => !valid)) {
    add("COMMIT_MAP_COUNT_MISMATCH", "the complete source-to-filter commit map is malformed or incomplete");
  }
  if (retained.length !== knowMe.commitMap.retainedCommits) {
    add("RETAINED_COMMIT_COUNT_MISMATCH", "the retained filtered commit count differs from the manifest");
  }
  const retainedKeys = new Set(retained.map(({ original, filtered }) => `${original}:${filtered}`));
  const metadataKeys = new Set(metadata.map(({ original, filtered }) => `${original}:${filtered}`));
  if (
    metadata.length !== retained.length
    || metadata.some(({ valid, originalMetadata, filteredMetadata }) => !valid || originalMetadata !== filteredMetadata)
    || !sameSet(metadataKeys, retainedKeys)
  ) {
    add("METADATA_MAPPING_MISMATCH", "retained commits do not have one unchanged original-to-filtered metadata row each");
  }
  if (mappings.find(({ original }) => original === knowMe.sourceRevision)?.filtered !== knowMe.sourceRevisionMapping) {
    add("SOURCE_HEAD_MAPPING_MISMATCH", "the recorded source HEAD mapping differs from the manifest");
  }

  if (
    observations.hashes.commitMap !== knowMe.commitMap.sha256
    || observations.hashes.metadata !== knowMe.commitMap.metadataSha256
  ) {
    add("HISTORY_HASH_MISMATCH", "commit-map or metadata evidence hash differs from the manifest");
  }
  if (!observations.licenseBodiesEqual || observations.hashes.license !== provenance.destination.licenseSha256) {
    add("LICENSE_HASH_MISMATCH", "MIT license boundaries are not identical and content-addressed");
  }
  if (observations.hashes.visual !== provenance.visualEvidence.sha256) {
    add("VISUAL_HASH_MISMATCH", "the lineage visual hash differs from the manifest");
  }

  const dartArtifacts = releaseContract.artifacts.filter(({ ecosystem }) => ecosystem === "dart");
  if (dartArtifacts.length !== 1) {
    add("CANONICAL_DART_ARTIFACT_COUNT", `expected one Dart artifact, observed ${dartArtifacts.length}`);
  }
  const canonical = dartArtifacts[0];
  if (
    canonical?.packageName !== "entity_graph_flutter"
    || canonical?.path !== "packages/entity_graph_flutter"
    || provenance.destination.canonicalDartGraphPackage.name !== "entity_graph_flutter"
    || provenance.destination.canonicalDartGraphPackage.path !== "packages/entity_graph_flutter"
  ) {
    add("CANONICAL_DART_ARTIFACT_MISMATCH", "entity_graph_flutter is not the sole expected canonical owner");
  }
  if (observations.workspaceIncludesProvenance || provenance.destination.provenanceImportMode !== "non-buildable-non-workspace-non-public") {
    add("PROVENANCE_WORKSPACE_EXPOSURE", "the provenance import is exposed as a build or publication workspace");
  }
  const decisions = new Set(knowMe.pathDecisions.map(({ decision }) => decision));
  if (!sameSet(decisions, new Set(["adapt", "reference", "reject"]))) {
    add("PATH_DECISION_MATRIX_INCOMPLETE", "adapt, reference, and reject decisions are not all explicit");
  }

  if (provenance.publicationAuthorized !== false || authority.publicationAuthorized !== false) {
    add("PUBLICATION_AUTHORIZED", "the provenance record cannot authorize pub.dev publication");
  }
  if (provenance.registryAuthorityRequiredLater !== true || canonical?.registryDecision !== "deferred") {
    add("REGISTRY_AUTHORITY_NOT_REQUIRED", "deferred registry authority must remain mandatory");
  }
  if (
    provenance.hybridMobileArchitecture.decision !== "reference-only-no-runtime-import"
    || provenance.hybridMobileArchitecture.runtimeFilesImported !== 0
  ) {
    add("HYBRID_RUNTIME_IMPORT", "hybrid-mobile architecture material was misreported as runtime source");
  }
  if (
    provenance.visualEvidence.claimsFlutterRendering !== false
    || provenance.visualEvidence.claimsAccessibilityCertification !== false
  ) {
    add("VISUAL_CLAIM_OVERREACH", "headless lineage evidence claims unperformed rendering or accessibility certification");
  }

  return { valid: errors.length === 0, errors };
}
