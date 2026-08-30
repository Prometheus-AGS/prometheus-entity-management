# Decision under review: defer the unstarted usability study

## Decision

Honor signed KBD decision `v3-devtools-usability-gate-revised`: the unstarted
12-developer formative study becomes optional post-release product research and
does not block React inspector archive or the phase. Preserve the zero-
participant report as blocked, never count automated runs as participants, and
make no human-usability or “world class” certification claim.

## Authority and verification

The operator explicitly directed the phase to finish. KBD event revision 437
records that instruction as an immutable signed decision, plan revision 10
records the course correction, and revision 439 resumes the phase. The retained
receipt is checked against the canonical runtime by
`scripts/verify-devtools-study-decision.mjs`; `prometheus kbd status` and
`prometheus kbd audit` replay the journal before returning state/events, and KBD
runtime replay rejects invalid event signatures. The event actor is `gqadonis`
and its signer key
`ed25519:2c27c749aebaedf4ffa5dfe5b5021f360eb1356153f34a2f490883cfa7c32349`
is present in canonical `operatorKeyIds` as an active, unrevoked operator key.

## Assumptions

- The operator owns this product-evidence threshold and may revise it.
- This decision closes a source/archive boundary only. npm, pub.dev, and Chrome
  Web Store publication are explicitly excluded from this phase and remain
  separately gated, so no registry authority is being bypassed here.
- The study was introduced as an internal qualitative product target, not as a
  legal, security, privacy, or interoperability control. Security and protocol
  claims remain bound to their separate integration and review evidence.
- Existing packed Vite/Next/Chromium evidence supports only the functional,
  accessibility, performance, and security claims it directly exercises.
- Deferral does not erase or convert the historical zero-participant result.
- No downstream Chrome-extension, documentation, or release gate may describe
  this inspector as human-validated; those changes certify their own functional
  surfaces and inherit the explicit non-certification statement.

The product reasoning is independent of signing authority: the complete packed
acceptance gate proves the workflows function, remain accessible, meet their
declared performance budgets, exclude production roots, and cannot commit
application state. It does not prove first-time human discoverability. That
remaining risk is bounded at this source-only archive by explicit opt-in,
ordinary-root exclusion, a removable import, no registry mutation, retained
research protocol, and a patch-level disable path. The operator judged that
bounded and reversible risk lower than continuing to hold four downstream
changes behind unstaffed qualitative research.

## Falsifier

Reject this decision before archive if the signed event fails canonical KBD
replay, if any public/archive artifact calls the study passed or calls the UI
human-certified or “world class,” if an external authority applies a human-
study requirement to this source-only boundary, or if the assembled integration
evidence cited for the remaining claims is invalid.

Reopen the design when either of these observable conditions occurs: (1) the
first 12 voluntary developer sessions using the retained
protocol produce fewer than 10 unassisted completions or either cohort median
is 10 seconds or longer, or (2) two independent filed issues show that the
launcher obscures a workflow or that a developer cannot identify a dirty entity
and its rendered views. Travis James owns recruitment through maintainer and
GitHub issue channels and owns the checkpoint. Review it 30 days after the first
release containing the DevTools entries or 90 days after this archive,
whichever comes first. If fewer than 12 sessions exist at that checkpoint, the
study becomes a mandatory gate for the next DevTools feature release; this does
not manufacture a failure or retroactively rewrite the current functional
evidence. The owner must classify available evidence, revise the UI when a
threshold fails, and ship a patch. A severe obstruction disables the explicit
auto-bootstrap entry in that patch while preserving the side-effect-free manual
entry.

“First-time” means no prior orientation to this inspector; “oriented” means the
participant received the retained protocol orientation. “Release” means the
first tagged source or registry release containing the DevTools entries,
whichever occurs first. The reinstated gate may be revised only by another
explicit operator decision with its own isolated decision review; it cannot be
silently waived. Human override remains possible as required by repository
governance.

The 10-of-12 and 10-second values are the retained phase's explicit product
targets for the seeded dirty-entity/rendered-view protocol, not statistically
derived thresholds. Two independent issues is an explicit conservative
judgment for a severe workflow obstruction, not a research statistic.

## Alternatives considered

- A 3–5 person informal sample could expose large discoverability problems but
  would provide neither the retained protocol's stated evidence nor the
  operator-directed immediate closure. No participant outreach was authorized;
  the operator chose not to delay archive for partial human evidence.
- Keeping archive complete but retaining a separate release blocker would
  preserve the same effective block the operator explicitly removed.
- A staged rollout is already inherent: the ordinary package root excludes the
  inspector and consumers must explicitly import `./devtools` or
  `./devtools/auto`; no registry publication occurs in this phase.
- Deleting the study protocol would erase useful product research and was
  rejected. The protocol and zero-participant report remain retained.

The original gate existed to test whether developers could quickly discover a
seeded dirty entity and every rendered view before calling the UI “world class.”
That rationale still applies to any human-usability claim. This decision moves
the early-adopter discoverability risk to an explicit opt-in source surface; it
does not refute or satisfy the original qualitative question.

## Consequence if accepted

Task 12 may close only after this decision review and a final revised-packet
diff review pass their sycophancy screens. The Chrome extension may then start.
The cost of being wrong is a confusing optional debugging surface and lost
developer time, not corruption of application business state; the inspector
has no commit authority and can be removed by dropping the explicit import.
Chrome and release work must not treat this archive as human-usability evidence,
and disabling auto-bootstrap may be a breaking inconvenience for opt-in users;
that is the declared remediation tradeoff.
