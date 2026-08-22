#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
corepack_cache="$(mktemp -d)"
pnpm11_bin="$(mktemp -d)"
negative_dir="$(mktemp -d)"
application_lock="$(mktemp)"

cleanup() {
  rm -rf -- "$corepack_cache" "$pnpm11_bin" "$negative_dir"
  rm -f -- "$application_lock"
}
trap cleanup EXIT

cd "$repo_root"

COREPACK_HOME="$corepack_cache" corepack install -g --cache-only pnpm@11.15.0
pnpm11_entry="$corepack_cache/v1/pnpm/11.15.0/bin/pnpm.cjs"
test -f "$pnpm11_entry"
ln -s "$pnpm11_entry" "$pnpm11_bin/pnpm"

COREPACK_HOME="$corepack_cache" corepack pnpm --version | grep -x '10.33.0'
CI=true COREPACK_HOME="$corepack_cache" corepack pnpm install --frozen-lockfile

PATH="$pnpm11_bin:$PATH" node "$pnpm11_entry" --version | grep -x '11.15.0'
PATH="$pnpm11_bin:$PATH" node "$pnpm11_entry" exec turbo run build --force \
  --filter=@prometheus-ags/prometheus-entity-management...

printf '%s\n' \
  '{' \
  '  "name": "pnpm-consumer-negative-control",' \
  '  "private": true,' \
  '  "devEngines": {' \
  '    "packageManager": {' \
  '      "name": "pnpm",' \
  '      "version": ">=10.33.0 <11",' \
  '      "onFail": "error"' \
  '    }' \
  '  },' \
  '  "packageManager": "pnpm@10.33.0+sha512.10568bb4a6afb58c9eb3630da90cc9516417abebd3fabbe6739f0ae795728da1491e9db5a544c76ad8eb7570f5c4bb3d6c637b2cb41bfdcdb47fa823c8649319"' \
  '}' > "$negative_dir/package.json"

set +e
negative_output="$(cd "$negative_dir" && node "$pnpm11_entry" --version 2>&1)"
negative_status=$?
set -e
printf '%s\n' "$negative_output"
test "$negative_status" -ne 0
printf '%s\n' "$negative_output" |
  grep -F 'configured to use >=10.33.0 <11 of pnpm'
printf '%s\n' 'UNSUPPORTED_PNPM_REJECTED_PASS version=11.15.0'

node <<'NODE'
const fs = require('node:fs');
const YAML = require('yaml');
const documents = YAML.parseAllDocuments(fs.readFileSync('pnpm-lock.yaml', 'utf8'));
if (documents.some((document) => document.errors.length > 0)) process.exit(1);
if (documents.length !== 2) process.exit(1);
const manager = documents[0].toJSON()?.importers?.['.']?.packageManagerDependencies;
if (manager?.pnpm?.specifier !== '11.15.0') process.exit(1);
if (manager?.['@pnpm/exe']?.specifier !== '11.15.0') process.exit(1);
console.log('PACKAGE_MANAGER_RECEIPT_PASS documents=2 pnpm=11.15.0');
NODE

awk 'BEGIN { separators = 0 } /^---$/ { separators += 1; next } separators == 2 { print }' \
  pnpm-lock.yaml > "$application_lock"
application_hash="$(shasum -a 256 "$application_lock" | awk '{ print $1 }')"
test "$application_hash" = 'fb95bea155cca9a4d7e92f5dd31d0ca75e9c0f53cfeb731976542f8b0c3d267b'
printf '%s\n' "APPLICATION_LOCK_UNCHANGED_PASS sha256=$application_hash"
