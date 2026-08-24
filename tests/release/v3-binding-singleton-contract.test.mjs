import assert from "node:assert/strict";
import test from "node:test";

import { validateBindingSingletonPolicy } from "../../scripts/verify-binding-singletons.mjs";

const corePackageName = "@prometheus-ags/entity-graph-core";
const bindingNames = [
  "@prometheus-ags/prometheus-entity-management",
  "@prometheus-ags/entity-graph-svelte",
  "@prometheus-ags/entity-graph-solid",
  "@prometheus-ags/entity-graph-web-components",
  "@prometheus-ags/entity-graph-alpine",
  "@prometheus-ags/entity-graph-htmx",
];
const releasePackages = [
  corePackageName,
  "@prometheus-ags/entity-graph-sdl",
  ...bindingNames,
  "@prometheus-ags/entity-graph-flutter",
  "@prometheus-ags/entity-graph-flutter-riverpod",
  "@prometheus-ags/entity-graph-tauri",
  "@prometheus-ags/entity-graph-a2ui",
];

function validPolicy() {
  return {
    sourceManifests: Object.fromEntries(bindingNames.map((name) => [name, {
      name,
      peerDependencies: { [corePackageName]: "workspace:^" },
      devDependencies: { [corePackageName]: "workspace:*" },
    }])),
    packedManifests: Object.fromEntries(bindingNames.map((name) => [name, {
      name,
      peerDependencies: { [corePackageName]: "^3.0.0-alpha.0" },
      devDependencies: { [corePackageName]: "3.0.0-alpha.0" },
    }])),
    fixedGroups: [[...releasePackages]],
    releasePackages: [...releasePackages],
    coreVersion: "3.0.0-alpha.0",
  };
}

test("binding singleton policy accepts required workspace peers that pack to compatible semver", () => {
  assert.doesNotThrow(() => validateBindingSingletonPolicy(validPolicy()));
});

test("a private production core copy fails closed", () => {
  const policy = validPolicy();
  policy.sourceManifests[bindingNames[0]].dependencies = { [corePackageName]: "workspace:*" };
  assert.throws(
    () => validateBindingSingletonPolicy(policy),
    /core must not be a production dependency/,
  );

  const packed = validPolicy();
  packed.packedManifests[bindingNames[0]].dependencies = { [corePackageName]: "3.0.0-alpha.0" };
  assert.throws(
    () => validateBindingSingletonPolicy(packed),
    /packed manifest installs a private core copy/,
  );
});

test("missing, weakened, or optional source peer policy fails closed", () => {
  const missingPeer = validPolicy();
  delete missingPeer.sourceManifests[bindingNames[0]].peerDependencies[corePackageName];
  assert.throws(
    () => validateBindingSingletonPolicy(missingPeer),
    /source core peer must be workspace:\^/,
  );

  const missingDevelopmentCore = validPolicy();
  delete missingDevelopmentCore.sourceManifests[bindingNames[0]].devDependencies[corePackageName];
  assert.throws(
    () => validateBindingSingletonPolicy(missingDevelopmentCore),
    /source core development dependency must be workspace:\*/,
  );

  const optionalPeer = validPolicy();
  optionalPeer.sourceManifests[bindingNames[0]].peerDependenciesMeta = {
    [corePackageName]: { optional: true },
  };
  assert.throws(
    () => validateBindingSingletonPolicy(optionalPeer),
    /core peer must be required, not optional/,
  );
});

test("packed manifests reject workspace leakage and ranges outside the candidate", () => {
  const workspaceLeak = validPolicy();
  workspaceLeak.packedManifests[bindingNames[0]].peerDependencies[corePackageName] = "workspace:^";
  assert.throws(
    () => validateBindingSingletonPolicy(workspaceLeak),
    /packed core peer is not a publishable semver range/,
  );

  const excludedCandidate = validPolicy();
  excludedCandidate.packedManifests[bindingNames[0]].peerDependencies[corePackageName] = "^4.0.0";
  assert.throws(
    () => validateBindingSingletonPolicy(excludedCandidate),
    /does not accept candidate core 3\.0\.0-alpha\.0/,
  );

  const developmentLeak = validPolicy();
  developmentLeak.packedManifests[bindingNames[0]].devDependencies[corePackageName] = "workspace:*";
  assert.throws(
    () => validateBindingSingletonPolicy(developmentLeak),
    /packed development metadata leaks workspace protocol/,
  );
});

test("fixed release group drift fails before packing or publication", () => {
  const policy = validPolicy();
  policy.fixedGroups = [[...releasePackages.slice(1)]];
  assert.throws(
    () => validateBindingSingletonPolicy(policy),
    /exactly one fixed group matching the 12-package npm release contract/,
  );

  const duplicate = validPolicy();
  duplicate.fixedGroups = [[...releasePackages], [...releasePackages]];
  assert.throws(
    () => validateBindingSingletonPolicy(duplicate),
    /exactly one fixed group matching the 12-package npm release contract/,
  );
});
