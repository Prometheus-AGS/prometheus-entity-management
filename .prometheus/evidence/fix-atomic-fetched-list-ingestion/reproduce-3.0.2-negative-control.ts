import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const graphSource = process.argv[2];
const sourceSha = process.argv[3];

if (!graphSource || !sourceSha) {
  throw new Error("usage: tsx reproduce-3.0.2-negative-control.ts <graph.ts> <source-sha>");
}

async function main() {
  const sourceRoot = resolve(dirname(graphSource), "../../..");
  const headSha = execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const tagSha = execFileSync("git", ["-C", sourceRoot, "rev-parse", "v3.0.2^{commit}"], {
    encoding: "utf8",
  }).trim();
  if (headSha !== sourceSha || tagSha !== sourceSha) {
    throw new Error(`source mismatch: HEAD=${headSha} v3.0.2=${tagSha} expected=${sourceSha}`);
  }

  const graphModule = await import(pathToFileURL(resolve(graphSource)).href) as {
    createGraphStore: () => {
      subscribe: (listener: () => void) => () => void;
      getState: () => {
        upsertEntities: (
          type: string,
          entries: Array<{ id: string; data: Record<string, unknown> }>,
        ) => void;
        setEntityFetched: (type: string, id: string) => void;
        setListResult: (
          key: string,
          ids: string[],
          meta: { total: number; hasNextPage: boolean },
        ) => void;
      };
    };
  };

  const rowCount = 7_248;
  const entries = Array.from({ length: rowCount }, (_, index) => ({
    id: `row-${index}`,
    data: { id: `row-${index}`, value: index },
  }));
  const store = graphModule.createGraphStore();
  let successPublications = 0;
  const unsubscribe = store.subscribe(() => { successPublications += 1; });

  const state = store.getState();
  state.upsertEntities("Row", entries);
  for (const { id } of entries) state.setEntityFetched("Row", id);
  state.setListResult("rows", entries.map(({ id }) => id), {
    total: rowCount,
    hasNextPage: false,
  });
  unsubscribe();

  const result = {
    sourceRelease: "3.0.2",
    sourceSha,
    rows: rowCount,
    successPublications,
    expectedNPlus2: rowCount + 2,
  };

  console.log(JSON.stringify(result));

  if (successPublications !== rowCount + 2) {
    process.exitCode = 1;
  }
}

void main();
