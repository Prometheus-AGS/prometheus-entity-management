import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:prometheus_entity_showcase/app.dart';
import 'package:prometheus_entity_showcase/features/entity_management/application/showcase_controller.dart';
import 'package:prometheus_entity_showcase/features/entity_management/domain/demo_models.dart';
import 'package:prometheus_entity_showcase/features/entity_management/infrastructure/demo_repository.dart';

final class ShowcaseTestHarness {
  ShowcaseTestHarness._({
    required this.graph,
    required this.repository,
    required this.registry,
    required this.container,
  });

  factory ShowcaseTestHarness.create({
    EntityGraph? graph,
    EntityTransport<DemoTask>? taskTransport,
  }) {
    final resolvedGraph = graph ?? EntityGraph();
    final repository = DemoRepository.seeded()..seedGraph(resolvedGraph);
    final registry = EntityTransportRegistry()
      ..register<DemoTask>(
        demoTaskType,
        taskTransport ??
            FfiEntityTransportAdapter<DemoTask>(
              bridge: DemoRustTaskBridge(repository),
              authoritative: true,
              staleTime: const Duration(seconds: 5),
            ),
      )
      ..register<DemoProject>(demoProjectType, DemoProjectTransport(repository))
      ..register<DemoUser>(demoUserType, DemoUserTransport(repository));
    final container = ProviderContainer(
      overrides: [
        entityGraphProvider.overrideWithValue(resolvedGraph),
        entityTransportRegistryProvider.overrideWithValue(registry),
        demoRepositoryProvider.overrideWithValue(repository),
      ],
    );
    return ShowcaseTestHarness._(
      graph: resolvedGraph,
      repository: repository,
      registry: registry,
      container: container,
    );
  }

  final EntityGraph graph;
  final DemoRepository repository;
  final EntityTransportRegistry registry;
  final ProviderContainer container;

  Future<void> pumpApp(
    WidgetTester tester, {
    Size? surfaceSize,
    bool settle = true,
  }) async {
    if (surfaceSize != null) {
      await tester.binding.setSurfaceSize(surfaceSize);
    }
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const PrometheusEntityShowcaseApp(),
      ),
    );
    if (settle) await tester.pumpAndSettle();
  }

  Future<void> dispose() async {
    container.dispose();
    await repository.dispose();
  }
}
