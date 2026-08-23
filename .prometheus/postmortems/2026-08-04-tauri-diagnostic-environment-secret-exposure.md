# Tauri diagnostic environment secret exposure

**Date:** 2026-08-04

**Subsystem:** Universal Tauri Android build diagnostics

**Severity:** High operational credential exposure

## Symptom

A failed Android build diagnostic serialized an inherited Cargo registry
credential into captured tool output. The credential value is intentionally
absent from this record.

## Root cause

The diagnostic command inherited the agent process environment, and its error
serializer included environment values in the emitted failure payload. The
build itself did not require the registry credential, but the command boundary
did not remove it before invoking Tauri, Gradle, and Cargo.

## Correction

All subsequent Tauri, Gradle, Xcode, and Cargo platform commands explicitly
removed `CARGO_REGISTRY_TOKEN`, `NPM_TOKEN`, and `NODE_AUTH_TOKEN` from the
child environment. Platform builds then completed without those credentials.

## Prevention

- Remove unrelated registry credentials before invoking build systems or
  diagnostics that may serialize their environment.
- Do not print full inherited environments or command lines.
- Retain redacted postmortems and command forms, never credential values.

## Required operator action

Rotate the exposed Cargo registry credential and invalidate the prior value.
This repository cannot prove rotation because credential ownership is external
to the project.
