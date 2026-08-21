/// Shared test harness: isolated graph + registry per test, mirroring the
/// package's own override pattern so the process-global singletons are never
/// touched by tests.
library;

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prometheus_flutter_showcase/domain/demo_data.dart';
import 'package:prometheus_flutter_showcase/domain/models.dart';
import 'package:prometheus_flutter_showcase/transport/demo_transport.dart';

/// Isolated showcase wiring for one test.
class ShowcaseHarness {
  ShowcaseHarness({List<DemoTask> taskSeed = demoTasks})
    : taskTransport = DemoEntityTransport<DemoTask>(
        seed: taskSeed,
        identifyRow: (row) => row.id,
        encodeRow: (row) => row.toGraph(),
        decodeRow: DemoTask.fromGraph,
      ) {
    registry
      ..register<DemoProject>(
        'Project',
        DemoEntityTransport<DemoProject>(
          seed: demoProjects,
          identifyRow: (row) => row.id,
          encodeRow: (row) => row.toGraph(),
          decodeRow: DemoProject.fromGraph,
        ),
      )
      ..register<DemoTask>('Task', taskTransport)
      ..register<DemoComment>(
        'Comment',
        DemoEntityTransport<DemoComment>(
          seed: demoComments,
          identifyRow: (row) => row.id,
          encodeRow: (row) => row.toGraph(),
          decodeRow: DemoComment.fromGraph,
        ),
      );
  }

  final graph = EntityGraph();
  final registry = EntityTransportRegistry();
  final DemoEntityTransport<DemoTask> taskTransport;

  /// Container binding this harness's isolated graph and registry.
  ProviderContainer container() => ProviderContainer(
    overrides: [
      entityGraphProvider.overrideWithValue(graph),
      entityTransportRegistryProvider.overrideWithValue(registry),
    ],
  );
}
