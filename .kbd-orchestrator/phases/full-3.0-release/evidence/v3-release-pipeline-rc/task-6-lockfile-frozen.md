# Task 6 frozen-lockfile evidence

Date: 2026-08-02

Command:

```text
pnpm install --frozen-lockfile
```

Result:

```text
Scope: all 15 workspace projects
Lockfile is up to date, resolution step is skipped
Already up to date
Done using pnpm v10.33.0
```

`pnpm-lock.yaml` is lockfile version 9 and its root importer includes the exact
new manifest entries, including:

```yaml
'@cucumber/cucumber': 13.2.0
'@eslint/js': 10.0.1
eslint: 10.8.0
semver: 7.8.5
tsx: 4.23.1
typescript: 6.0.2
yaml: 2.9.0
```

The lockfile is modified in the current worktree (4,441 insertions and 3,504
deletions); its full generated body is omitted from the adversarial packet only
to keep the fresh-context request below the operating-system argument limit.
