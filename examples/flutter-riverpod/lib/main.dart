import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'features/entity_management/application/showcase_controller.dart';
import 'features/entity_management/domain/demo_models.dart';
import 'features/entity_management/infrastructure/demo_repository.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  final graph = EntityGraph();
  final repository = DemoRepository.seeded()..seedGraph(graph);
  final registry = EntityTransportRegistry()
    ..register<DemoTask>(
      demoTaskType,
      FfiEntityTransportAdapter<DemoTask>(
        bridge: DemoRustTaskBridge(repository),
        authoritative: true,
        staleTime: const Duration(seconds: 5),
      ),
    )
    ..register<DemoProject>(demoProjectType, DemoProjectTransport(repository))
    ..register<DemoUser>(demoUserType, DemoUserTransport(repository));

  runApp(
    ProviderScope(
      overrides: [
        entityGraphProvider.overrideWithValue(graph),
        entityTransportRegistryProvider.overrideWithValue(registry),
        demoRepositoryProvider.overrideWithValue(repository),
      ],
      child: const PrometheusEntityShowcaseApp(),
    ),
  );
}
