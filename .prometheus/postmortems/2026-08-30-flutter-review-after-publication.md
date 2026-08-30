# Flutter review completed after immutable publications

## Symptom

Flutter 3.0.2, 3.0.3, and 3.0.4 were published while later isolated-review
cycles were still finding controller lifecycle and acceptance-evidence defects.
Each correction required another immutable pub.dev patch version; 3.0.5 became
the first archive produced from the final frozen, reviewed candidate.

## Root cause

Publication was sequenced as an intermediate implementation task. The phase
continued adversarial review after registry mutation, so source truth and
immutable registry truth diverged whenever a later finding was valid. The
acceptance receipt also initially used one VM client while claiming a
multi-client cancellation property.

## Fix

- Added candidate-ID-bound, mismatch-safe, non-destructive history-import
  cancellation and disposal rejection.
- Connected a second real VM-service client in the assembled gate; it discovers
  and cancels the pending candidate, proves retained history unchanged, and
  inspects/confirms the replacement.
- Froze commit `b1c18b4f1d508feb445cb60713d7e04ac937b0e2`, reran the full gate,
  completed two isolated reviews, rebuilt/validated the official extension,
  refreshed ledgers, and passed a zero-warning dry run before publishing 3.0.5.
- Verified the public API, archive hash/contents, clean hosted resolution,
  analyzer, release web build, README parity, coverage, and both docs sites.

## Prevention

An immutable registry mutation is the final release action after frozen-SHA
integration evidence and distinct-model review. Post-publication work may only
verify the registry/archive/consumer and synchronize truthful documentation.
Multi-client claims must use multiple real transport clients.
