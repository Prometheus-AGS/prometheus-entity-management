# Boundary run 2 (repair attempt 1) — stopped at step 6 (FAIL)

Steps 1–5 exited 0. Step 6 `verify:a2ui-bridge`: every packed consumer passed (ESM, CommonJS, NodeNext, Node16,
AG-UI subpath and the server-render consumer, which the @a2ui/react patch now allows), then
`verify-a2ui-visual-evidence.mjs` failed `accessibility.axe.serious === 0` (actual 1) in verifyOutcomesAndAccessibility:

- `color-contrast` (serious violation): the certification page's light card sits in a dark page
  (`color-scheme: dark`), so the official 0.15 Text caption uses its dark-scheme default `#aaa` on `#f2f8f4`.
  Repair candidate: `.official-surface { color-scheme: light }` in tests/fixtures/a2ui-browser (page styling).
- `aria-prohibited-attr` (serious, axe "incomplete"): the official 0.15 Custom Element hosts carry `aria-label`
  with no role. The upstream accessibility conformance suite reads labels from the host (`ownAttribute(host,
  "aria-label")`) and expects the Button's role to resolve to `button`, so adding `role` to the host would break
  upstream conformance. Needs an operator decision; see the session.

Steps 7–14: NOT_EXERCISED.
