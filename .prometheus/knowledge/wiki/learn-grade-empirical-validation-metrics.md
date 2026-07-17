---
type: Reference
id: learn-grade-empirical-validation-metrics
title: learn-grade Empirical Validation Metrics
tags:
- learn-grade
- grader-validation
- feynman-learning
- evaluation-metrics
- misconception-detection
- kbd-phase
sources:
- stdin
- manual:phase-learn-grader-validation
timestamp: 2026-07-16T20:36:52.758126+00:00
created_at: 2026-07-16T20:36:52.758126+00:00
updated_at: 2026-07-16T20:36:52.758126+00:00
revision: 0
---

## Context

`phase-learn-feynman` v1.4.0 shipped `learn-grade`, a sycophancy-corrected external grader used to close each Feynman loop, at only 60–70% assessed confidence. The prior reflection identified grader reliability as the highest-severity open risk in the learn domain: a grader that misses misconceptions can provide false assurance.

Before this validation phase, no empirical validation dataset existed and `learn-grade` had not been tested against explanations with known expert-labeled gaps.

## Phase Goals

- **G-01: Grader evaluation dataset**
  - Assemble 20+ Feynman explanations across at least 3 subject domains.
  - Include at least one STEM topic, one humanities topic, and one technical/programming topic.
  - Add expert-authored ground-truth annotations per explanation:
    - Present misconceptions
    - Absent misconceptions
    - Gold-standard score
  - Store under `skills/learn/learn-grade/references/eval-dataset/`.
  - Use a machine-readable schema: JSON or YAML per explanation.
- **G-02: Run `learn-grade` against the dataset**
  - Feed each explanation through the actual `learn-grade` skill/script path, not a mock.
  - Capture grader score and misconception list.
  - Diff grader output against ground truth.

## Completed Change

`change-lgv-005-compute-metrics` completed all 6/6 tasks and produced the first empirical accuracy measurement for `learn-grade`.

Commits pushed:

- `28bfab7` — feature commit
- `694a84e` — KBD marker

## Validation Results

| Metric | Value | Interpretation |
|---|---:|---|
| Misconception precision | 0.923 | High precision |
| Misconception recall | 1.000 | No known misconception missed |
| Misconception F1 | 0.960 | Strong overall misconception detection |
| Accuracy dimension Pearson correlation | 0.930 | Strong |
| Completeness dimension Pearson correlation | 0.892 | Good |
| Clarity dimension Pearson correlation | 0.405 | Weak |

## Findings

1. **Misconception recall is the headline result.** Across 24 evaluated items, `learn-grade` did not let any real misconception pass undetected.
2. **Clarity scoring is the weak dimension.** Clarity correlation was only `r = 0.405`, far below accuracy (`r = 0.930`) and completeness (`r = 0.892`). The clarity rubric or grader protocol likely needs refinement.
3. **Worst-5 items skew toward strong explanations.** Three of the five worst-scoring discrepancies were in the "strong" tier. The grader appears stricter on completeness for well-written explanations than the draft gold standard expected. This may indicate either:
   - the grader is appropriately demanding, or
   - the gold-standard completeness scores were too generous.

## Phase Status

- Position: `phase-learn-grader-validation`
- Status: execute in progress
- Progress: 5/7 changes complete
- Goals met: G-01, G-02, G-03
- Latest completed change: `change-lgv-005-compute-metrics`
- Next change: `/kbd-apply change-lgv-006-tune-grader`
- Remaining changes: 2

## Engineering Implication

The phase's original motivating question has been partially answered: `learn-grade` is no longer operating on a 60–70% confidence guess. Empirical evidence shows excellent misconception recall and strong-to-good score correlation for accuracy and completeness, while clarity scoring remains the main validation weakness to address next.

# Citations

1. stdin
2. manual:phase-learn-grader-validation