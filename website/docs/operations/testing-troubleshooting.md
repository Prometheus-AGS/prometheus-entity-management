---
title: Testing and troubleshooting
sidebar_position: 4
---

# Test the narrowest truthful boundary

During implementation, run the touched TypeScript check and targeted unit.
At a completed documentation phase, run content/schema checks, snippet
compilation, generated parity, a full Docusaurus build, link/search/sitemap
validation, and representative desktop/mobile routes. Browser visual,
Lighthouse, device, and deployed-route suites are delivery gates.

## A2UI 1.0 and AG-UI 1.0 acceptance (5.0)

Each command takes `--report <file>` (pass it after `--` with pnpm), runs its
negative controls in the same invocation, and exits non-zero if any oracle
fails or any control does not fail. They run against built or packed packages,
never the source tree.

| Command | Covers |
| --- | --- |
| `pnpm run verify:a2ui-v1` | 1.0 surfaces, catalog pairing, envelope keys, renderer and agent functions, user activation, the release-candidate shim (Chromium), and the packed `./headless` export round trip (Node) |
| `pnpm run verify:agui-run-stack` | AG-UI 1.0 runs in `EntityChat`, cancellation of superseded streams, and interrupt approvals through the action policy |
| `pnpm run verify:a2ui-conformance` | the upstream A2UI adapter and accessibility suites at a pinned commit, with every file digest-checked |
| `pnpm run verify:a2ui-examples` | each A2UI example built, served and driven in Chromium; every captured envelope must be `version: "1.0"` |
| `pnpm run verify:flutter-a2ui-v1` | the Flutter showcase on a booted iOS simulator through `a2ui_flutter` 0.3.0 |
| `node scripts/verify-a2a-conformance.mjs` | the official A2UI A2A extension against packed tarballs and `@a2a-js/sdk` 1.3.0 |
| `pnpm run capture:a2ui-visual -- --out <dir>` | screenshots, keyboard trace and accessibility receipt, read back by `verify:a2ui-bridge` through `A2UI_VISUAL_EVIDENCE` |

### Conformance divergences

`tests/conformance/a2ui/divergences.json` lists the upstream cases the package
may fail, each with a reason class (`security-policy`, `upstream-renderer-gap`,
or `not-observable-through-public-API`) and the exact step and assertion of
every failure it allows. A listed case that fails anywhere else, or an entry
naming a case the suite does not contain, fails the run. The report records the
list's SHA-256. Today's entries cover:

- unknown components, which the allowlist refuses on purpose;
- permissive-mode theme dropping, agent-function routing, TextField hints and
  one `aria-hidden-focus` case, which the bundled 0.15.0 renderer does not
  implement;
- subscription counts, which the package does not expose.

Do not widen an entry to make a run pass; fix the behaviour or record a new
reasoned entry.

### Visual accessibility gate

`verify:a2ui-bridge` ends with the visual check, which requires zero axe
violations and zero serious or critical inconclusive results, with one recorded
exception: `aria-prohibited-attr` on the official `a2ui-basic-*` Custom Element
hosts. Those hosts carry `aria-label` without a role by upstream design (the
upstream accessibility suite reads labels from the host), so axe can only
report the rule as needing review. Any other inconclusive result, or that rule
on any other element, still fails the gate.

If you place a surface on a light card inside a dark page, give the card
`color-scheme: light`: the 0.15 components choose their colours with
`light-dark()`, and dark-scheme captions are too faint on a light background.

## Common failures

### A list does not update after an entity mutation

Confirm that the list stores the entity ID and the view resolves rows through
the same graph. Look for copied response objects or a binding that resolved a
second core version.

### A hook loops or refetches continuously

Check stable option/callback identities, the list's `lastFetched` and `stale`
state, subscriber registration, and whether a terminal service error was
recorded. Do not add retries without naming the observed failure scenario.

### Next.js users see each other's state

Remove the mutable server singleton. Create a graph per request, serialize its
state, and hydrate a scoped client provider. Realtime begins on the client.

### Realtime reconnect duplicates or loses state

Inspect tenant/channel/consumer identity, the last acknowledged checkpoint,
offset resume, snapshot recovery, and echo suppression. A green loopback test
does not prove live credentials or hosted infrastructure.

### npm staging returns E401/E403

Run `npm login --auth-type=web`, confirm the account has write access and 2FA,
then run `pnpm run release:npm-trust:verify`. The exact trust must name
`Prometheus-AGS/prometheus-entity-management`, `publish.yml`, `npm-rc`, and only
stage-publish permission. Do not add a long-lived token to make OIDC pass.

### GitHub Pages loads the homepage but deep routes fail

Verify `baseUrl`, explicit trailing slashes, `.nojekyll`, and that every route
probe uses `/prometheus-entity-management/`. Search assets and evidence URLs
must also resolve below the repository base path.
