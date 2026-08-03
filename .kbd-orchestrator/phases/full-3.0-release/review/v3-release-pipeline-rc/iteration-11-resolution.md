# Review feedback for iteration 11

Review for real defects. Two prior findings were contradicted by authoritative
current-state evidence and must not be repeated.

## The pnpm lockfile is present, modified, and frozen-install clean

The packet intentionally omits most generated lockfile bulk to remain within
the fresh-context transport limit. That omission is not evidence that the file
is absent. The current worktree reports:

```text
$ git diff --numstat -- pnpm-lock.yaml
4441  3504  pnpm-lock.yaml
```

The beginning of the actual lock diff includes the matching root importer:

```diff
diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml
index a5f80da..b8c626c 100644
--- a/pnpm-lock.yaml
+++ b/pnpm-lock.yaml
@@ -4,76 +4,116 @@
+overrides:
+  postcss: 8.5.25
+  sharp: 0.35.0
 importers:
   .:
     devDependencies:
+      '@arethetypeswrong/cli':
+        specifier: 0.18.5
+        version: 0.18.5
+      '@cucumber/cucumber':
+        specifier: 13.2.0
+        version: 13.2.0
+      '@eslint/js':
+        specifier: 10.0.1
+        version: 10.0.1(eslint@10.8.0(jiti@2.7.0))
+      eslint:
+        specifier: 10.8.0
+        version: 10.8.0(jiti@2.7.0)
+      semver:
+        specifier: 7.8.5
+        version: 7.8.5
+      tsx:
+        specifier: 4.23.1
+        version: 4.23.1
+      typescript:
+        specifier: 6.0.2
+        version: 6.0.2
+      yaml:
+        specifier: 2.9.0
+        version: 2.9.0
```

Executable proof from this exact worktree:

```text
$ pnpm install --frozen-lockfile
Scope: all 15 workspace projects
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 1.2s using pnpm v10.33.0
```

The lockfile is not missing and must not be regenerated or reverted.

## `artifact-metadata: write` is valid and required

Current GitHub workflow syntax explicitly supports
`artifact-metadata: read|write|none`. Official `actions/attest` documentation
requires `id-token: write`, `attestations: write`, and
`artifact-metadata: write` for the implemented attestation path.

Primary sources:

- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://github.com/actions/attest

The repository workflow also passes:

```text
$ pnpm exec actionlint .github/workflows/publish.yml
# exit 0, no findings
```

Inspect the packet for new evidence-backed release, staging, or recovery
defects. Do not infer missing generated files solely from packet truncation.
