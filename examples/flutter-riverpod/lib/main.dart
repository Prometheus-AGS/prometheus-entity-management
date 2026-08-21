/// Entrypoint: registers the demo transports at boot and mounts the branded
/// showcase. Transports are the only I/O boundary; the graph stays canonical.
library;

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'domain/demo_data.dart';
import 'domain/models.dart';
import 'transport/demo_transport.dart';

/// Registers one deterministic demo transport per entity type.
void registerDemoTransports(EntityTransportRegistry registry) {
  registry.register<DemoProject>(
    'Project',
    DemoEntityTransport<DemoProject>(
      seed: demoProjects,
      identifyRow: (row) => row.id,
      encodeRow: (row) => row.toGraph(),
      decodeRow: DemoProject.fromGraph,
    ),
  );
  registry.register<DemoTask>(
    'Task',
    DemoEntityTransport<DemoTask>(
      seed: demoTasks,
      identifyRow: (row) => row.id,
      encodeRow: (row) => row.toGraph(),
      decodeRow: DemoTask.fromGraph,
    ),
  );
  registry.register<DemoComment>(
    'Comment',
    DemoEntityTransport<DemoComment>(
      seed: demoComments,
      identifyRow: (row) => row.id,
      encodeRow: (row) => row.toGraph(),
      decodeRow: DemoComment.fromGraph,
    ),
  );
}

void main() {
  registerDemoTransports(EntityTransportRegistry.instance);
  runApp(const ProviderScope(child: PrometheusShowcaseApp()));
}
