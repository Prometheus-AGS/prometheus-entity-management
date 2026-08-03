# Stable 3.0 release proof system

The core idea: a stable release is a chain of evidence that the thing users install behaves like the thing the project promises.

Think of it as a passport, not a birthday. Changing `3.0.0-alpha` to `3.0.0` only changes the printed date. A passport becomes trustworthy because identity, authority, anti-tamper marks, and border checks all agree. Here, the identity is the release contract, the sealed object is each packed artifact, the border checks are clean consumer tests, and provenance links the registry artifact to its source and workflow.

It is also like a city water system. The normalized graph is the reservoir: every framework view should draw from the same canonical supply. React, Flutter, Tauri, A2UI, and the other bindings are faucets and pipes. A polished faucet is not evidence of clean water, and a second hidden reservoir defeats the design. The examples therefore prove both the user interaction and the shared graph semantics.

Finally, the evidence bundle is a flight recorder. Gherkin names the promised flight behavior; assertions say whether it happened; traces preserve the internal sequence; video and screenshots help a reviewer see it; and a hash manifest proves those records belong to the exact candidate commit. The picture is useful, but it does not replace the instruments.

The practical consequence is three release gates. First establish contracts and installable packages. Then prove capabilities across the five examples and platform adapters. Last, build the branded documentation product, rehearse an RC without touching `latest`, certify one immutable SHA, and ask for the external authority needed to publish stable artifacts.

## Teach the skeptic

**“This is too much ceremony for a library.”** The library claims cross-framework normalization, realtime behavior, local-first sync, agent-rendered UI, mobile support, and multiple package formats. Each claim adds a different failure boundary. The evidence is proportional to those public claims; cutting a claim also cuts its required proof.

**“If the monorepo tests pass, packed consumers are redundant.”** Monorepo aliases can bypass package exports, tarball file lists, peer resolution, and declaration routing. A passing source test cannot detect a missing `.cjs` file or a declaration branch that was never packed.

**“Official A2UI or Tauri tooling should own the security and release guarantee.”** Those tools define protocol/rendering or platform mechanics. The application still owns which entity actions are authorized, while the release owner still controls signing credentials, registry tags, and rollback. Tool adoption cannot transfer those responsibilities.

## Transfer problems and source-grounded answers

1. A release candidate passes every workspace test, but a clean CommonJS consumer fails to `require` the core package. Should the RC advance to documentation and publication? **Answer:** No. Inspect the packed tarball and its conditional export/declaration targets, add or fix the isolated CommonJS fixture, and rerun the candidate gate. Workspace success cannot waive artifact identity.

2. A Flutter A2UI screen renders correctly and a Tauri desktop build passes, but there is no denied-action test, no mobile command smoke evidence, and no signing authority. What may the release claim? **Answer:** It may claim an experimental Flutter protocol demonstration and a working Tauri desktop/shared-code path only after the corresponding behavioral tests pass. It may not claim safe agent mutation, certified mobile operation, or store-ready distribution.
