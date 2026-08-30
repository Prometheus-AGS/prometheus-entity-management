# Decisions

## 2026-08-29 — Keep 3 entry points explicit

The ordinary React root remains the production-safe application API.
`./devtools` is the side-effect-free explicit host/provider surface and
`./devtools/auto` is the only import-time mount. The skills ledger and API
generator now model all 3 independently.

## 2026-08-29 — Treat local and serialized values differently

The same-origin embedded inspector may read the selected local graph. Browser,
VM-service, extension, and other serialized transports remain metadata-only
until the host opts into include mode and applies redaction. This is the real
trust boundary and is named in every public guide.

## 2026-08-29 — Do not convert automated polish into a human-usability claim (superseded in part)

Packed browser accessibility and performance evidence can certify those
mechanical criteria. It cannot substitute for the accepted 12-developer
formative study. Until retained participant results exist, artifact-refiner
must report the archive gate as blocked and the phrase “world class” as
unverified. The archive-blocking portion of this decision was superseded by
signed KBD decision `v3-devtools-usability-gate-revised` on 2026-08-30. The
prohibition on manufacturing a human-usability claim remains active.

## 2026-08-30 — Defer the study without manufacturing a pass

The operator explicitly removed the unstarted 12-developer study as an archive
and release blocker. The retained zero-participant report remains blocked and
automated evidence remains ineligible as human evidence. Artifact Refiner may
converge on the functional, accessibility, security, performance, and public-
record constraints while prohibiting human-usability and “world class” claims.
