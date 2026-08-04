# Refinement log — `v3-flint-portable-contracts-archive-qa`

## Iteration 1 — 2026-08-04T12:12:45Z

### Delta first

Tasks 1–5 produced dependency, implementation, regression, synchronization,
external-source, real-SDK, clean-CI, and remote-matrix evidence. They did not
yet reconcile those receipts against every plan criterion or persist the
archive's React/npm and unbuilt-adapter limits in one constraint artifact.

### Execute

- Passed 7/7 Flint Node regressions and 6/6 BDD scenarios with 20/20 steps.
- Passed the portable verifier with zero client secrets and no requested
  external source in the default lane.
- Retained the task-5 pass against fourteen hash-bound external files and the
  real Realtime Fabric SDK 1/1 normalized-graph round trip.
- Passed all 13 shared scenarios and 16 stable capability/artifact mappings;
  aggregate coverage remains `in-progress` and `releaseCertified` remains
  false.
- Passed React 203, sync 16, A2UI 18+9, A2A 30+2, Tauri 26/57, and Dart 81
  public export ledgers.
- Passed strict active-change OpenSpec validation and workflow actionlint.
- Confirmed the task-5 candidate's Node 22/24/26 and Tauri remote jobs passed.
- Confirmed remote `main@1c40eaa`, npm `latest: 2.2.0`, `alpha:
  3.0.0-alpha.0`, and absent `next` remain unchanged.

### Reflect

All eight blocking constraints have direct evidence. The result supports
archive of this bounded Flint change, not publication, stable 3.0, an unbuilt
Forge adapter, mutable-ref live evidence, or client service-role access. No
implementation correction is observed before independent review.

### Persist

Persisted specification, plan, constraints, manifest, validation, reflection,
decision, log, and converged state under refinement ID
`eab2c50d-ca1e-4046-b26c-eb8c85a0aa3e`.

## Iteration 2 — 2026-08-04T12:36:21Z

### Delta first

The first isolated review blocked on two evidence-integrity defects rather
than an implementation defect: the two manifest outputs were ignored/untracked,
and the clean/remote receipt proved `bcecaed` while the cumulative source had
advanced to `5ef6ea3`.

### Execute

- Force-tracked both declared `dist/` outputs.
- Recreated clean detached entity, Realtime Fabric, Gate, and Forge worktrees
  at the exact revisions declared by the cumulative change.
- Passed frozen installs, both Realtime SDK builds, one serialized full root
  CI run, all fourteen external source hashes, the real SDK 1/1 round trip,
  strict OpenSpec, and actionlint.
- Confirmed Node 22/24/26 and the Tauri packed consumer passed remotely at the
  exact `5ef6ea3` source.
- Restored generated A2A/browser receipts before proving the detached entity
  worktree clean and removing all temporary worktrees.

### Reflect

The review findings were valid and are now closed with current direct evidence.
All eight constraints remain satisfied; no product source correction was
required or introduced.

### Persist

Updated the current-head clean receipt, QA state, reflection, decision, log,
manifest, validation output, and mirror report before repeating isolated
review.

## Iteration 3 — 2026-08-04T12:44:26Z

### Delta first

The second isolated review found a product-integrity defect that the first two
deterministic passes missed: matching file hashes could be accepted from a Git
worktree whose `HEAD` did not equal the contract's pinned revision.

### Execute

- Resolved `HEAD^{commit}` for every supplied external root and required exact
  equality before any source hash is accepted.
- Added a regression using a valid Git worktree at the wrong revision and
  preserved the independent hash-drift regression by rebinding its temporary
  contract to its test commit.
- Passed 8/8 focused Flint tests, focused ESLint, Node syntax, diff hygiene,
  and positive external verification against the exact Realtime Fabric, Gate,
  and Forge revisions.
- Updated operator and skill guidance to state the Git-identity requirement.

### Reflect

The critical finding was correct. File content identity does not prove commit
identity, so the source-integrity constraint was not satisfied until both were
checked. The correction is limited to the actual external-input trust boundary.

### Persist

Updated validation, verification, clean-gate, decision, reflection, and QA
state before repeating the cumulative isolated review.

## Iteration 4 — 2026-08-04T13:04:46Z

### Delta first

The fourth isolated review found that exact `HEAD` plus filesystem hashing did
not prove the checked bytes belonged to that commit: a dirty worktree could
retain the pinned `HEAD` while supplying different source bytes.

### Execute

- Hash every declared file from the pinned Git commit object.
- Independently hash the corresponding working-tree file before accepting it.
- Added separate committed-source-drift and dirty-working-tree regressions,
  while retaining the wrong-revision and exact-positive cases.
- Passed 9/9 focused Flint tests, focused ESLint, syntax, diff hygiene, and the
  exact three-repository positive verifier.
- Regenerated the retained task-6 receipt with `committedFiles: 14`,
  `workingFiles: 14`, and all three verified revisions.

### Reflect

The finding was correct. Commit identity, committed bytes, and consumed
working-tree bytes are three distinct claims and now have independent checks.

### Persist

Updated the operator/skill guidance, receipts, constraints, QA state,
reflection, and validation artifact before another cumulative isolated review.

## Iteration 5 — 2026-08-04T13:10:57Z

### Delta first

The fifth isolated review found that the zero-client-secret claim only covered
a narrow source-extension allowlist and omitted common `.env*`, YAML, TOML, and
native configuration surfaces.

### Execute

- Replaced the source-extension allowlist with text-like/binary classification
  over every file under `examples/`.
- Added explicit binary extensions plus an 8 KiB NUL probe before reading text,
  while ignoring generated `.gradle` cache directories.
- Added a `.env.local` service-role regression.
- Passed 10/10 focused Flint tests, focused ESLint, syntax, diff hygiene, and
  the exact three-repository positive verifier.
- Regenerated the retained receipt: 428 text-like files inspected, 112 binary
  files classified separately, and zero exposed credentials.

### Reflect

The finding was correct. A statement about every client example cannot be
supported by a source-language allowlist; configuration files are part of the
actual credential boundary.

### Persist

Updated operator/skill guidance, current receipts, constraints, validation,
reflection, decisions, and QA state before the next isolated review.

## Iteration 6 — 2026-08-04T13:23:37Z

### Delta first

The sixth isolated review found two remaining verifier gaps: the portability
rule omitted Linux and non-home absolute Flint roots, and generated example
subtrees were excluded while the credential evidence claimed all text-like
example files.

### Execute

- Added macOS, Linux, root, Windows-profile, and non-home absolute Flint-root
  rejection with focused positive and relative/URL negative cases.
- Traversed `.next`, `build`, `dist`, and `target` for client-secret evidence;
  retained only explicit third-party `node_modules`, Git metadata, and
  `.gradle` cache exclusions and listed every encountered exclusion.
- Passed 11/11 focused Flint regressions, focused ESLint, Node syntax, and the
  default portable verifier.
- Inspected 481 repository-owned text-like source/config/generated files,
  classified 250 binaries, and found zero exposed credentials.
- Refreshed all three sibling remote refs. Realtime Fabric and Gate main remain
  at their pins. Forge main advanced to
  `0135946cec589c1059a9f82ac373c7cb6c12e387` without changing any of the four
  hashed provisioning files; the exact three-root verifier passed after the
  Forge revision pin advanced.

### Reflect

Both critical findings were valid. Credential evidence must cover generated
client artifacts as well as authored inputs, and portability cannot encode one
operator's home-directory conventions. Dependency/cache exclusions are now
truthfully bounded and machine-visible rather than implied to be scanned.

### Persist

Expanded the planned five QA iterations to six because valid critical review
findings required another correction. Updated verifier, regression, docs,
skills, contract pin, receipt, constraints, validation, reflection, decisions,
log, manifest, state, and evidence mirror before another isolated review.

## Iteration 7 — 2026-08-04T13:31:40Z

### Delta first

The seventh isolated review found a real Windows drive-root path omission and
asked for direct evidence covering generic service-role env names. The latter
was already rejected by the generic key-identifier regex, but lacked an
explicit regression.

### Execute

- Added arbitrary Windows drive-root Flint sibling detection and a
  `D:\\checkouts\\flint-gate` regression.
- Added an assignment-specific generic service-role rule plus a
  `SUPABASE_SERVICE_ROLE_KEY` `.env.production` regression, while retaining the
  existing generic key-identifier rule.
- Passed 12/12 focused Flint regressions, 6/6 BDD scenarios with 20/20 steps,
  focused ESLint, Node syntax, default verifier, and diff hygiene.
- Passed the current aggregate test gate with 96/96 scenarios, 448/448 steps,
  all package/release tests, and 3/3 React browser flows, plus the complete
  skills/export gate.
- Regenerated the exact three-repository receipt with the refreshed Forge main
  revision and zero client credentials.

### Reflect

The Windows finding was valid. The Supabase example in the finding did not
actually evade the current regex, so the correction records that distinction
and strengthens proof rather than claiming a nonexistent prior bypass.

### Persist

Expanded the QA history to seven iterations because another valid platform
path defect required correction. Updated verifier, tests, docs, skills,
receipts, QA outputs, reflection, decisions, log, manifest, and state before a
fresh isolated review.

## Iteration 8 — 2026-08-04T13:41:20Z

### Delta first

The eighth isolated review found that a real service-role JWT value could be
hidden behind a public-looking variable name because the scanner classified
names and key prefixes but not token payload roles.

### Execute

- Added token-shaped JWT payload decoding for scanned client text.
- Recursively rejected `role` or `roles` claims containing `service_role` or
  `service-role`.
- Added a `NEXT_PUBLIC_SUPABASE_ANON_KEY` regression carrying a service-role
  JWT value.
- Passed 13/13 focused Flint regressions, 6/6 BDD scenarios with 20/20 steps,
  focused ESLint, Node syntax, the default verifier, and diff hygiene.
- Regenerated the exact three-repository receipt with zero exposed credentials.

### Reflect

The finding was valid and traced to the actual browser/example credential
boundary. Name-only secret detection cannot support a claim about credential
values; decoding the non-secret JWT payload is the minimum direct check.

### Persist

Expanded the QA history to eight iterations because the value-level bypass was
a valid critical defect. Updated verifier, tests, docs, skills, receipts, QA
outputs, reflection, decisions, log, manifest, and state before a fresh
isolated review.

## Iteration 9 — 2026-08-04T13:46:30Z

### Delta first

The ninth isolated review found two valid delimiter variants: Windows drive
paths written with forward slashes, and JWT signatures ending in a base64url
`-` character that conflicts with regex word-boundary semantics.

### Execute

- Changed the Windows drive-root Flint pattern to accept `/` or `\\` at every
  separator and extended the path regression with `D:/checkouts/flint-gate`.
- Replaced JWT word boundaries with explicit negative base64url-character
  lookarounds, allowed the empty signature segment used by unsecured compact
  JWTs, changed the service-role regression signature to end in `-`, and added
  a direct empty-signature assertion.
- Passed 13/13 focused Flint regressions, 6/6 BDD scenarios with 20/20 steps,
  focused ESLint, Node syntax, the default verifier, and diff hygiene.
- Regenerated the exact three-repository receipt with zero exposed credentials.

### Reflect

Both findings were valid. Separator and token-boundary rules must be defined in
the target grammar rather than borrowed from host conventions or regex `\b`.

### Persist

Expanded the QA history to nine iterations because both bypass variants were
valid critical defects. Updated verifier, tests, receipt, QA outputs,
reflection, decisions, log, manifest, and state before a fresh isolated review.

## Iteration 10 — 2026-08-04T13:49:26Z

### Delta first

The tenth isolated review found a forward-slash Windows user-profile form and
a JWT header serialization that does not share the common `eyJ` prefix.

### Execute

- Changed Windows profile matching to accept `/` or `\\` consistently and
  added `C:/Users/alice/project/file.ts` to the path regression.
- Extracted generic compact base64url triplets, decoded both header and payload
  as JSON, required a string `alg` header field, and retained recursive
  service-role claim inspection.
- Changed the JWT regression header to valid JSON with leading whitespace,
  retained `-` and empty signature coverage, and passed 13/13 focused tests.
- Passed 6/6 BDD scenarios with 20/20 steps, focused ESLint, Node syntax,
  default and exact-source verifiers, and diff hygiene.

### Reflect

Both findings were valid. A security scanner must identify a JWT from its
compact structure and decoded header, not a common serialization prefix.

### Persist

Expanded the QA history to ten iterations because both bypasses were valid
critical defects. Updated verifier, tests, receipt, QA outputs, reflection,
decisions, log, manifest, and state before a fresh isolated review.

## Iteration 11 — 2026-08-04T13:52:51Z

### Delta first

The eleventh isolated review found that a Windows UNC network share could hold
an absolute Flint sibling root without matching the Unix or drive-letter rules.

### Execute

- Added UNC Flint-root detection for network server/share paths.
- Extended the path regression with `\\server\\share\\flint-gate`.
- Passed 13/13 focused Flint regressions, 6/6 BDD scenarios with 20/20 steps,
  focused ESLint, default and exact-source verifiers, and diff hygiene.

### Reflect

The finding was valid. UNC is a distinct absolute-path grammar and must be
covered explicitly when the evidence claims cross-platform machine portability.

### Persist

Expanded the QA history to eleven iterations, updated verifier, tests, receipt,
QA outputs, reflection, decisions, log, manifest, and state, then prepared a
fresh isolated review.

## Iteration 12 — 2026-08-04T13:56:01Z

### Delta first

The twelfth isolated review found that an OAuth-style scalar `roles` string
could contain multiple roles while the scanner compared the whole string.

### Execute

- Tokenized string `role`/`roles` values on whitespace, comma, semicolon, and
  pipe delimiters before exact normalized comparison.
- Changed the service-role JWT regression payload to
  `roles: "authenticated service_role"`.
- Passed 13/13 focused Flint regressions, 6/6 BDD scenarios with 20/20 steps,
  focused ESLint, default and exact-source verifiers, and diff hygiene.

### Reflect

The finding was valid. Role claim formats can be scalar lists; exact token
matching after bounded delimiter normalization avoids both bypasses and prose
substring false positives.

### Persist

Expanded the QA history to twelve iterations, updated verifier, tests, receipt,
QA outputs, reflection, decisions, log, manifest, and state, then prepared a
fresh isolated review.
