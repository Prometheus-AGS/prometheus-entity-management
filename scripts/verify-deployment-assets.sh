#!/bin/bash
set -euo pipefail

asset_dir=${1:?asset directory is required}
expected_sha=${2:?expected source SHA is required}
candidate_run_id=${3:-}

case "$expected_sha" in
  *[!0-9a-f]*|'') echo "candidate SHA must be 40 lowercase hexadecimal characters" >&2; exit 1 ;;
esac
[ "${#expected_sha}" -eq 40 ] || { echo "candidate SHA must be 40 characters" >&2; exit 1; }
[ "$(git rev-parse HEAD)" = "$expected_sha" ] || { echo "checked-out source does not match candidate SHA" >&2; exit 1; }

test -s "$asset_dir/manifest.json"
test -s "$asset_dir/rehearsal.json"
test -s "$asset_dir/SHA256SUMS"
(cd "$asset_dir" && shasum -a 256 -c SHA256SUMS)

manifest_sha=$(node -e 'const fs=require("fs"); const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(m.source?.sha ?? "")' "$asset_dir/manifest.json")
[ "$manifest_sha" = "$expected_sha" ] || { echo "manifest source SHA does not match candidate SHA" >&2; exit 1; }

# GitHub Release assets are downloaded into one flat directory, while the
# certified rehearsal addresses tarballs beneath packages/. Reconstruct that
# directory only after the flat assets pass their published checksums.
mkdir -p "$asset_dir/packages"
for archive in "$asset_dir"/*.tgz; do
  [ -f "$archive" ] || continue
  mv "$archive" "$asset_dir/packages/$(basename "$archive")"
done

if [ -n "$candidate_run_id" ]; then
  case "$candidate_run_id" in *[!0-9]*) echo "candidate run ID must be numeric" >&2; exit 1 ;; esac
  run_json=$(gh api "repos/${GITHUB_REPOSITORY}/actions/runs/${candidate_run_id}")
  node -e '
    const run=JSON.parse(process.argv[1]);
    const sha=process.argv[2];
    if (run.status !== "completed" || run.conclusion !== "success" || run.head_sha !== sha) process.exit(1);
  ' "$run_json" "$expected_sha"
fi
