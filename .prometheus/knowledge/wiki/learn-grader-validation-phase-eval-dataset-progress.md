---
type: Reference
id: learn-grader-validation-phase-eval-dataset-progress
title: 'Learn Grader Validation Phase: Eval Dataset Progress'
tags:
- learn-grade
- grader-validation
- feynman-learning
- eval-dataset
- kbd-phase
- misconception-detection
sources:
- stdin
- manual:phase-learn-grader-validation
timestamp: 2026-07-16T19:55:41.811580+00:00
created_at: 2026-07-16T19:55:41.811580+00:00
updated_at: 2026-07-16T19:55:41.811580+00:00
revision: 0
---

## Phase Context

- **Phase:** `phase-learn-grader-validation`
- **Project:** unspecified
- **KBD root:** `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack`
- **Captured:** `2026-07-16T19:54:52Z`
- **Status:** execute in progress
- **Progress:** 2/7 changes complete
- **Last completed change:** `change-lgv-002-eval-explanations`
- **Next change:** `/kbd-apply change-lgv-003-dataset-schema-and-index`

## Problem Being Addressed

`phase-learn-feynman` v1.4.0, closed `2026-06-28`, shipped `learn-grade`, a sycophancy-corrected external grader that closes each Feynman loop, at only **60–70% assessed confidence**.

The prior reflection identified this as the highest-severity open risk in the learn domain:

> A grader that misses misconceptions is worse than no grader — it provides false assurance.

No empirical validation dataset previously existed. The grader had not been tested against explanations with known, expert-labeled gaps. This phase is intended to create that dataset and measure actual precision/recall.

## Phase Goals

### G-01: Grader Evaluation Dataset

Assemble **20+ Feynman explanations** spanning at least **3 subject domains**, such as:

- STEM topic
- Humanities topic
- Technical/programming topic

Each explanation must include expert-authored ground-truth annotations:

- Misconceptions present
- Misconceptions absent
- Gold-standard score

Target storage location:

```text
skills/learn/learn-grade/references/eval-dataset/
```

Dataset format requirement: machine-readable schema, JSON or YAML per explanation.

### G-02: Run `learn-grade` Against the Dataset

Create a script that:

- Feeds each explanation through the actual `learn-grade` skill/script path.
- Does **not** use a mock grader.
- Captures grader output:
  - Score
  - Misconception list
- Diffs grader output against ground truth.

## Completed Work: `change-lgv-002-eval-explanations`

`kbd-apply` completed successfully for `change-lgv-002-eval-explanations`:

- **Tasks:** 7/7 complete
- **Validation:** all tasks validated
- **Commits pushed:**
  - `7dc930e` — feature commit
  - `230c335` — KBD marker

## Dataset State After Change 002

G-01 is substantially advanced.

Current dataset contents:

- **24 evaluation explanations**
- **3 domains**
- **8 explanations per domain**
- Evenly split by expected grader behavior:
  - **2 strong explanations**
    - Should score high
    - Should contain no misconceptions
  - **2 incomplete explanations**
    - Should score low on completeness
  - **4 factually flawed explanations**
    - Each asserts exactly one real misconception verbatim from its corpus
    - Expected `misconceptions_absent = 0.0`

Per-item metadata/status:

- Draft per-dimension gold scores present
- `review_status: "draft"` on every item
- All draft gold scores confirmed to be within `[0,1]`
- All 24 misconception references validated against real `source_ref` entries in their corpora

## Important Caveat

The dataset is **not yet final ground truth**. All 24 explanations currently have:

```yaml
review_status: "draft"
```

They require human review before being treated as final expert-labeled validation data.

## Remaining Work

- Complete `change-lgv-003-dataset-schema-and-index`.
- Finish schema/index work for G-01.
- Complete remaining 5 changes in the phase.
- Implement and run the actual `learn-grade` evaluation path for G-02.
- Measure precision/recall against reviewed ground truth.

# Citations

1. stdin
2. manual:phase-learn-grader-validation