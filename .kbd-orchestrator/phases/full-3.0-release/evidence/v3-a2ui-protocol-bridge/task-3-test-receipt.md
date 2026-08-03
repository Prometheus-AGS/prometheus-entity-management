# Task 3 test receipt

Captured 2026-08-01 for the built `@prometheus-ags/a2ui-react` official A2UI v0.9.1 bridge.

## BDD

- Red: `pnpm run bdd:a2ui-bridge` exited 1 with 5 failed scenarios before implementation and browser evidence existed; see `bdd-red.md`.
- Green: the unchanged feature completed with 5 scenarios, 28 steps, and 4 hooks passing.

## Unit and integration

- `pnpm run test:a2ui-bridge`
- Vitest: 13/13 official runtime, renderer, policy, action-dispatch, hook, and SSR tests passed.
- Node release contract: 5/5 package, architecture, BDD, packed-verifier, and visual-evidence tests passed.

## Packed consumers

- Built the core and A2UI packages and ran `scripts/verify-a2ui-protocol-bridge.mjs` against packed tarballs.
- Node ESM, CommonJS, TypeScript NodeNext, server rendering, root export separation, and the legacy `./ag-ui` subpath passed without workspace aliases.
- Machine-readable receipt: `packed-consumer-report.json`.

## Browser and accessibility

- Chrome 150 loaded the built `packages/a2ui-react/dist/index.mjs` at the fixed local route.
- Keyboard-only Tab/Enter activation recorded `executed`, `unauthorized-field`, and `approval-denied` with zero pointer clicks.
- axe-core 4.12.1 reported zero critical, serious, or incomplete critical/serious findings.
- Desktop and 390px mobile screenshots, a Playwright trace, and WebM recording are immutable-hash verified by `pnpm run verify:a2ui-visual`.
- Representative contrast ratios range from 10.04:1 to 18.14:1; action targets measured 601x85 CSS pixels; the final focus ring measured 3px solid.

## Static gates

- `pnpm --filter @prometheus-ags/a2ui-react typecheck` passed.
- ESLint passed for all task-owned TypeScript, TSX, test, fixture, and verification files.
