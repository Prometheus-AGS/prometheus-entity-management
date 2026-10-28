#!/usr/bin/env bash
# One command that finishes phase-v4-a2ui-runtime-hardening after the operator signs the budget amendment.
#
#   ./scripts/close-a2ui-hardening-phase.sh
#
# The only step that uses your authority is step 1: it signs the prepared budget-amendment manifest with YOUR ssh key
# (the key whose public half is registered for your principal in ~/.config/prometheus/kbd-scope-allowed-signers).
# If the key has a passphrase, ssh-keygen asks you for it. Every later step runs through the canonical KBD writers;
# nothing is hand-written. The script stops at the first failure and says what failed. Re-running it is safe.
#
# It does NOT push. It makes one local commit at the end.
set -euo pipefail

PHASE="phase-v4-a2ui-runtime-hardening"
NAMESPACE="prometheus-kbd-scope-amendment"
SIGNERS="$HOME/.config/prometheus/kbd-scope-allowed-signers"
PACK="$HOME/.prometheus/plugins/prometheus-skill-pack/current"
export KBD_ORCHESTRATOR_ROOT="$HOME/.claude/skills/kbd-process-orchestrator"
TRANSCRIPT="$HOME/.claude/projects/-Users-gqadonis-Projects-prometheus-prometheus-entity-management/f0366318-41f7-47d2-b4fd-8f3fad22eb39.jsonl"

cd "$(git rev-parse --show-toplevel)"
PHASE_DIR=".kbd-orchestrator/phases/$PHASE"
CONTRACT="$PHASE_DIR/adopted-contract.json"
MANIFEST="$(ls "$PHASE_DIR"/amendment-budget-*.json | sort -V | tail -1)"
SIGNATURE="$MANIFEST.sig"

say() { printf '\n== %s\n' "$*"; }
die() { printf '\nSTOPPED: %s\n' "$*" >&2; exit 1; }

command -v jq >/dev/null || die "jq is required"
command -v prometheus >/dev/null || die "the prometheus CLI is required"
[ -f "$MANIFEST" ] || die "missing $MANIFEST"

bound_digest() { prometheus kbd --path . phase disposition --id "$PHASE" --json | jq -r '.binding.contractDigest'; }
working_digest() { jq -S -c 'del(.identity.contractDigest) | del(.identity.planRevision)' "$CONTRACT" | shasum -a 256 | awk '{print $1}'; }

# ---------------------------------------------------------------------------------------------------------------
say "1/6 Sign the budget amendment with your ssh key"
if [ "$(bound_digest)" = "$(working_digest)" ]; then
  echo "Contract already bound at the amended digest; nothing to sign."
else
  [ "$(jq -r '.newContractDigest' "$MANIFEST")" = "$(working_digest)" ] \
    || die "the manifest no longer matches the working contract; ask for a regenerated manifest"
  if [ ! -f "$SIGNATURE" ]; then
    PRINCIPAL="$(jq -r '.approver' "$MANIFEST")"
    ALLOWED_KEY="$(grep -F "$PRINCIPAL" "$SIGNERS" | grep -F "$NAMESPACE" | head -1 | awk '{for(i=1;i<=NF;i++) if ($i ~ /^(ssh-|ecdsa-|sk-)/) {print $(i+1); exit}}')"
    [ -n "$ALLOWED_KEY" ] || die "no signer entry for $PRINCIPAL in $SIGNERS"
    KEY=""
    for pub in "$HOME"/.ssh/*.pub; do
      if awk '{print $2}' "$pub" 2>/dev/null | grep -qxF "$ALLOWED_KEY"; then KEY="${pub%.pub}"; break; fi
    done
    [ -n "$KEY" ] && [ -f "$KEY" ] || die "none of your ~/.ssh keys matches the registered signer for $PRINCIPAL"
    echo "Signing with $KEY (the ssh agent or a passphrase prompt may appear)."
    ssh-keygen -Y sign -f "$KEY" -n "$NAMESPACE" "$MANIFEST" || die "signing failed"
  fi
  [ -f "$SIGNATURE" ] || die "no signature file at $SIGNATURE"
  ssh-keygen -Y verify -f "$SIGNERS" -I "$(jq -r '.approver' "$MANIFEST")" -n "$NAMESPACE" -s "$SIGNATURE" < "$MANIFEST" >/dev/null \
    || die "the signature does not verify against your allowed-signers file"
  echo "Signature verified."
fi

# ---------------------------------------------------------------------------------------------------------------
say "2/6 Apply the amendment through the canonical writer"
if [ "$(bound_digest)" = "$(working_digest)" ]; then
  echo "Already bound."
else
  LATEST="$(prometheus kbd --path . status --json | jq -r --arg path "$CONTRACT" '
    [(.decisions // {}) | to_entries[] | select(.value.summary | contains("ADOPTED-CONTRACT path=" + $path + " "))] as $a
    | [$a[] | select(.value as $d | [$a[] | select(.value.supersedes == $d.id)] | length == 0)]
    | if length == 1 then .[0].value.id else empty end')"
  [ -n "$LATEST" ] || die "could not find exactly one live adoption decision to supersede"
  bash "$PACK/shared/scripts/kbd-contract-adopt.sh" "$CONTRACT" --supersedes "$LATEST" \
    --amendment "$MANIFEST" --signature "$SIGNATURE" || die "the contract amendment was refused"
fi

# ---------------------------------------------------------------------------------------------------------------
say "3/6 Rebuild the evidence from the receipts against the amended contract"
node scripts/build-a2ui-boundary-results.mjs --transcript "$TRANSCRIPT" --repair-attempts 13 \
  --repair-basis "8 acceptance-run failures fixed (import.meta, changelog regex, label selector, double-counted faults, buffered-delta test, cucumber memoization, legacy release test, stale processor.version assertion) + 5 review findings fixed; counted from the phase record, not telemetry" \
  || die "building boundary-results.json failed"

# ---------------------------------------------------------------------------------------------------------------
say "4/6 Close the Execute stage"
# shellcheck disable=SC1091
. "$KBD_ORCHESTRATOR_ROOT/shared/lib/waypoint.sh"
. "$KBD_ORCHESTRATOR_ROOT/shared/lib/hooks.sh"
. "$KBD_ORCHESTRATOR_ROOT/shared/lib/stage-gate.sh"
if [ ! -f "$PHASE_DIR/handoffs/execute.handoff.json" ]; then
  prometheus kbd --path . stage transition --command-id "execute-complete:$PHASE" \
    --phase "$PHASE" --id execute --status complete || die "the Execute stage transition was refused"
  kbd_hooks_fire execute after "$PHASE" 1 1 || die "the execute:after hook failed"
  kbd_stage_handoff_write execute "All 8 changes implemented, verified and archived; one fresh full acceptance pass (17 browser flows, 4 headless checks, 6 Cucumber scenarios) passed; cumulative artifact-only review done with findings 1-5 fixed and 6-10 recorded" \
    "$PHASE_DIR/execution.md" "$PHASE_DIR/progress.json" || die "writing the Execute handoff failed"
else
  echo "Execute handoff already written."
fi

# ---------------------------------------------------------------------------------------------------------------
say "5/6 Reflect: gate, handoff, and the terminal close evaluator"
kbd_stage_gate reflect || die "the Reflect gate is still blocked"
if [ ! -f "$PHASE_DIR/handoffs/reflect.handoff.json" ]; then
  kbd_stage_handoff_write reflect "Delta first: v4.2.0 deliberately untagged, #70 first closed on a single-stream lab, execute needed spec deltas and a signed budget amendment; goals #70-#73 met, #74 met in intent; next phase seed closes the remaining obligations" \
    "$PHASE_DIR/reflection.md" || die "writing the Reflect handoff failed"
fi
kbd_hooks_fire reflect after "$PHASE" 1 1 || die "the reflect:after hook failed"
RESULT=0
bash "$PACK/shared/scripts/kbd-phase-close-eval.sh" --phase "$PHASE" || RESULT=$?
if [ "$RESULT" -ne 0 ]; then
  prometheus kbd --path . phase disposition --id "$PHASE" --json | jq '{disposition, phaseStatus}'
  die "the close evaluator did not close the phase (exit $RESULT); its message is above and is the real result"
fi
kbd_hooks_fire phase after "$PHASE" 1 1 || die "the phase:after hook failed"

# ---------------------------------------------------------------------------------------------------------------
say "6/6 Commit locally (no push)"
git add -A -- 'openspec/changes/archive' 'openspec/specs' ':(glob)openspec/changes/a2ui-*' \
  "$PHASE_DIR/reflection.md" "$PHASE_DIR/boundary-results.json" "$PHASE_DIR/adopted-contract.json" \
  "$PHASE_DIR/adopted" "$PHASE_DIR/handoffs" "$PHASE_DIR"/amendment-budget-*.json "$PHASE_DIR"/amendment-budget-*.json.sig \
  "$PHASE_DIR/evidence/hardening-acceptance/browser-receipts.json" \
  "$PHASE_DIR/evidence/hardening-acceptance/headless-receipts.json" \
  "$PHASE_DIR/evidence/hardening-acceptance/playwright-report.json" \
  scripts/build-a2ui-boundary-results.mjs scripts/close-a2ui-hardening-phase.sh 2>/dev/null || true
if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git commit -q -m "chore(kbd): close phase-v4-a2ui-runtime-hardening

Spec deltas and archive for the 8 changes, a signed budget amendment, evidence
built from a fresh full acceptance run, and the reflection with its handoffs." \
    && git log --oneline -1
fi

say "Done"
prometheus kbd --path . phase disposition --id "$PHASE" --json | jq '{disposition, phaseStatus}'
echo "Nothing was pushed."
