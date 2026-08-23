#!/usr/bin/env bash
# Publishes the 12 @prometheus-ags packages at 3.0.0 in topological order
# with dist-tag latest. Requires a valid npm credential (npm login).
set -euo pipefail
cd "$(dirname "$0")/.."

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
  existing=$(npm view "$name@$version" version 2>/dev/null || true)
  if [[ "$existing" == "$version" ]]; then
    echo "skip  $name@$version (already on registry)"
    continue
  fi
  echo "publish $name@$version"
  (cd "$dir" && npm publish --tag latest --access public)
done

echo "done; verifying dist-tags"
npm view @prometheus-ags/prometheus-entity-management dist-tags --json
