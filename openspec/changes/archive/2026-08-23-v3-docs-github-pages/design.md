# Design: v3-docs-github-pages

## Candidate reuse decisions

### cand-021 — Docusaurus 3.10.2

- **Verdict:** adopt
- **Decision:** Adopt the current official Docusaurus line and adapt the existing Prometheus skill-pack Pages pattern, while keeping documentation dependencies in a private workspace package.
- **Evidence:**
  - Tier 1: Docusaurus builds static output suitable for GitHub Pages and requires all @docusaurus packages to stay on one version. (https://docusaurus.io/docs/installation)
  - Tier 1: Docusaurus supports release-aware documentation routes, version selectors, banners, and bounded retained versions. (https://docusaurus.io/docs/versioning)
  - Tier 1: The sibling Prometheus skill-pack site supplies a proven Prometheus organization/base-path, local search, Mermaid, canonical-content, and pinned Pages workflow donor pattern. (file:///Users/gqadonis/Projects/prometheus/prometheus-skill-pack/site/docusaurus.config.js)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

