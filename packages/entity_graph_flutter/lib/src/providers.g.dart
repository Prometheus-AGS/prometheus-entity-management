// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Process-wide graph owner. Override with an isolated [EntityGraph] in tests
/// or a deliberately scoped application graph.

@ProviderFor(entityGraph)
final entityGraphProvider = EntityGraphProvider._();

/// Process-wide graph owner. Override with an isolated [EntityGraph] in tests
/// or a deliberately scoped application graph.

final class EntityGraphProvider
    extends $FunctionalProvider<EntityGraph, EntityGraph, EntityGraph>
    with $Provider<EntityGraph> {
  /// Process-wide graph owner. Override with an isolated [EntityGraph] in tests
  /// or a deliberately scoped application graph.
  EntityGraphProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'entityGraphProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$entityGraphHash();

  @$internal
  @override
  $ProviderElement<EntityGraph> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  EntityGraph create(Ref ref) {
    return entityGraph(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EntityGraph value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EntityGraph>(value),
    );
  }
}

String _$entityGraphHash() => r'fe97eb348902e088e899074d783387f18ee66c5b';

/// Process-wide transport registry. It is injectable without changing the
/// graph's state ownership.

@ProviderFor(entityTransportRegistry)
final entityTransportRegistryProvider = EntityTransportRegistryProvider._();

/// Process-wide transport registry. It is injectable without changing the
/// graph's state ownership.

final class EntityTransportRegistryProvider
    extends
        $FunctionalProvider<
          EntityTransportRegistry,
          EntityTransportRegistry,
          EntityTransportRegistry
        >
    with $Provider<EntityTransportRegistry> {
  /// Process-wide transport registry. It is injectable without changing the
  /// graph's state ownership.
  EntityTransportRegistryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'entityTransportRegistryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$entityTransportRegistryHash();

  @$internal
  @override
  $ProviderElement<EntityTransportRegistry> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EntityTransportRegistry create(Ref ref) {
    return entityTransportRegistry(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EntityTransportRegistry value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EntityTransportRegistry>(value),
    );
  }
}

String _$entityTransportRegistryHash() =>
    r'61ff99508d7327f46f7d9854587b48d2729efb40';

/// Mounts at most one generated-provider instance per entity type and
/// translates transport changes into canonical graph writes/invalidation.

@ProviderFor(EntityChangeBridge)
final entityChangeBridgeProvider = EntityChangeBridgeFamily._();

/// Mounts at most one generated-provider instance per entity type and
/// translates transport changes into canonical graph writes/invalidation.
final class EntityChangeBridgeProvider<T extends Object>
    extends $NotifierProvider<EntityChangeBridge<T>, EntityChangeBinding> {
  /// Mounts at most one generated-provider instance per entity type and
  /// translates transport changes into canonical graph writes/invalidation.
  EntityChangeBridgeProvider._({
    required EntityChangeBridgeFamily super.from,
    required String super.argument,
  }) : super(
         retry: entityProviderRetry,
         name: r'entityChangeBridgeProvider',
         isAutoDispose: false,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$entityChangeBridgeHash();

  @override
  String toString() {
    return r'entityChangeBridgeProvider'
        '<${T}>'
        '($argument)';
  }

  @$internal
  @override
  EntityChangeBridge<T> create() => EntityChangeBridge<T>();

  $R _captureGenerics<$R>($R Function<T extends Object>() cb) {
    return cb<T>();
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EntityChangeBinding value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EntityChangeBinding>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EntityChangeBridgeProvider &&
        other.runtimeType == runtimeType &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return Object.hash(runtimeType, argument);
  }
}

String _$entityChangeBridgeHash() =>
    r'e8e7d32b52dff3fc529bdf648f4143354bbbbec6';

/// Mounts at most one generated-provider instance per entity type and
/// translates transport changes into canonical graph writes/invalidation.

final class EntityChangeBridgeFamily extends $Family {
  EntityChangeBridgeFamily._()
    : super(
        retry: entityProviderRetry,
        name: r'entityChangeBridgeProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: false,
      );

  /// Mounts at most one generated-provider instance per entity type and
  /// translates transport changes into canonical graph writes/invalidation.

  EntityChangeBridgeProvider<T> call<T extends Object>({
    required String type,
  }) => EntityChangeBridgeProvider<T>._(argument: type, from: this);

  @override
  String toString() => r'entityChangeBridgeProvider';

  /// {@macro riverpod.override_with}
  Override overrideWith(
    EntityChangeBridge<T> Function<T extends Object>() create,
  ) => $FamilyOverride(
    from: this,
    createElement: (pointer) {
      final provider = pointer.origin as EntityChangeBridgeProvider;
      return provider._captureGenerics(<T extends Object>() {
        provider as EntityChangeBridgeProvider<T>;
        return provider.$view(create: create<T>).$createElement(pointer);
      });
    },
  );

  /// {@macro riverpod.override_with_build}
  Override overrideWithBuild(
    EntityChangeBinding Function<T extends Object>(
      Ref ref,
      EntityChangeBridge<T> notifier,
    )
    build,
  ) => $FamilyOverride(
    from: this,
    createElement: (pointer) {
      final provider = pointer.origin as EntityChangeBridgeProvider;
      return provider._captureGenerics(<T extends Object>() {
        provider as EntityChangeBridgeProvider<T>;
        return provider
            .$view(runNotifierBuildOverride: build<T>)
            .$createElement(pointer);
      });
    },
  );
}

/// Mounts at most one generated-provider instance per entity type and
/// translates transport changes into canonical graph writes/invalidation.

abstract class _$EntityChangeBridge<T extends Object>
    extends $Notifier<EntityChangeBinding> {
  late final _$args = ref.$arg as String;
  String get type => _$args;

  EntityChangeBinding build({required String type});
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<EntityChangeBinding, EntityChangeBinding>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<EntityChangeBinding, EntityChangeBinding>,
              EntityChangeBinding,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(type: _$args));
  }
}

/// Generated Riverpod family for normalized local, remote, and hybrid lists.

@ProviderFor(EntityList)
final entityListProvider = EntityListFamily._();

/// Generated Riverpod family for normalized local, remote, and hybrid lists.
final class EntityListProvider<T extends Object>
    extends $AsyncNotifierProvider<EntityList<T>, EntityListSnapshot<T>> {
  /// Generated Riverpod family for normalized local, remote, and hybrid lists.
  EntityListProvider._({
    required EntityListFamily super.from,
    required ({
      String type,
      String queryKey,
      EntityDecoder<T> fromGraph,
      EntityEncoder<T>? toGraph,
      ListQuery query,
      ViewCompleteness completeness,
      bool enabled,
      bool subscribe,
    })
    super.argument,
  }) : super(
         retry: entityProviderRetry,
         name: r'entityListProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$entityListHash();

  @override
  String toString() {
    return r'entityListProvider'
        '<${T}>'
        '$argument';
  }

  @$internal
  @override
  EntityList<T> create() => EntityList<T>();

  $R _captureGenerics<$R>($R Function<T extends Object>() cb) {
    return cb<T>();
  }

  @override
  bool operator ==(Object other) {
    return other is EntityListProvider &&
        other.runtimeType == runtimeType &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return Object.hash(runtimeType, argument);
  }
}

String _$entityListHash() => r'd1a7005a5b4570de5ab7b0abf10319fe48bb364e';

/// Generated Riverpod family for normalized local, remote, and hybrid lists.

final class EntityListFamily extends $Family {
  EntityListFamily._()
    : super(
        retry: entityProviderRetry,
        name: r'entityListProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Generated Riverpod family for normalized local, remote, and hybrid lists.

  EntityListProvider<T> call<T extends Object>({
    required String type,
    required String queryKey,
    required EntityDecoder<T> fromGraph,
    EntityEncoder<T>? toGraph,
    ListQuery query = const ListQuery(),
    ViewCompleteness completeness = ViewCompleteness.remote,
    bool enabled = true,
    bool subscribe = true,
  }) => EntityListProvider<T>._(
    argument: (
      type: type,
      queryKey: queryKey,
      fromGraph: fromGraph,
      toGraph: toGraph,
      query: query,
      completeness: completeness,
      enabled: enabled,
      subscribe: subscribe,
    ),
    from: this,
  );

  @override
  String toString() => r'entityListProvider';

  /// {@macro riverpod.override_with}
  Override overrideWith(EntityList<T> Function<T extends Object>() create) =>
      $FamilyOverride(
        from: this,
        createElement: (pointer) {
          final provider = pointer.origin as EntityListProvider;
          return provider._captureGenerics(<T extends Object>() {
            provider as EntityListProvider<T>;
            return provider.$view(create: create<T>).$createElement(pointer);
          });
        },
      );

  /// {@macro riverpod.override_with_build}
  Override overrideWithBuild(
    FutureOr<EntityListSnapshot<T>> Function<T extends Object>(
      Ref ref,
      EntityList<T> notifier,
    )
    build,
  ) => $FamilyOverride(
    from: this,
    createElement: (pointer) {
      final provider = pointer.origin as EntityListProvider;
      return provider._captureGenerics(<T extends Object>() {
        provider as EntityListProvider<T>;
        return provider
            .$view(runNotifierBuildOverride: build<T>)
            .$createElement(pointer);
      });
    },
  );
}

/// Generated Riverpod family for normalized local, remote, and hybrid lists.

abstract class _$EntityList<T extends Object>
    extends $AsyncNotifier<EntityListSnapshot<T>> {
  late final _$args =
      ref.$arg
          as ({
            String type,
            String queryKey,
            EntityDecoder<T> fromGraph,
            EntityEncoder<T>? toGraph,
            ListQuery query,
            ViewCompleteness completeness,
            bool enabled,
            bool subscribe,
          });
  String get type => _$args.type;
  String get queryKey => _$args.queryKey;
  EntityDecoder<T> get fromGraph => _$args.fromGraph;
  EntityEncoder<T>? get toGraph => _$args.toGraph;
  ListQuery get query => _$args.query;
  ViewCompleteness get completeness => _$args.completeness;
  bool get enabled => _$args.enabled;
  bool get subscribe => _$args.subscribe;

  FutureOr<EntityListSnapshot<T>> build({
    required String type,
    required String queryKey,
    required EntityDecoder<T> fromGraph,
    EntityEncoder<T>? toGraph,
    ListQuery query = const ListQuery(),
    ViewCompleteness completeness = ViewCompleteness.remote,
    bool enabled = true,
    bool subscribe = true,
  });
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<EntityListSnapshot<T>>, EntityListSnapshot<T>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EntityListSnapshot<T>>,
                EntityListSnapshot<T>
              >,
              AsyncValue<EntityListSnapshot<T>>,
              Object?,
              Object?
            >;
    return element.handleCreate(
      ref,
      () => build(
        type: _$args.type,
        queryKey: _$args.queryKey,
        fromGraph: _$args.fromGraph,
        toGraph: _$args.toGraph,
        query: _$args.query,
        completeness: _$args.completeness,
        enabled: _$args.enabled,
        subscribe: _$args.subscribe,
      ),
    );
  }
}

/// Generated Riverpod family for a single normalized entity.

@ProviderFor(Entity)
final entityProvider = EntityFamily._();

/// Generated Riverpod family for a single normalized entity.
final class EntityProvider<T extends Object>
    extends $AsyncNotifierProvider<Entity<T>, EntitySnapshot<T>> {
  /// Generated Riverpod family for a single normalized entity.
  EntityProvider._({
    required EntityFamily super.from,
    required ({
      String type,
      String? id,
      EntityDecoder<T> fromGraph,
      EntityEncoder<T>? toGraph,
      bool enabled,
      bool subscribe,
    })
    super.argument,
  }) : super(
         retry: entityProviderRetry,
         name: r'entityProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$entityHash();

  @override
  String toString() {
    return r'entityProvider'
        '<${T}>'
        '$argument';
  }

  @$internal
  @override
  Entity<T> create() => Entity<T>();

  $R _captureGenerics<$R>($R Function<T extends Object>() cb) {
    return cb<T>();
  }

  @override
  bool operator ==(Object other) {
    return other is EntityProvider &&
        other.runtimeType == runtimeType &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return Object.hash(runtimeType, argument);
  }
}

String _$entityHash() => r'd21d6c958b98054991ed1ad480fc0ac66edc867e';

/// Generated Riverpod family for a single normalized entity.

final class EntityFamily extends $Family {
  EntityFamily._()
    : super(
        retry: entityProviderRetry,
        name: r'entityProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Generated Riverpod family for a single normalized entity.

  EntityProvider<T> call<T extends Object>({
    required String type,
    required String? id,
    required EntityDecoder<T> fromGraph,
    EntityEncoder<T>? toGraph,
    bool enabled = true,
    bool subscribe = true,
  }) => EntityProvider<T>._(
    argument: (
      type: type,
      id: id,
      fromGraph: fromGraph,
      toGraph: toGraph,
      enabled: enabled,
      subscribe: subscribe,
    ),
    from: this,
  );

  @override
  String toString() => r'entityProvider';

  /// {@macro riverpod.override_with}
  Override overrideWith(Entity<T> Function<T extends Object>() create) =>
      $FamilyOverride(
        from: this,
        createElement: (pointer) {
          final provider = pointer.origin as EntityProvider;
          return provider._captureGenerics(<T extends Object>() {
            provider as EntityProvider<T>;
            return provider.$view(create: create<T>).$createElement(pointer);
          });
        },
      );

  /// {@macro riverpod.override_with_build}
  Override overrideWithBuild(
    FutureOr<EntitySnapshot<T>> Function<T extends Object>(
      Ref ref,
      Entity<T> notifier,
    )
    build,
  ) => $FamilyOverride(
    from: this,
    createElement: (pointer) {
      final provider = pointer.origin as EntityProvider;
      return provider._captureGenerics(<T extends Object>() {
        provider as EntityProvider<T>;
        return provider
            .$view(runNotifierBuildOverride: build<T>)
            .$createElement(pointer);
      });
    },
  );
}

/// Generated Riverpod family for a single normalized entity.

abstract class _$Entity<T extends Object>
    extends $AsyncNotifier<EntitySnapshot<T>> {
  late final _$args =
      ref.$arg
          as ({
            String type,
            String? id,
            EntityDecoder<T> fromGraph,
            EntityEncoder<T>? toGraph,
            bool enabled,
            bool subscribe,
          });
  String get type => _$args.type;
  String? get id => _$args.id;
  EntityDecoder<T> get fromGraph => _$args.fromGraph;
  EntityEncoder<T>? get toGraph => _$args.toGraph;
  bool get enabled => _$args.enabled;
  bool get subscribe => _$args.subscribe;

  FutureOr<EntitySnapshot<T>> build({
    required String type,
    required String? id,
    required EntityDecoder<T> fromGraph,
    EntityEncoder<T>? toGraph,
    bool enabled = true,
    bool subscribe = true,
  });
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<EntitySnapshot<T>>, EntitySnapshot<T>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<EntitySnapshot<T>>, EntitySnapshot<T>>,
              AsyncValue<EntitySnapshot<T>>,
              Object?,
              Object?
            >;
    return element.handleCreate(
      ref,
      () => build(
        type: _$args.type,
        id: _$args.id,
        fromGraph: _$args.fromGraph,
        toGraph: _$args.toGraph,
        enabled: _$args.enabled,
        subscribe: _$args.subscribe,
      ),
    );
  }
}

/// Generated per-entity CRUD controller with isolated edits and optimistic
/// graph feedback.

@ProviderFor(EntityCrud)
final entityCrudProvider = EntityCrudFamily._();

/// Generated per-entity CRUD controller with isolated edits and optimistic
/// graph feedback.
final class EntityCrudProvider<T extends Object>
    extends $NotifierProvider<EntityCrud<T>, EditBuffer> {
  /// Generated per-entity CRUD controller with isolated edits and optimistic
  /// graph feedback.
  EntityCrudProvider._({
    required EntityCrudFamily super.from,
    required ({String type, String id, EntityEncoder<T>? toGraph})
    super.argument,
  }) : super(
         retry: null,
         name: r'entityCrudProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$entityCrudHash();

  @override
  String toString() {
    return r'entityCrudProvider'
        '<${T}>'
        '$argument';
  }

  @$internal
  @override
  EntityCrud<T> create() => EntityCrud<T>();

  $R _captureGenerics<$R>($R Function<T extends Object>() cb) {
    return cb<T>();
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EditBuffer value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EditBuffer>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EntityCrudProvider &&
        other.runtimeType == runtimeType &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return Object.hash(runtimeType, argument);
  }
}

String _$entityCrudHash() => r'01717bfc13974b53a62667e0dd6c86dcad6edb56';

/// Generated per-entity CRUD controller with isolated edits and optimistic
/// graph feedback.

final class EntityCrudFamily extends $Family {
  EntityCrudFamily._()
    : super(
        retry: null,
        name: r'entityCrudProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Generated per-entity CRUD controller with isolated edits and optimistic
  /// graph feedback.

  EntityCrudProvider<T> call<T extends Object>({
    required String type,
    required String id,
    EntityEncoder<T>? toGraph,
  }) => EntityCrudProvider<T>._(
    argument: (type: type, id: id, toGraph: toGraph),
    from: this,
  );

  @override
  String toString() => r'entityCrudProvider';

  /// {@macro riverpod.override_with}
  Override overrideWith(EntityCrud<T> Function<T extends Object>() create) =>
      $FamilyOverride(
        from: this,
        createElement: (pointer) {
          final provider = pointer.origin as EntityCrudProvider;
          return provider._captureGenerics(<T extends Object>() {
            provider as EntityCrudProvider<T>;
            return provider.$view(create: create<T>).$createElement(pointer);
          });
        },
      );

  /// {@macro riverpod.override_with_build}
  Override overrideWithBuild(
    EditBuffer Function<T extends Object>(Ref ref, EntityCrud<T> notifier)
    build,
  ) => $FamilyOverride(
    from: this,
    createElement: (pointer) {
      final provider = pointer.origin as EntityCrudProvider;
      return provider._captureGenerics(<T extends Object>() {
        provider as EntityCrudProvider<T>;
        return provider
            .$view(runNotifierBuildOverride: build<T>)
            .$createElement(pointer);
      });
    },
  );
}

/// Generated per-entity CRUD controller with isolated edits and optimistic
/// graph feedback.

abstract class _$EntityCrud<T extends Object> extends $Notifier<EditBuffer> {
  late final _$args =
      ref.$arg as ({String type, String id, EntityEncoder<T>? toGraph});
  String get type => _$args.type;
  String get id => _$args.id;
  EntityEncoder<T>? get toGraph => _$args.toGraph;

  EditBuffer build({
    required String type,
    required String id,
    EntityEncoder<T>? toGraph,
  });
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<EditBuffer, EditBuffer>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<EditBuffer, EditBuffer>,
              EditBuffer,
              Object?,
              Object?
            >;
    return element.handleCreate(
      ref,
      () => build(type: _$args.type, id: _$args.id, toGraph: _$args.toGraph),
    );
  }
}

/// Collection-level controller for optimistic creates.

@ProviderFor(EntityMutations)
final entityMutationsProvider = EntityMutationsFamily._();

/// Collection-level controller for optimistic creates.
final class EntityMutationsProvider<T extends Object>
    extends $NotifierProvider<EntityMutations<T>, EntityMutationState<T>> {
  /// Collection-level controller for optimistic creates.
  EntityMutationsProvider._({
    required EntityMutationsFamily super.from,
    required ({String type, EntityEncoder<T>? toGraph}) super.argument,
  }) : super(
         retry: null,
         name: r'entityMutationsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$entityMutationsHash();

  @override
  String toString() {
    return r'entityMutationsProvider'
        '<${T}>'
        '$argument';
  }

  @$internal
  @override
  EntityMutations<T> create() => EntityMutations<T>();

  $R _captureGenerics<$R>($R Function<T extends Object>() cb) {
    return cb<T>();
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EntityMutationState<T> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EntityMutationState<T>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EntityMutationsProvider &&
        other.runtimeType == runtimeType &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return Object.hash(runtimeType, argument);
  }
}

String _$entityMutationsHash() => r'ac5b511c77661f6305143e94b2f1db7f70443e5a';

/// Collection-level controller for optimistic creates.

final class EntityMutationsFamily extends $Family {
  EntityMutationsFamily._()
    : super(
        retry: null,
        name: r'entityMutationsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Collection-level controller for optimistic creates.

  EntityMutationsProvider<T> call<T extends Object>({
    required String type,
    EntityEncoder<T>? toGraph,
  }) => EntityMutationsProvider<T>._(
    argument: (type: type, toGraph: toGraph),
    from: this,
  );

  @override
  String toString() => r'entityMutationsProvider';

  /// {@macro riverpod.override_with}
  Override overrideWith(
    EntityMutations<T> Function<T extends Object>() create,
  ) => $FamilyOverride(
    from: this,
    createElement: (pointer) {
      final provider = pointer.origin as EntityMutationsProvider;
      return provider._captureGenerics(<T extends Object>() {
        provider as EntityMutationsProvider<T>;
        return provider.$view(create: create<T>).$createElement(pointer);
      });
    },
  );

  /// {@macro riverpod.override_with_build}
  Override overrideWithBuild(
    EntityMutationState<T> Function<T extends Object>(
      Ref ref,
      EntityMutations<T> notifier,
    )
    build,
  ) => $FamilyOverride(
    from: this,
    createElement: (pointer) {
      final provider = pointer.origin as EntityMutationsProvider;
      return provider._captureGenerics(<T extends Object>() {
        provider as EntityMutationsProvider<T>;
        return provider
            .$view(runNotifierBuildOverride: build<T>)
            .$createElement(pointer);
      });
    },
  );
}

/// Collection-level controller for optimistic creates.

abstract class _$EntityMutations<T extends Object>
    extends $Notifier<EntityMutationState<T>> {
  late final _$args = ref.$arg as ({String type, EntityEncoder<T>? toGraph});
  String get type => _$args.type;
  EntityEncoder<T>? get toGraph => _$args.toGraph;

  EntityMutationState<T> build({
    required String type,
    EntityEncoder<T>? toGraph,
  });
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<EntityMutationState<T>, EntityMutationState<T>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<EntityMutationState<T>, EntityMutationState<T>>,
              EntityMutationState<T>,
              Object?,
              Object?
            >;
    return element.handleCreate(
      ref,
      () => build(type: _$args.type, toGraph: _$args.toGraph),
    );
  }
}
