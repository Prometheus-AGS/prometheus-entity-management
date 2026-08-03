# Dart graph and Riverpod 3 readiness research

- Query: stable Riverpod 3 adaptation of the canonical Dart-native entity graph
- Sources: 11 local, registry, and official primary sources
- Confidence: 0.94
- Feynman grade: 0.95
- Contradictions resolved: 4; unresolved: 0

## Top findings

1. Both declared prerequisites are complete, archived, and strictly validated, but neither certifies this Flutter implementation.
2. The canonical package already has a tested Dart-native normalized graph; Riverpod must remain a binding/orchestration layer rather than a second entity store.
3. The package manifest claims Riverpod 3 and Freezed while actually resolving Riverpod 2 and containing no Freezed, JSON, or Riverpod generated source.
4. The newest stable Riverpod generator requires analyzer 13, while the newest stable Freezed generator requires analyzer below 11. The stable solution is to remove the unused Freezed/JSON generators and use the current coherent Riverpod-only code-generation matrix.
5. The original disposable RED probe resolved on Flutter beta and then failed at the Riverpod 2 notifier APIs. Task 5 corrected that limitation by resolving and certifying bounded compatible runtime ranges plus exact generator pins on official Flutter 3.44.8 stable.

See [report.md](report.md), [feynman-explanation.md](feynman-explanation.md), and [contradictions.json](contradictions.json).

## Post-implementation update

The canonical package now uses the coherent Riverpod 3 matrix, passes 70
automatically discovered Flutter tests, and exposes 81 source-derived public
declarations. Package, release, skill, and coverage guidance is synchronized in
task 4 while broader app/device/publication claims remain open. See
[implementation-observation.md](implementation-observation.md) and
[declared-surface-observation.md](declared-surface-observation.md).
