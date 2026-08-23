#!/usr/bin/env bash
# Publishes the 12 @prometheus-ags packages at their package.json versions in
# topological order with dist-tag latest. Requires a valid npm credential.
set -euo pipefail
cd "$(dirname "$0")/.."

# npm refuses to run anywhere inside this repo (root package.json devEngines
# enforces pnpm; npm exits EBADDEVENGINES). Registry reads therefore run from a
# scratch cwd — otherwise `npm view` fails and this script misfires.
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
npmview() { (cd "$scratch" && npm view "$@"); }

order=(
  packages/entity-graph-core
  packages/entity-graph-sdl
  packages/entity-graph-solid
  packages/entity-graph-svelte
  packages/entity-graph-sync
  packages/entity-graph-tauri
  packages/entity-graph-web-components
  packages/entity-graph-react
  packages/a2ui-react
  packages/entity-graph-a2a
  packages/entity-graph-alpine
  packages/entity-graph-htmx
)

for dir in "${order[@]}"; do
  name=$(node -p "require('./$dir/package.json').name")
  version=$(node -p "require('./$dir/package.json').version")
  existing=$(npmview "$name@$version" version 2>/dev/null || true)
  if [[ "$existing" == "$version" ]]; then
    echo "skip  $name@$version (already on registry)"
    continue
  fi
  echo "publish $name@$version"
  # MUST be `pnpm publish`, never `npm publish`. These packages declare their
  # sibling deps with pnpm's `workspace:` protocol; pnpm rewrites those to real
  # semver ranges as it packs, npm does not. Publishing 3.0.0 with `npm publish`
  # shipped a literal "workspace:^" to the registry in 10 of these 12 packages,
  # making them uninstallable (npm: EUNSUPPORTEDPROTOCOL; pnpm:
  # ERR_PNPM_WORKSPACE_PKG_NOT_FOUND where the leak was in hard dependencies).
  #
  # --no-git-checks: this script is invoked from release automation on a
  # detached//release branch; the tree cleanliness gate runs upstream.
  (cd "$dir" && pnpm publish --tag latest --access public --no-git-checks)

  # Fail closed: re-read what the registry actually received. The pre-publish
  # tarball gate (scripts/package-contract-validation.mjs) was never wired into
  # this script, so nothing caught the leak in the 3.0.0 run.
  # Registry reads race the write: `npm view` can 404 for several seconds after
  # a successful publish, so retry until the version is actually visible.
  visible=""
  for attempt in 1 2 3 4 5 6; do
    if [[ "$(npmview "$name@$version" version 2>/dev/null || true)" == "$version" ]]; then
      visible=1
      break
    fi
    sleep 5
  done
  if [[ -z "$visible" ]]; then
    echo "ERROR: $name@$version not visible on the registry 30s after publish" >&2
    exit 1
  fi
  if npmview "$name@$version" --json 2>/dev/null \
     | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const m=JSON.parse(s||'{}');const bad=[];for(const k of ['dependencies','peerDependencies','devDependencies','optionalDependencies'])for(const [a,b] of Object.entries(m[k]||{}))if(String(b).includes('workspace:'))bad.push(k+'/'+a+'='+b);if(bad.length){console.error('  workspace protocol leaked: '+bad.join(', '));process.exit(1)}})"; then
    echo "  verified $name@$version — no workspace protocol on the registry"
  else
    echo "ERROR: $name@$version published with a leaked workspace: protocol" >&2
    exit 1
  fi
done

echo "done; verifying dist-tags"
npmview @prometheus-ags/prometheus-entity-management dist-tags --json
