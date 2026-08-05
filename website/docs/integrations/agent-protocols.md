---
title: A2A and policy-controlled A2UI
sidebar_position: 5
---

# Protocol validity never grants graph authority

The A2A package implements the JSON-RPC task lifecycle and caller-scoped task
access. A2UI renders official surface messages through a safe widget catalog.
An application-owned action catalog validates intent, checks policy, requests
human approval where required, and only then calls graph/store operations.

Malformed messages, unknown widgets, unauthorized actions, cancellation, and
denial fail closed. External agents may propose UI or intent; they cannot bypass
tenant boundaries, service validation, or the application action policy.
