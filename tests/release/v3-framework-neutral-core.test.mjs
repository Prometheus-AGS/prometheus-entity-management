import assert from "node:assert/strict";
import test from "node:test";

import {
  collectDependencyNames,
  validateFrameworkNeutralArtifact,
} from "../../scripts/verify-framework-neutral-core.mjs";

const validArtifact = {
  manifest: {
    name: "@prometheus-ags/entity-graph-core",
    dependencies: { zustand: "^5.0.0", immer: "^11.0.0" },
  },
  runtimeFiles: {
    "dist/index.mjs": 'import { createStore } from "zustand/vanilla";',
    "dist/index.cjs": 'var vanilla = require("zustand/vanilla");',
  },
  declarationFiles: {
    "dist/index.d.ts": 'import type { StoreApi } from "zustand/vanilla";',
    "dist/index.d.cts": 'import type { StoreApi } from "zustand/vanilla";',
  },
  dependencyNames: ["@prometheus-ags/entity-graph-core", "immer", "zustand"],
};

test("framework-neutral artifact validation accepts vanilla Zustand output", () => {
  assert.doesNotThrow(() => validateFrameworkNeutralArtifact(validArtifact));
});

test("framework-neutral artifact validation fails on manifest or resolved React dependencies", () => {
  assert.throws(
    () => validateFrameworkNeutralArtifact({
      ...validArtifact,
      manifest: { ...validArtifact.manifest, dependencies: { react: "^19.0.0" } },
    }),
    /manifest declares forbidden React dependency: react/,
  );
  assert.throws(
    () => validateFrameworkNeutralArtifact({
      ...validArtifact,
      dependencyNames: [...validArtifact.dependencyNames, "@types/react"],
    }),
    /dependency graph resolves forbidden React package: @types\/react/,
  );
});

test("framework-neutral artifact validation fails on runtime imports and declaration types", () => {
  assert.throws(
    () => validateFrameworkNeutralArtifact({
      ...validArtifact,
      runtimeFiles: { "dist/index.mjs": 'import { useSyncExternalStore } from "react";' },
    }),
    /contains a React runtime import/,
  );
  assert.throws(
    () => validateFrameworkNeutralArtifact({
      ...validArtifact,
      declarationFiles: { "dist/index.d.ts": 'import type { ReactNode } from "react";' },
    }),
    /contains a React type dependency/,
  );
  assert.throws(
    () => validateFrameworkNeutralArtifact({
      ...validArtifact,
      declarationFiles: { "dist/index.d.ts": "type Renderer = React.ComponentType<{}>;" },
    }),
    /contains a React type dependency/,
  );
});

test("dependency collection traverses pnpm's nested dependency graph", () => {
  assert.deepEqual(
    collectDependencyNames([{ name: "fixture", dependencies: {
      "@prometheus-ags/entity-graph-core": {
        dependencies: { zustand: { dependencies: { immer: {} } } },
      },
    } }]),
    ["@prometheus-ags/entity-graph-core", "fixture", "immer", "zustand"],
  );
});
