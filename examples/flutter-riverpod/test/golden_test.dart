// Kebab-case subject plus Flutter's required _test.dart discovery suffix.
// ignore_for_file: file_names

import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:prometheus_flutter_showcase/app.dart';

import 'test_harness.dart';

final class _CrossPlatformGoldenComparator extends LocalFileComparator {
  _CrossPlatformGoldenComparator(super.testFile);

  static const precisionTolerance = 0.0005;

  @override
  Future<bool> compare(Uint8List imageBytes, Uri golden) async {
    final result = await GoldenFileComparator.compareLists(
      imageBytes,
      await getGoldenBytes(golden),
    );
    final passed = result.passed || result.diffPercent <= precisionTolerance;
    if (passed) {
      result.dispose();
      return true;
    }
    final error = await generateFailureOutput(result, golden, basedir);
    result.dispose();
    throw FlutterError(error);
  }
}

String _goldenPath(String filename) =>
    Platform.isLinux ? 'goldens/linux-$filename' : 'goldens/$filename';

void main() {
  for (final (name, size) in [
    ('phone', const Size(390, 844)),
    ('tablet', const Size(1024, 800)),
  ]) {
    testWidgets('task board golden — $name', (tester) async {
      final previousGoldenComparator = goldenFileComparator;
      goldenFileComparator = _CrossPlatformGoldenComparator(
        Uri.parse('test/golden_test.dart'),
      );
      addTearDown(() => goldenFileComparator = previousGoldenComparator);
      await tester.binding.setSurfaceSize(size);
      addTearDown(() => tester.binding.setSurfaceSize(null));

      final harness = ShowcaseHarness();
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: harness.container(),
          child: const PrometheusShowcaseApp(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Wire realtime sync'), findsOneWidget);
      await expectLater(
        find.byType(PrometheusShowcaseApp),
        matchesGoldenFile(_goldenPath('task-board-$name.png')),
      );
    });
  }
}
