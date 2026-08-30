import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultStudyDirectory = resolve(
  workspaceRoot,
  ".kbd-orchestrator/phases/v3-devtools-parity/evidence/v3-devtools-react-inspector/usability-study",
);
const expected = {
  studyId: "v3-devtools-react-inspector-formative-1",
  entity: "Order/o-1042",
  originalStatus: "pending",
  liveStatus: "approved",
  views: ["active", "all", "attention"],
};
const requiredFields = [
  "schemaVersion",
  "studyId",
  "participantId",
  "cohort",
  "consentRetainedEvidence",
  "recordedAt",
  "fixtureCommit",
  "completionTimeMs",
  "assistanceCount",
  "identifiedEntity",
  "identifiedOriginalStatus",
  "identifiedLiveStatus",
  "identifiedViews",
  "frictionCode",
  "confidence",
];
const allowedFrictionCodes = new Set([
  "none",
  "launcher",
  "entity-search",
  "dirty-state",
  "value-tabs",
  "registered-views",
  "navigation",
  "other-controlled",
]);

const options = parseArguments(process.argv.slice(2));
const studyDirectory = resolve(workspaceRoot, options.studyDirectory ?? defaultStudyDirectory);
const resultsDirectory = resolve(studyDirectory, options.resultsDirectory ?? "results");
const reportPath = resolve(
  workspaceRoot,
  options.reportPath ?? join(studyDirectory, "evaluation-report.json"),
);

if (options.readiness) {
  await validateStudyKit(studyDirectory);
  process.stdout.write(`[devtools-usability-study] READY: ${studyDirectory}\n`);
} else {
  const result = await evaluateStudy(studyDirectory, resultsDirectory);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(result.report, null, 2)}\n`);
  process.stdout.write(formatSummary(result.report, reportPath));
  if (result.report.status === "blocked") process.exitCode = 2;
  if (result.report.status === "fail") process.exitCode = 1;
}

function parseArguments(args) {
  const parsed = { readiness: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--readiness") {
      parsed.readiness = true;
      continue;
    }
    if (["--study-dir", "--results", "--report"].includes(argument)) {
      const value = args[index + 1];
      if (!value) throw new Error(`${argument} requires a path`);
      if (argument === "--study-dir") parsed.studyDirectory = value;
      if (argument === "--results") parsed.resultsDirectory = value;
      if (argument === "--report") parsed.reportPath = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown argument ${argument}`);
  }
  return parsed;
}

async function validateStudyKit(directory) {
  const requiredFiles = [
    "README.md",
    "protocol.md",
    "participant-result.schema.json",
    "participant-result.template.json",
    "recruitment-log.json",
    "results/README.md",
  ];
  await Promise.all(requiredFiles.map((path) => readFile(join(directory, path), "utf8")));
  const schema = await readJson(join(directory, "participant-result.schema.json"));
  const recruitment = await readJson(join(directory, "recruitment-log.json"));
  if (schema.properties?.studyId?.const !== expected.studyId) {
    throw new Error("participant schema studyId does not match the evaluator");
  }
  if (schema.additionalProperties !== false) {
    throw new Error("participant schema must reject additional properties");
  }
  if (recruitment.studyId !== expected.studyId || typeof recruitment.owner !== "string" || !recruitment.owner.trim()) {
    throw new Error("recruitment log must name the study and a non-empty owner");
  }
  if (recruitment.target?.total !== 12 || recruitment.target?.firstTime + recruitment.target?.oriented !== 12) {
    throw new Error("recruitment target must retain 12 participants split across both cohorts");
  }
  if (!Array.isArray(recruitment.attempts)) throw new Error("recruitment attempts must be an array");
}

async function evaluateStudy(studyRoot, resultRoot) {
  await validateStudyKit(studyRoot);
  const entries = (await readdir(resultRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name));
  const participants = [];
  const seenParticipantIds = new Set();

  for (const entry of entries) {
    const path = join(resultRoot, entry.name);
    const source = await readFile(path, "utf8");
    const record = JSON.parse(source);
    validateParticipant(record, entry.name);
    if (seenParticipantIds.has(record.participantId)) {
      throw new Error(`duplicate participantId ${record.participantId}`);
    }
    seenParticipantIds.add(record.participantId);
    const fileParticipantId = entry.name.slice(0, -".json".length);
    if (fileParticipantId !== record.participantId) {
      throw new Error(`${entry.name}: filename must match participantId ${record.participantId}`);
    }
    participants.push({
      ...record,
      sourceFile: entry.name,
      sha256: createHash("sha256").update(source).digest("hex"),
      successUnassisted: participantSucceeded(record),
    });
  }

  participants.sort((left, right) =>
    left.recordedAt.localeCompare(right.recordedAt) || left.participantId.localeCompare(right.participantId),
  );
  const cohortResults = Object.fromEntries(
    ["first-time", "oriented"].map((cohort) => {
      const selected = participants.filter((participant) => participant.cohort === cohort);
      return [cohort, {
        count: selected.length,
        medianCompletionTimeMs: selected.length > 0
          ? median(selected.map(({ completionTimeMs }) => completionTimeMs))
          : null,
      }];
    }),
  );
  const requiredSuccesses = Math.ceil(Math.max(participants.length, 12) * (10 / 12));
  const successfulParticipants = participants.filter(({ successUnassisted }) => successUnassisted).length;
  const enoughParticipants = participants.length >= 12;
  const bothCohortsPresent = cohortResults["first-time"].count > 0 && cohortResults.oriented.count > 0;
  const cohortMediansPass = bothCohortsPresent && Object.values(cohortResults)
    .every(({ medianCompletionTimeMs }) => medianCompletionTimeMs < 10_000);
  const successThresholdPass = enoughParticipants && successfulParticipants >= requiredSuccesses;
  const status = !enoughParticipants
    ? "blocked"
    : bothCohortsPresent && cohortMediansPass && successThresholdPass
      ? "pass"
      : "fail";

  return {
    report: {
      schemaVersion: 1,
      studyId: expected.studyId,
      generatedAt: new Date().toISOString(),
      status,
      evidenceKind: "retained-anonymized-human-formative-usability-study",
      automatedRunsCountAsParticipants: false,
      thresholds: {
        minimumParticipants: 12,
        minimumUnassistedSuccessRatio: "10/12",
        maximumCohortMedianCompletionTimeMsExclusive: 10_000,
        requiredCohorts: ["first-time", "oriented"],
      },
      result: {
        participantCount: participants.length,
        requiredSuccesses,
        successfulParticipants,
        bothCohortsPresent,
        cohortMediansPass,
        successThresholdPass,
        cohorts: cohortResults,
      },
      fixtureCommits: [...new Set(participants.map(({ fixtureCommit }) => fixtureCommit))],
      participants: participants.map((participant) => ({
        participantId: participant.participantId,
        cohort: participant.cohort,
        recordedAt: participant.recordedAt,
        completionTimeMs: participant.completionTimeMs,
        assistanceCount: participant.assistanceCount,
        successUnassisted: participant.successUnassisted,
        frictionCode: participant.frictionCode,
        confidence: participant.confidence,
        sourceFile: participant.sourceFile,
        sha256: participant.sha256,
      })),
    },
  };
}

function validateParticipant(record, filename) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error(`${filename}: participant result must be an object`);
  }
  const fields = Object.keys(record);
  const missing = requiredFields.filter((field) => !fields.includes(field));
  const unexpected = fields.filter((field) => !requiredFields.includes(field));
  if (missing.length > 0) throw new Error(`${filename}: missing fields ${missing.join(", ")}`);
  if (unexpected.length > 0) throw new Error(`${filename}: unexpected fields ${unexpected.join(", ")}`);
  if (record.schemaVersion !== 1 || record.studyId !== expected.studyId) {
    throw new Error(`${filename}: unsupported schemaVersion or studyId`);
  }
  if (!/^p-[a-z0-9-]{2,32}$/.test(record.participantId)) {
    throw new Error(`${filename}: participantId must be anonymized and match p-[a-z0-9-]`);
  }
  if (!["first-time", "oriented"].includes(record.cohort)) throw new Error(`${filename}: invalid cohort`);
  if (record.consentRetainedEvidence !== true) throw new Error(`${filename}: retained evidence requires consent`);
  if (!Number.isFinite(Date.parse(record.recordedAt))) throw new Error(`${filename}: invalid recordedAt`);
  if (!/^[0-9a-f]{40}$/.test(record.fixtureCommit)) throw new Error(`${filename}: invalid fixtureCommit`);
  if (!Number.isInteger(record.completionTimeMs) || record.completionTimeMs < 1 || record.completionTimeMs > 600_000) {
    throw new Error(`${filename}: completionTimeMs must be an integer from 1 through 600000`);
  }
  if (!Number.isInteger(record.assistanceCount) || record.assistanceCount < 0) {
    throw new Error(`${filename}: assistanceCount must be a non-negative integer`);
  }
  for (const field of ["identifiedEntity", "identifiedOriginalStatus", "identifiedLiveStatus"]) {
    if (record[field] !== null && typeof record[field] !== "string") throw new Error(`${filename}: ${field} must be a string or null`);
  }
  if (!Array.isArray(record.identifiedViews) || !record.identifiedViews.every((view) => typeof view === "string")) {
    throw new Error(`${filename}: identifiedViews must contain only strings`);
  }
  if (new Set(record.identifiedViews).size !== record.identifiedViews.length) {
    throw new Error(`${filename}: identifiedViews must not contain duplicates`);
  }
  if (!allowedFrictionCodes.has(record.frictionCode)) throw new Error(`${filename}: invalid frictionCode`);
  if (!Number.isInteger(record.confidence) || record.confidence < 1 || record.confidence > 5) {
    throw new Error(`${filename}: confidence must be an integer from 1 through 5`);
  }
}

function participantSucceeded(record) {
  return record.assistanceCount === 0
    && record.identifiedEntity === expected.entity
    && record.identifiedOriginalStatus === expected.originalStatus
    && record.identifiedLiveStatus === expected.liveStatus
    && sameStringSet(record.identifiedViews, expected.views);
}

function sameStringSet(actual, wanted) {
  return actual.length === wanted.length
    && [...actual].sort().every((value, index) => value === [...wanted].sort()[index]);
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function formatSummary(report, outputPath) {
  const result = report.result;
  const medians = Object.entries(result.cohorts)
    .map(([cohort, value]) => `${cohort}=${value.medianCompletionTimeMs ?? "n/a"}ms (${value.count})`)
    .join(", ");
  return [
    `[devtools-usability-study] ${report.status.toUpperCase()}`,
    `participants=${result.participantCount} successes=${result.successfulParticipants}/${result.requiredSuccesses}`,
    `cohort medians: ${medians}`,
    `report=${outputPath}`,
    "",
  ].join("\n");
}
