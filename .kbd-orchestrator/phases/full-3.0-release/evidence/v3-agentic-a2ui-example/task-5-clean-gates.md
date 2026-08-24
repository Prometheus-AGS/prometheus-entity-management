# Agentic A2UI task 5 clean-gate receipt

Date: 2026-08-03

## Evidence boundary

This receipt covers the keyless React 19/Vite 8 source-workspace example at
`examples/agentic-a2ui-app`. It does not certify packed npm consumers, an external
agent or model provider, Flutter/Dart, Tauri/Rust, or native platform bundles.
Package publication and packed-consumer certification remain owned by the release
and package-contract changes named in `task-5-verification.json`.

## Clean verification

`pnpm run verify:agentic-a2ui` removed only the example build, the four package
build directories required by the example, and the deterministic agentic evidence
outputs. From that state it passed:

- frozen pnpm installation;
- example type checking and scoped linting;
- 11 focused unit tests;
- one focused A2UI atomic-batch regression;
- four focused A2A external-endpoint policy tests;
- core, React, A2UI, and A2A package builds;
- the A2UI export ledgers (18 root and 9 `./ag-ui` exports);
- the A2A export ledgers (30 root and 2 `./legacy` exports);
- the production Vite build;
- three Chromium production-browser flows with three screenshots and three traces;
- all 13 semantic example-coverage scenarios and 14 coverage regression tests;
- the production dependency audit;
- strict OpenSpec validation; and
- git diff hygiene.

The retained machine report is `task-5-verification.json`. It binds ten evidence
artifacts by SHA-256. Browser evidence records zero serious and zero critical axe
findings. The production dependency audit observed 332 dependencies with two low,
zero moderate, zero high, and zero critical findings; its blocking count was zero.

The final clean verifier ran after the task-4 declarations were promoted from
`planned` to `implemented`. Its 19-command receipt therefore proves the runtime,
promoted coverage, package-ledger, guidance, security, OpenSpec, and diff-hygiene
state together rather than relying on a separate post-promotion assertion.

## Observed failures corrected before the passing run

1. Accessibility checks observed insufficient contrast in task identifiers and in
   the official A2UI surface heading. The example stylesheet now uses contrast-safe
   text colors for both observed elements.
2. A browser assertion expected “not allowed” while the policy correctly emitted
   “not allowlisted”. The assertion now accepts the actual fail-closed terminology.
3. Rejecting an untrusted component could leave a partially mutated surface in the
   official A2UI runtime when an earlier message in the same batch had already
   changed an existing surface. The canonical runtime now preflights the complete
   batch through a shadow official `MessageProcessor` seeded with the current
   surfaces, components, and data. The real processor is untouched unless the whole
   batch succeeds. A focused RED-first package regression proves an earlier data
   update does not commit when a later component is rejected.
4. A prior successful surface remained in the application-owned runtime when a
   later malformed scenario failed before producing a replacement. A RED
   happy-then-malformed regression now proves every scenario start and explicit
   reset remove prior surfaces through official `deleteSurface` messages.
5. A second destructive action could overwrite an unresolved approval request and
   orphan its promise. A RED regression observed the timeout. The approval store
   now denies an overlapping request immediately, retains the original pending ID,
   and lets the original human decision resolve normally.
6. Starting another scenario or resetting while a destructive decision was pending
   left that promise live. A RED regression observed the pending request survive.
   Both boundaries now deny and resolve the request before replacing session state.
7. An external A2A URL could embed username/password credentials and then enter the
   browser-visible transport configuration. A RED package regression now proves the
   canonical executor rejects credential-bearing endpoints before discovery.

Corrections three through seven harden real agent-artifact, external-transport,
and human-authority
boundaries. Message batches are transactional, failed/new scenarios cannot show
stale prior agent UI, stale approvals cannot cross session boundaries, one approval
prompt cannot silently replace another, and browser-visible endpoint configuration
cannot carry URL userinfo credentials.

## Remaining limits

- Vite emitted a non-blocking warning for an approximately 661 kB minified chunk.
  Bundle-size optimization is not a task-5 acceptance requirement and remains a
  visible performance follow-up.
- Dart/Melos, Cargo, Tauri, and native platform gates are not applicable to this
  source-workspace React/Vite change. Their release evidence belongs to the Flutter,
  Tauri, and package/native changes rather than being inferred here.
- The example is deterministic and keyless; it does not certify live external-agent
  connectivity or a model-provider key.
