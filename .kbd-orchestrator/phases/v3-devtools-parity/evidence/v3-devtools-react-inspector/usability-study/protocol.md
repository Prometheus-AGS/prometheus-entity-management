# Facilitator protocol

## Purpose

Measure whether a developer can use the React Entity Graph DevTools to answer
one causal debugging question: which entity is dirty, what changed, and which
registered rendered views currently contain it?

## Privacy and integrity

- Obtain explicit consent to retain an anonymized timing/result record.
- Assign an ID such as `p-a01`; do not retain a name, email address, employer,
  screen recording, source repository, application data, or free-form profile.
- Do not coach, point, paraphrase labels, or reveal the expected answer after
  timing starts. Record every intervention as assistance.
- Run participants in recruitment order. Do not discard or replace a slow or
  unsuccessful session. Corrections after the participant stops the timer do
  not change the recorded result.
- A first-time participant has not previously seen the inspector or this
  protocol. An oriented participant receives the orientation below but has not
  seen the seeded answers.

## Fixed fixture

Generate the packed Vite development consumer with the `--prepare-study`
command in `README.md` at the exact source commit recorded in the participant
result. Open its `?study=1` URL. Before the participant sees the screen, the
facilitator must:

1. Open the development consumer and confirm the DevTools launcher is visible.
2. Confirm study mode automatically seeded the accepted fixture: atomic
   12-entity batch, `Order/o-1042` included in all three registered views, then
   its `status` patched from `pending` to `approved`.
3. Leave the inspector closed, clear search text, select Overview, and do not
   reveal the host application's list labels.
4. Confirm the expected fixture answers privately:
   - dirty entity: `Order/o-1042`
   - original status: `pending`
   - live status: `approved`
   - registered views: `active`, `all`, and `attention`

If the fixture differs, abort the session and record a recruitment-log note;
do not reinterpret the answers.

## Orientation

For `oriented` participants only, before seeding and timing, say:

> The launcher opens an inspector organized into Overview, Entities, Views,
> Activity, and a causal Graph Pulse. Search and select an entity to inspect
> original, patch, live, and registered-view information.

Do not demonstrate the seeded entity or views. First-time participants receive
no orientation beyond the task statement.

## Timed task

Read this verbatim, start the monotonic timer immediately after the final word,
and stop when the participant states a complete final answer:

> Use Prometheus Graph DevTools to identify the dirty entity, state its original
> and live status, and name every registered rendered view that currently
> contains it. Tell me when your answer is final.

Record the combined elapsed time in milliseconds. The participant succeeds
only if the final answer matches all four fixed-fixture facts and no assistance
occurred. An incomplete or incorrect final answer remains retained with the
individual fact fields set truthfully.

## After the task

Ask only the two structured questions represented in the result schema:

1. Which step, if any, was least clear? Choose one controlled `frictionCode`.
2. How confident were you in the final answer, from 1 (guessing) to 5 (certain)?

Do not store free-form responses. Validate the JSON record before beginning the
next session.
