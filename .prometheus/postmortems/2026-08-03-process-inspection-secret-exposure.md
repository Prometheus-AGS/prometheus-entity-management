# Process inspection exposed secret-bearing command arguments

Date: 2026-08-03

## Symptom

A process-discovery command used `pgrep -fl` while locating the enrolled KBD
service signer. The resulting tool output included full agent command lines,
including connector credentials supplied as arguments or environment payloads.

## Root cause

The diagnostic was broader than the information required. Only the sovereign
sync launch-agent identity and its configured device-key path were needed, but
full process arguments were requested.

## Containment

- Secret values are not reproduced in this postmortem or any source file.
- Subsequent inspection queried only
  `EnvironmentVariables.PROMETHEUS_DEVICE_KEY_FILE` from the named launchd
  plist with `plutil -extract`.
- No credential files were opened or printed.

## Required operator follow-up

Rotate any connector credentials visible in the affected tool output. Rotation
requires external account authority and is not performed by this repository
change.

## Prevention

Use process name/PID-only discovery and targeted plist-field extraction. Never
print full command lines for agent, MCP, or connector processes because those
surfaces are real secret boundaries.
