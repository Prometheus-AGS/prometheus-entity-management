import 'package:flutter/material.dart';

import 'features/entity_management/presentation/showcase_screen.dart';

final class PrometheusEntityShowcaseApp extends StatelessWidget {
  const PrometheusEntityShowcaseApp({super.key});

  @override
  Widget build(BuildContext context) {
    const ember = Color(0xffd94f27);
    const ink = Color(0xff17171c);
    final lightScheme = ColorScheme.fromSeed(
      seedColor: ember,
      brightness: Brightness.light,
      surface: const Color(0xfffffaf5),
    );
    final darkScheme = ColorScheme.fromSeed(
      seedColor: ember,
      brightness: Brightness.dark,
      surface: ink,
    );

    return MaterialApp(
      title: 'Prometheus Entity Graph',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.system,
      theme: _theme(lightScheme),
      darkTheme: _theme(darkScheme),
      home: const ShowcaseScreen(),
    );
  }

  ThemeData _theme(ColorScheme scheme) => ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: scheme.surface,
    cardTheme: CardThemeData(
      elevation: 0,
      color: scheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: scheme.outlineVariant),
      ),
    ),
    inputDecorationTheme: const InputDecorationTheme(
      border: OutlineInputBorder(),
    ),
  );
}
