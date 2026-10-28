# web_core Node-loadability probe

Recorded by `a2ui-webcore-node-probe#3` on 2026-10-28. Observed, not inferred: every result below came from running code in this session. Environment: Node v24.18.0, Darwin x86_64, `@a2ui/web_core` 0.12.0, `@a2ui/react` 0.12.0, `@a2ui/markdown-it` 0.2.0, installed from the repo's frozen lockfile (workspace install, exit 0, lockfile unchanged). Probe scripts were fed on stdin from `packages/a2ui-react`; nothing was written into the repository.

## Verdict

**GO for the headless entry, as far as `web_core` is concerned.** `@a2ui/web_core` 0.12.0 imports and processes messages under plain Node, with no DOM. The decision to build `a2ui-headless-export` still depends on the operator's D2, and on the limits stated below.

## Step A: imports (11 of 11 loaded)

`@a2ui/web_core` (83 exports), `/state`, `/reactivity`, `/catalog`, `/processing`, `/v0_9` (200), `/v0_9/basic_catalog`, `/v1_0` (89), `/v1_0/basic_catalog`, `/errors`, `/validating`. Also `@a2ui/react/v0_9` (25), `@a2ui/react` (38) and `@a2ui/markdown-it` import under Node. Globals observed: `window`, `document` and `HTMLElement` are undefined; `customElements` is an object (cause not investigated).

## Step B: a real message sequence through `MessageProcessor` (v0_9, `basicCatalog`, protocol `v0.9.1`)

| # | Operation | Observed |
|---|---|---|
| 1 | `createSurface` | surface created |
| 2 | `updateComponents` (root, child, an unreferenced component) | all three components exist |
| 3 | `updateDataModel` at `/user` | value readable |
| 4 | duplicate `createSurface` | **throws** `A2uiStateError: Surface s1 already exists.` |
| 5 | `updateComponents` on a missing surface | **throws** `A2uiStateError: Surface not found for message: nope` |
| 6 | `updateDataModel` at path `/` | **replaces the whole model**: a previously set `/keep` and `/user` were gone |
| 7 | `updateComponents` naming only one component | unmentioned component **persists**; the mentioned one's properties are replaced |
| 8 | data-model subscription callback | **fires synchronously**, before `set` returned, with only the new value |
| 9 | `deleteSurface` | surface gone |
| 10 | `createSurface` after delete | surface created again |

Results 4 to 8 were previously only read from source. They are now observed, and they are the facts the idempotency design rests on (strip `createSurface` for held surfaces; filter whole-model data writes; orphan components persist; no async gap in data notifications).

## Disclosed script errors

Two probe lines first failed because of mistakes in the probe script, not `web_core`: step 2's component count called a method that is not a function, and step 8 used the wrong `subscribe` signature (it takes a callback). Both were re-run with the correct calls and the corrected results are the ones above.

## What this does not establish

- Only `@a2ui/web_core` and import-level behavior of `@a2ui/react` were exercised. **Rendering** React components under Node was not tried and is not expected to work; a headless entry must not depend on it.
- `@a2ui/react/v0_9` loads under Node, so the catalog split in `a2ui-headless-export#1` is needed to keep React out of the headless bundle and its dependency surface, not to make Node load the module.
- One platform and one Node version. The repo-installed package was used, not a packed tarball.
- The v1_0 entries were imported but no v1.0 messages were processed.
