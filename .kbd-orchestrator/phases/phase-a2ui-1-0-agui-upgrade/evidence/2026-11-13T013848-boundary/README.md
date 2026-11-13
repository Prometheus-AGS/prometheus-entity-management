# Boundary run 13 (repair attempt 12) — stopped at step 13 (FAIL)

Steps 1–12 exited 0. Step 13 `verify:flutter-a2ui-v1`: the app built and launched on the first attempt. The
integration test passed every assertion up to line 64 — the A2UI 1.0 surface rendered through a2ui_flutter, the denied
delete left its denial receipt with no graph change, the allowed update left its receipt and changed the graph — then
failed with "Bad state: No element" at `ensureVisible(find.widgetWithText(SwitchListTile, 'Load hostile …'))`.
The negative control failed at its flipped assertion as required.

Root cause (test defect): the switch sits above the surface in the page's ListView; after the test scrolled down to
press the actions, the list no longer built that row, so the finder had nothing to make visible.
Repair (attempt 13): `dragUntilVisible` scrolls the list back until the switch is built and visible. Step 14:
NOT_EXERCISED.
