// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'showcase_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(demoRepository)
final demoRepositoryProvider = DemoRepositoryProvider._();

final class DemoRepositoryProvider
    extends $FunctionalProvider<DemoRepository, DemoRepository, DemoRepository>
    with $Provider<DemoRepository> {
  DemoRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'demoRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$demoRepositoryHash();

  @$internal
  @override
  $ProviderElement<DemoRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  DemoRepository create(Ref ref) {
    return demoRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DemoRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DemoRepository>(value),
    );
  }
}

String _$demoRepositoryHash() => r'8386473c078f9b6bf9008db4477dea28efd46a3e';

@ProviderFor(ShowcaseController)
final showcaseControllerProvider = ShowcaseControllerProvider._();

final class ShowcaseControllerProvider
    extends $NotifierProvider<ShowcaseController, ShowcaseState> {
  ShowcaseControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'showcaseControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$showcaseControllerHash();

  @$internal
  @override
  ShowcaseController create() => ShowcaseController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ShowcaseState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ShowcaseState>(value),
    );
  }
}

String _$showcaseControllerHash() =>
    r'd20d6f4671f5693029a72b6d0936b16d4ba19f3e';

abstract class _$ShowcaseController extends $Notifier<ShowcaseState> {
  ShowcaseState build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<ShowcaseState, ShowcaseState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ShowcaseState, ShowcaseState>,
              ShowcaseState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
