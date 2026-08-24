---
name: npm-release-and-cleanup
description: "Publish the twelve @prometheus-ags packages to npm at a new version, tag and announce the release, refresh the version-bearing docs, and clean up git worktrees and branches afterward. Use when cutting a release, publishing to npm, moving dist-tags, tagging a version, creating a GitHub release, or removing stale worktrees and branches from this repository."
license: MIT
compatibility: "Requires pnpm 10.33+, Node 24, the gh CLI, and an npm credential with publish rights to the @prometheus-ags scope."
metadata:
  tags: "npm, publishing, release, dist-tags, git, worktree, cleanup, docs"
---

# npm-release-and-cleanup

Release procedure for this repository, written down after a 3.0.0 release shipped
broken to npm and a 3.0.3 release cost hours of archaeology. Every rule below exists
because skipping it caused a real failure. Follow the phases in order.

## When to use

- Publishing the twelve `@prometheus-ags/*` packages at a new version
- Moving npm dist-tags (`latest`, `next`)
- Tagging a version and creating its GitHub Release
- Updating version-bearing docs after a publish
- Removing stale worktrees and branches

## Phase 1 — Establish where the truth is (never skip)

**The working tree is not automatically the release.** In the 3.0.3 release the local
tree was 93 commits behind `origin/main`, sitting at an old `3.0.0-rc.1` state with 404
"modified" files. Building from it would have deleted ~12,700 lines of real work and
published the wrong tree.

```bash
git fetch origin --prune --tags
git rev-list --left-right --count main...origin/main   # want 0<TAB>0
git status --porcelain | wc -l
```

If the tree is dirty or behind, find where the target version actually lives before
assuming it is local — it is often on a branch or on `origin/main`:

```bash
for b in $(git branch -a --format='%(refname:short)' | grep -v HEAD); do
  v=$(git show "$b:packages/entity-graph-core/package.json" 2>/dev/null \
      | node -pe "try{JSON.parse(require('fs').readFileSync(0,'utf8')).version}catch(e){''}")
  [ -n "$v" ] && echo "$v  $b"
done | sort -V | tail -20
```

Never discard local changes to resolve this. `git stash push -u -m "<why>"` first; drop
the stash only once the release is verified.

## Phase 2 — Build

```bash
pnpm install --frozen-lockfile
pnpm run build:packages
```

Confirm every package reports the intended version and that internal deps still use the
`workspace:` protocol in source (that is correct — it is rewritten at pack time):

```bash
for f in packages/*/package.json; do
  node -pe "const p=require('./$f'); p.version.padEnd(10)+' '+p.name"
done
```

## Phase 3 — Prove the tarball before publishing

**This is the step whose absence broke 3.0.0.** `npm publish` does **not** rewrite pnpm
`workspace:` specifiers while packing; `pnpm publish` does. Publishing with npm shipped a
literal `workspace:^` to the registry in ten of twelve packages, making them
uninstallable (`EUNSUPPORTEDPROTOCOL` / `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`).

Dry-run a package that has internal dependencies and inspect the *packed* manifest:

```bash
cd packages/entity-graph-htmx
pnpm pack --pack-destination /tmp/packcheck
tar -xzOf /tmp/packcheck/*.tgz package/package.json \
  | node -pe "const m=JSON.parse(require('fs').readFileSync(0,'utf8'));JSON.stringify({deps:m.dependencies,peer:m.peerDependencies},null,1)"
```

Expect real semver (`3.0.3`, `^3.0.3`). Any `workspace:` string means **stop**.

## Phase 4 — Publish

Use the existing script — do not hand-roll the loop:

```bash
bash scripts/publish-stable-3.0.0.sh
```

It publishes in topological order, skips versions already on the registry (safe to
re-run after a partial failure), and after each publish **re-reads the manifest from the
registry** and fails closed if a `workspace:` protocol leaked.

Two environment quirks it already handles, which will bite you if you work around it:

- The root `package.json` `devEngines` field makes `npm` exit `EBADDEVENGINES` anywhere
  inside this repo. Registry reads must run from a scratch cwd (`cd "$(mktemp -d)"`).
- `npm view` can 404 for several seconds after a successful publish; the script retries.

Registry versions are immutable. A bad publish is recovered with a new patch version,
never by overwriting.

## Phase 5 — Dist-tags

`pnpm publish --tag latest` moves only `latest`. **`next` is not updated automatically**
and will silently keep serving an older prerelease — after 3.0.3 shipped, `next` still
pointed at `3.0.0-rc.1`, older than `latest`.

```bash
cd "$(mktemp -d)"
for p in entity-graph-core entity-graph-sdl entity-graph-solid entity-graph-svelte \
         entity-graph-sync entity-graph-tauri entity-graph-web-components \
         prometheus-entity-management a2ui-react entity-graph-a2a \
         entity-graph-alpine entity-graph-htmx; do
  npm dist-tag add "@prometheus-ags/$p@<VERSION>" next
done
```

Verify every package, not a sample:

```bash
cd "$(mktemp -d)"
for p in <all twelve>; do
  echo "$p $(npm view "@prometheus-ags/$p" dist-tags --json | tr -d '\n ')"
done
```

## Phase 6 — Tag and announce

Tag the commit **whose tree was actually published**, which may not be the current HEAD
if merges have landed since. Confirm the published subtree is identical first:

```bash
git diff --stat <published-sha> HEAD -- packages   # expect empty
git tag -a v<VERSION> <published-sha> -m "Prometheus Entity Management <VERSION> stable"
git push origin v<VERSION>
gh release create v<VERSION> --title "Prometheus Entity Management <VERSION>" \
  --notes-file <notes.md> --latest --verify-tag
```

Release notes in this repo are terse and factual: what changed, what it fixes, and the
registry state. No marketing.

## Phase 7 — Refresh version-bearing docs

Large parts of `README.md` and `website/docs/operations/release.md` are **generated**
between `<!-- BEGIN GENERATED:… -->` markers by `scripts/readme-parity.mjs`. Editing
inside the markers is overwritten and fails CI's `verify:readme-parity`.

Edit the data files, then regenerate:

1. `release/npm-registry-status.json` — `expectedCandidate`, `releaseUrl`, and the
   `latest`/`next` fields for all twelve packages. Keep `provenance` honest: a manual
   token publish has **no** npm attestation (`npm view <pkg> --json` → `dist.attestations`
   is `null`), so do not leave it claiming `verified-for-all-packages`.
2. `release/v3-release-contract.json` — `version` fields and policy prose.
3. `examples/coverage.json` — `release`. Its schema `examples/coverage.schema.json` pins
   `release` with a `const` that Ajv **does** enforce; bump both together or
   `verify:example-coverage` fails.

```bash
pnpm run readme:write
pnpm run verify:readme-parity
pnpm run verify:example-coverage
pnpm run docs:search      # regenerate website/static/search-index.json
```

`.github/workflows/docs-pages.yml` runs `docs:search` and then
`git diff --exit-code -- website/static/search-index.json`. **Commit the regenerated
index or the docs deploy fails.**

Then sweep hand-written prose: `website/docusaurus.config.ts` (the `announcementBar`,
the most visible string on the site), the `README.md` status block outside the markers,
`website/docs/**`, `site/docs/**`, `RELEASING.md`, and any package README claiming a
prerelease state.

Do **not** rewrite: historical `CHANGELOG.md` entries (add a new section above them),
`release/*.md` evidence records, `.kbd-orchestrator/**`, Flutter `3.0.0` references
(pub.dev tracks its own version), generated dartdoc under
`website/static/native-api/dart/**`, or the `3.0.0` fixtures in
`scripts/verify-stable-publication.mjs` and `scripts/verify-no-workspace-leak.mjs`,
which use it as a deliberate negative case.

## Phase 8 — Cleanup (destructive: audit first)

Never bulk-delete branches without checking for unmerged work:

```bash
for b in $(git branch -a --format='%(refname:short)' | grep -vE 'HEAD|^origin$|main'); do
  n=$(git rev-list --count "$b" ^main 2>/dev/null)
  [ "$n" != "0" ] && echo "$b  unmerged=$n  last=$(git log -1 --format=%cd --date=short "$b")"
done
```

A branch with unmerged commits is not automatically live work — check whether the same
fix already landed via a PR (`git log --oneline main --grep='<subject>'`). Confirm each
worktree is clean (`git -C <path> status --porcelain`) before removing it. Ask before
deleting anything that has unique commits and no equivalent on `main`.

```bash
git worktree remove --force <path> && git worktree prune
git branch -D <branch>
git push origin --delete <branch>
```

## Verification

```bash
gh release view v<VERSION>
pnpm run verify:readme-parity
pnpm run verify:example-coverage
pnpm run docs:search && git diff --exit-code -- website/static/search-index.json
pnpm run ci
```

Then confirm on the registry, for all twelve packages, that the version is present, both
dist-tags are correct, and no manifest contains a `workspace:` string.

## Constraints

- Never `npm publish` these packages. Always `pnpm publish`.
- Never overwrite a published version; recover with a new patch.
- Never hand-edit inside `<!-- BEGIN GENERATED -->` markers.
- Never claim provenance the registry does not show.
- Never delete branches or worktrees without an unmerged-commit audit.
- Never build a release from a tree you have not compared against `origin/main`.

## References

- `scripts/publish-stable-3.0.0.sh` — the publish loop and its fail-closed checks
- `scripts/readme-parity.mjs` — the generated-block contract
- `scripts/verify-no-workspace-leak.mjs`, `scripts/verify-stable-publication.mjs`
- `RELEASING.md` — release contract, governed OIDC path, recovery rules
- `.github/workflows/docs-pages.yml` — the search-index CI gate

> This file is duplicated at `.claude/skills/npm-release-and-cleanup/SKILL.md` and
> `.agents/skills/npm-release-and-cleanup/SKILL.md` to cover every agent's discovery
> path. There is no sync script in this repo — edit both copies together.
