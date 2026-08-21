/// Prometheus-branded app shell for the Flutter/Riverpod/A2UI showcase.
library;

import 'package:flutter/material.dart';

import 'features/task_board_page.dart';

/// Branded root widget. Dark ember theme matches the other 3.0 showcases.
class PrometheusShowcaseApp extends StatelessWidget {
  const PrometheusShowcaseApp({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFFE8590C),
      brightness: Brightness.dark,
    );
    return MaterialApp(
      title: 'Prometheus Tasks',
      theme: ThemeData(colorScheme: scheme, useMaterial3: true),
      home: const TaskBoardPage(),
    );
  }
}
