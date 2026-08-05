import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/showcase_test_harness.dart';

final class _ShowcaseGoldenComparator extends LocalFileComparator {
  _ShowcaseGoldenComparator(super.testFile);

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

void main() {
  setUp(() {
    goldenFileComparator = _ShowcaseGoldenComparator(
      Uri.parse('test/showcase_golden_test.dart'),
    );
  });

  testWidgets('phone entity workspace golden', (tester) async {
    final harness = ShowcaseTestHarness.create();
    addTearDown(harness.dispose);
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.platformBrightnessTestValue =
        Brightness.light;
    addTearDown(
      tester.binding.platformDispatcher.clearPlatformBrightnessTestValue,
    );

    await harness.pumpApp(tester, surfaceSize: const Size(430, 932));

    await expectLater(
      find.byType(Scaffold),
      matchesGoldenFile('goldens/showcase-phone-entity.png'),
    );
  });

  testWidgets('tablet entity workspace golden', (tester) async {
    final harness = ShowcaseTestHarness.create();
    addTearDown(harness.dispose);
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.platformBrightnessTestValue =
        Brightness.light;
    addTearDown(
      tester.binding.platformDispatcher.clearPlatformBrightnessTestValue,
    );

    await harness.pumpApp(tester, surfaceSize: const Size(1180, 900));

    await expectLater(
      find.byType(Scaffold),
      matchesGoldenFile('goldens/showcase-tablet-entity.png'),
    );
  });

  testWidgets('phone A2UI workspace golden', (tester) async {
    final harness = ShowcaseTestHarness.create();
    addTearDown(harness.dispose);
    addTearDown(() => tester.binding.setSurfaceSize(null));
    tester.binding.platformDispatcher.platformBrightnessTestValue =
        Brightness.light;
    addTearDown(
      tester.binding.platformDispatcher.clearPlatformBrightnessTestValue,
    );

    await harness.pumpApp(tester, surfaceSize: const Size(430, 932));
    await tester.tap(find.text('A2UI agent'));
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(Scaffold),
      matchesGoldenFile('goldens/showcase-phone-a2ui.png'),
    );
  });
}
