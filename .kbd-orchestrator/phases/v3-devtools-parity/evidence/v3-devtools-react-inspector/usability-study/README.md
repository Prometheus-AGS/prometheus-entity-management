# React DevTools formative usability study

This directory is the retained human-evidence boundary for the React inspector
certification gate. Automated browser runs do not count as participants.

## Gate

- Recruit at least 12 developers across both `first-time` and `oriented`
  cohorts. The recruitment target is six per cohort.
- Give every participant the same combined task in `protocol.md`.
- At least 10 of the first 12 participants must diagnose the dirty entity and
  identify every registered rendered view without assistance.
- Each cohort's median combined completion time must be below 10,000 ms.
- Retain one anonymized JSON record per participant in `results/`.

The evaluator applies the same 10/12 success ratio if more than 12 sessions are
retained; it never selects a favorable subset. It rejects duplicate participant
IDs, malformed records, missing consent, unknown cohorts, and records that do
not identify the fixed fixture answers.

## Runbook

1. Prepare a disposable packed fixture from the exact commit under study. The
   output path must not already exist:

   ```bash
   node scripts/verify-devtools-react-inspector.mjs --prepare-study /tmp/pem-react-devtools-study
   pnpm --dir /tmp/pem-react-devtools-study/consumer/apps/vite dev --host 127.0.0.1 --port 4191
   ```

   Open `http://127.0.0.1:4191/?study=1`. The study mode seeds the fixed graph
   and masks entity/view identifiers in the host UI while keeping the three
   public list-hook renderers mounted.
2. Read `protocol.md` completely before facilitating a session.
3. Record recruitment activity in `recruitment-log.json`; do not add names,
   email addresses, employer names, or free-form participant biography.
4. Copy `participant-result.template.json` to
   `results/<anonymous-participant-id>.json` and replace every placeholder.
5. Evaluate the retained set:

   ```bash
   pnpm run devtools:study:evaluate
   ```

6. When the command reports `pass`, retain its generated
   `evaluation-report.json` with the participant records and use that record for
   Artifact Refiner convergence and KBD archive certification.

`evaluation-report.json` is generated evidence. A `blocked` report means fewer
than 12 valid participants; `fail` means the accepted sample size exists but a
success or timing threshold was missed. Neither status permits archive.
