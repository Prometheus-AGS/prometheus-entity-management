# Flutter acceptance platform failure was masked as a startup timeout

Date: 2026-08-30

## Symptom

The assembled Flutter DevTools gate twice waited until its startup deadline and
reported only that the acceptance host had timed out.

## Root cause

The verifier defaulted to the globally discoverable macOS device, but the
Flutter example contains only iOS and Android platform projects. Flutter
therefore emitted `app.start`, a diagnostic explaining that no macOS project was
configured, and `app.stop`. The verifier rejected `app.stop` only when its
parameters contained an `error` field and rejected process exit only before an
app ID existed, so this valid failure sequence was masked by the pending
`app.debugPort` and `app.started` promises.

## Fix

- Device discovery now selects only a connected device whose platform directory
  exists in the example, while retaining an explicit device override.
- Every startup `app.stop` and early process exit fails immediately.
- Failure output reports event names and capped fixed-marker diagnostics only;
  paths, the acceptance sentinel, and known registry token values are redacted.
- The acceptance gate was moved to an available configured iOS simulator.

## Prevention and verification

Device availability and project platform support must be checked together; one
does not imply the other. Startup runners must treat terminal protocol events as
terminal regardless of which earlier milestones succeeded. The corrected gate
failed fast enough to reveal the subsequent snapshot typing defect, and then
passed end to end with 28 production Extension events on source commit
`ad72bcf8d99d7175cf2bf36d4f8ce4594d200da4`.
