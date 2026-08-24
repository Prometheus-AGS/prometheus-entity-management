# Task 4 documentation research and Feynman audit

Date: 2026-08-01  
Change: `v3-a2ui-protocol-bridge`  
Depth: shallow (deep-research stages 1–5)

## Plan

The documentation audit answered four adversarial questions:

1. Which version number describes the wire protocol, and which numbers describe npm distributions?
2. Which A2UI concerns remain owned by the official engine?
3. Where does protocol validation stop and application authorization begin?
4. Which claims would falsely imply that the pending A2A agent, agentic showcase, docs deployment, or stable publication is complete?

Firecrawl tools were not callable in this environment, so the skill's search fallback used the available web retriever and only primary project sources. Local source, built artifacts, and packed-consumer receipts remained authoritative for Prometheus-specific API claims.

## Verified source registry

| Source | Claims used | Credibility | Notes |
| --- | --- | ---: | --- |
| [A2UI v0.9 specification](https://a2ui.org/specification/v0.9-a2ui/) | v0.9 is the stable family; v0.9.1 is current; four server-to-client messages; catalogs constrain components | 92/100 | Official living specification; versioned and current |
| [Renderer implementation guide](https://a2ui.org/guides/renderer-development/) | web renderers should reuse `web_core`; v0.9.1 is current production; renderer responsibilities | 94/100 | Official version-aware implementation guidance |
| [Actions and security](https://a2ui.org/concepts/actions/) | actions are renderer events/functions; registered behaviors restrict arbitrary execution; validation errors are structured | 91/100 | Official concept documentation |
| [Official A2UI repository](https://github.com/a2ui-project/a2ui) | v0.9.1 is current production while the project remains early-stage and evolving; catalogs are developer-controlled | 90/100 | Primary repository; status language prevents overclaiming maturity |
| [`@a2ui/web_core` npm package](https://www.npmjs.com/package/@a2ui/web_core) | framework-neutral protocol processing, state, binding, catalog, and schema responsibilities | 82/100 | Primary distribution metadata; local lock/package contents verify exact installed version |
| Local `packages/a2ui-react/src` and packed receipts | exact exports, policy decisions, SSR boundary, distribution versions, CommonJS bundling, visual proof | 98/100 | Direct implementation and executable evidence |

Scores apply the deep-research authority, recency, authorship, cross-reference, and methodology rubric. No unsupported performance or superiority claims were retained.

## Claims and contradiction resolution

- **Claim:** the selected wire contract is `v0.9.1`; `0.10.2` and `0.10.5` are package versions. This is corroborated by official version-aware docs and installed package metadata.
- **Claim:** Prometheus delegates schemas, surface/data-model state, binding, and rendering to official `/v0_9` entry points. Local imports and packed artifacts prove the implementation.
- **Claim:** official validation cannot authorize a tenant, entity, field, or destructive graph action. This is an application boundary established by Prometheus policy and executable denial tests.
- **Apparent contradiction:** official guides call v0.9.1 current production, while the official repository calls the project early-stage and evolving.
- **Resolution:** “current production protocol” describes the selected upstream protocol line; it does not mean the project is immutable or that the Prometheus 3.0 release is certified. Documentation therefore says “implemented bridge” and keeps full release status in progress.

## Sycophancy correction

The first-draft temptation was to call the bridge “production-ready” because all package and browser receipts pass. That wording was rejected. The evidence proves this package boundary only. A2A conformance, the complete agentic example, Flutter/native rendering, Docusaurus deployment, provenance, registry authority, and stable promotion remain open.

## Feynman teach-back

Official A2UI is the blueprint interpreter: it checks that an agent used a known language and then renders the described surface. The Prometheus policy is the security desk: it checks whether the resulting request may touch this tenant, entity, action, and field.

A catalog is an approved vocabulary, not a database credential. A valid boarding pass is not a key to the control tower.

**Protocol validity never grants application authority.**

The package root is the blueprint interpreter plus the security-desk adapter. The `./ag-ui` subpath is the earlier courier console for agent run/message/state events. A courier may carry a blueprint, but it is not the blueprint renderer.

### Skeptic checks

1. **Why not trust catalog validation?** A catalog can allow a Button and a structurally valid action while the action still targets the wrong tenant or forbidden field.
2. **Does bundling official `web_core` for CommonJS create a fork?** No. Prometheus ships the official implementation inside its compatibility artifact because upstream is ESM-only; it does not replace the schemas, processor, or model.
3. **Is moving `EntityChat` breaking for no reason?** It is a deliberate 3.0 correction. Keeping it at the root would preserve a category error and make official A2UI imports ambiguous.
4. **Does the browser fixture certify the agentic showcase?** No. It certifies the built bridge, keyboard policy outcomes, responsive rendering, and accessibility only.

## Grade

The updated package, release, coverage, skills, migration, and roadmap text covers all four research questions. Manual source-grounded grade: completeness 0.98, accuracy 0.99, clarity 0.97, misconceptions absent 1.0, overall 0.985. No documentation gap remains for task 4; downstream deliverables remain explicitly excluded.

