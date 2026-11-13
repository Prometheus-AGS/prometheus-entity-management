# Review round 2 resolution (judge gpt-6.1-sol)

| Area | Finding | Verdict | Action |
|---|---|---|---|
| lib | headless entry imports Lit Custom Elements, breaking plain-Node import | rejected | probe: `node -e 'import("./dist/headless.mjs")'` loads (13 exports); the bundled Lit uses its Node build. Acceptance (UPG-13, UPG-9) still exercises it on the packed tarball |
| lib | interrupt ids like "constructor"/"__proto__" read as decided via inherited properties | accepted | own-key lookups (hasOwn) in claim, decide and snapshot |
| lib | changing graphStore left the subscription on the old graph | accepted | subscribe depends on opts.graphStore |
| a2a | inbound replies gated on the reference agent's catalog | accepted | inbound replies need any A2UI 1.0 offer (rendererCapabilitiesOf) |
| examples | Flutter store accepted a createSurface-only batch | accepted | refused with INCOMPLETE_SURFACE when the surface has no root component |
| acceptance | conformance ignored a nonzero Playwright exit | accepted | spec records only; verifier fails on any nonzero exit |
| acceptance | UPG-1 control used a different (UPG-17) surface | accepted | control sends the UPG-1 messages with version "v1.0" |
| acceptance | Flutter receipt did not digest the surface messages | accepted | report.pins.digests.surfaceMessages |
