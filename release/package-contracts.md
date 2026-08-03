# Packed npm package contracts

The `v3-package-module-contracts` quality gate certifies the installable shape of all twelve public npm candidates. It answers a narrower question than the main CI baseline: can a consumer install the exact tarballs planned for publication and resolve their runtime and type entry points without workspace aliases or previously published alpha artifacts?

## What is implemented

Every public npm package uses the shared build contract in `scripts/tsup-package-config.ts` and publishes one conditional root entry point:

| Consumer | Runtime | Declaration |
|---|---|---|
| ESM / `import` | `dist/index.mjs` | `dist/index.d.ts` |
| CommonJS / `require` | `dist/index.cjs` | `dist/index.d.cts` |

Each manifest includes consistent author, MIT license, supported Node engine, monorepo repository directory, package homepage, issue tracker, README, changelog, and an explicit payload allowlist.

The Tauri npm package intentionally embeds only:

- the JavaScript distribution and package documentation;
- `rust-plugin/Cargo.toml` and `rust-plugin/build.rs`;
- `rust-plugin/src/`;
- permission manifests and schemas under `rust-plugin/permissions/`;
- Android Kotlin/Gradle sources under `rust-plugin/android/`;
- iOS Swift Package sources under `rust-plugin/ios/`.

Its Cargo lockfile, build outputs, application-owned `tauri.conf.json`, generated
host capability schemas, and unrelated source trees are excluded. The packed
Rust host test consumes this exact boundary; application configuration and
webview capability assignment remain the host application's responsibility.

## Reproduce the gate

Run from the repository root with the supported pnpm toolchain:

```bash
pnpm install --frozen-lockfile
pnpm run verify:package-contracts
```

The command builds the twelve public packages and then, for every candidate:

1. runs `pnpm pack` into a temporary artifact directory;
2. rejects missing runtime/declaration files, unintended payloads, workspace protocols, absolute file dependencies, and developer-local paths;
3. runs Publint in strict mode;
4. runs Are The Types Wrong using its strict profile;
5. installs all twelve tarballs into one isolated consumer, overriding every internal dependency coordinate with the corresponding candidate tarball;
6. executes Node ESM and CommonJS consumers;
7. type-checks TypeScript NodeNext, Node16, and Bundler consumers with `skipLibCheck: false`.

The tarball overrides are essential. Without them, a package manager may install an older registry build for a nested internal dependency, mixing candidates with the published alpha and invalidating the result.

## Supporting checks

```bash
pnpm run test:package-contracts
pnpm run bdd:package-contracts
```

The Node suite carries fail-closed mutation tests for loader and declaration drift, payload expansion, local-path leakage, candidate-set mixing, and Lit declaration rewriting. The Cucumber feature runs the real packed verifier once and reuses its machine-readable result across the package scenarios.

The Tauri candidate additionally compiles and runs a real registered desktop IPC
host directly from its unpacked npm tarball. That narrower platform proof and
the remaining Android/iOS lane are documented in
[`tauri-mobile-plugin.md`](tauri-mobile-plugin.md); source presence does not
substitute for mobile runtime certification.

## Explicit certification limits

This gate does not certify:

- one core singleton across every binding;
- framework behavior, native Flutter/Tauri runtime behavior, or mobile runners beyond the packed Tauri crate's host compilation check;
- the five required showcase applications or their visual evidence;
- release workflow provenance, registry credentials, a release-candidate tag, or npm `latest` promotion;
- the Docusaurus site or GitHub Pages deployment.

Those claims are not inferred from this all-package fixture. The separate [`framework-neutral-core.md`](framework-neutral-core.md) gate certifies the React-free core declaration/runtime surface, and [`binding-singleton-contract.md`](binding-singleton-contract.md) certifies one physical core plus reactive behavior for the six stable JavaScript bindings. Native, showcase, visual, documentation, provenance, and publication claims remain owned by later changes.

Passing this gate means the current npm candidate artifacts have valid module, type, metadata, and payload contracts. It does not mean 3.0.0 is ready to publish.
