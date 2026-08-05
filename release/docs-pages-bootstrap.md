# Documentation Pages rollout

## `v3-docs-pages-bootstrap`

The first production rollout publishes only verified progressive content:
entity graph theory, the package and API surface, React/Vite, Flutter core and
Riverpod, A2A/A2UI protocol boundaries, the Tauri plugin/application boundary,
the portable Flint integration, migration/operations, and allowlisted current
evidence. A route is omitted until its implementation and evidence contract is
true; no public page uses filler text to reserve a future claim.

Pull requests execute the targeted documentation contract, npm package build
needed by packed TypeDoc/snippet generation, and Docusaurus build. They have
read-only permissions and cannot upload or deploy Pages. Pushes to protected
`main` use the same artifact, upload it, and deploy through the `github-pages`
environment with `pages: write` and `id-token: write` only. Deployment is
serialized and the environment records its public URL.

The workflow intentionally does not run the repository's complete CI,
Flutter/Rust matrices, Tauri bundles, Playwright device suite, or release
certification. Those are higher-tier gates owned by their changes.

## `v3-docs-github-pages`

Final content certification adds deployed homepage/deep-route/search/404
probes, keyboard/mobile/axe/visual checks, and Lighthouse budgets. The repository
homepage and root README public link are changed only after
`https://prometheus-ags.github.io/prometheus-entity-management/` responds and
representative routes return non-empty success responses.
