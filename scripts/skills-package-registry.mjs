/**
 * skills-package-registry.mjs — single inventory for skill-pack export ledgers.
 *
 * Each entry maps a ledger id to its package directory, ledger file, and dist
 * entry points. `tauri` and `dart` are intentionally absent: Tauri keeps its
 * dedicated runtime+declaration contract script
 * (`scripts/tauri-public-api-contract.mjs`) and Dart keeps
 * `scripts/dart-public-api-contract.mjs`.
 */
export const SKILL_LEDGER_PACKAGES = Object.freeze([
  {
    id: "react",
    directory: "entity-graph-react",
    ledger: "library-exports.json",
    entryPoints: [[".", "index.mjs"]],
    legacyFlag: null, // default mode for backwards compatibility
  },
  {
    id: "sync",
    directory: "entity-graph-sync",
    ledger: "sync-library-exports.json",
    entryPoints: [[".", "index.mjs"]],
    legacyFlag: "--sync",
  },
  {
    id: "a2ui",
    directory: "a2ui-react",
    ledger: "a2ui-library-exports.json",
    entryPoints: [
      [".", "index.mjs"],
      ["./ag-ui", "ag-ui.mjs"],
    ],
    legacyFlag: "--a2ui",
  },
  {
    id: "a2a",
    directory: "entity-graph-a2a",
    ledger: "a2a-library-exports.json",
    entryPoints: [
      [".", "index.mjs"],
      ["./legacy", "legacy.mjs"],
    ],
    legacyFlag: "--a2a",
  },
  {
    id: "core",
    directory: "entity-graph-core",
    ledger: "core-library-exports.json",
    entryPoints: [
      [".", "index.mjs"],
      ["./devtools", "devtools.mjs"],
    ],
  },
  {
    id: "svelte",
    directory: "entity-graph-svelte",
    ledger: "svelte-library-exports.json",
    entryPoints: [[".", "index.mjs"]],
  },
  {
    id: "solid",
    directory: "entity-graph-solid",
    ledger: "solid-library-exports.json",
    entryPoints: [[".", "index.mjs"]],
  },
  {
    id: "alpine",
    directory: "entity-graph-alpine",
    ledger: "alpine-library-exports.json",
    entryPoints: [[".", "index.mjs"]],
  },
  {
    id: "htmx",
    directory: "entity-graph-htmx",
    ledger: "htmx-library-exports.json",
    entryPoints: [[".", "index.mjs"]],
  },
  {
    id: "web-components",
    directory: "entity-graph-web-components",
    ledger: "web-components-library-exports.json",
    entryPoints: [[".", "index.mjs"]],
  },
  {
    id: "sdl",
    directory: "entity-graph-sdl",
    ledger: "sdl-library-exports.json",
    entryPoints: [[".", "index.mjs"]],
  },
]);

/** Resolve the selected ledger entry from argv (`--pkg <id>` or a legacy flag). */
export function resolveLedgerPackage(argv) {
  const pkgFlag = argv.indexOf("--pkg");
  const legacy = SKILL_LEDGER_PACKAGES.filter(
    (p) => p.legacyFlag && argv.includes(p.legacyFlag),
  );
  if (pkgFlag >= 0) {
    const id = argv[pkgFlag + 1];
    const found = SKILL_LEDGER_PACKAGES.find((p) => p.id === id);
    if (!found) {
      throw new Error(
        `Unknown --pkg "${id}". Known ids: ${SKILL_LEDGER_PACKAGES.map((p) => p.id).join(", ")}`,
      );
    }
    if (legacy.length > 0) throw new Error("Choose --pkg OR a legacy flag, not both.");
    return found;
  }
  if (legacy.length > 1) throw new Error("Choose exactly one package mode.");
  if (legacy.length === 1) return legacy[0];
  return SKILL_LEDGER_PACKAGES[0]; // react default
}
