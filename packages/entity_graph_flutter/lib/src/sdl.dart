/// SDL (Schema Definition Language) parser — Dart mirror of
/// entity-graph-sdl's src/index.ts.
///
/// Parse a JSON/Map SDL document into a validated [EntityGraphIR] that
/// code generators (Freezed model generator, REST transport builder, etc.)
/// can consume.
///
/// ```dart
/// final ir = parseSdl(jsonDecode(schemaJson));
/// for (final entity in ir.entities) {
///   print('${entity.name}: ${entity.fields.map((f) => f.name).join(', ')}');
/// }
/// ```
library;

// ─── Scalar types ─────────────────────────────────────────────────────────

/// Supported SDL scalar types.
enum SdlScalarType {
  string,
  number,
  integer,
  decimal,
  boolean,
  datetime,
  date,
  json,
  enumType, // mirrors 'enum' keyword
  uuid,
}

SdlScalarType _parseScalar(String raw, String path) {
  switch (raw) {
    case 'string':
      return SdlScalarType.string;
    case 'number':
      return SdlScalarType.number;
    case 'integer':
      return SdlScalarType.integer;
    case 'decimal':
      return SdlScalarType.decimal;
    case 'boolean':
      return SdlScalarType.boolean;
    case 'datetime':
      return SdlScalarType.datetime;
    case 'date':
      return SdlScalarType.date;
    case 'json':
      return SdlScalarType.json;
    case 'enum':
      return SdlScalarType.enumType;
    case 'uuid':
      return SdlScalarType.uuid;
    default:
      throw SdlValidationError('Unknown field type "$raw"', path);
  }
}

// ─── Source format types ──────────────────────────────────────────────────

/// Raw SDL field definition.
class SdlFieldDef {
  const SdlFieldDef({
    required this.type,
    this.primary = false,
    this.required = false,
    this.unique = false,
    this.defaultValue,
    this.values,
    this.auto = false,
  });

  final SdlScalarType type;
  final bool primary;
  final bool required;
  final bool unique;
  final Object? defaultValue;

  /// Allowed values for enum fields.
  final List<String>? values;

  /// Auto-managed field (e.g. createdAt).
  final bool auto;
}

/// Relation kind.
enum SdlRelationKind { belongsTo, hasMany, manyToMany }

SdlRelationKind _parseRelationKind(String raw, String path) {
  switch (raw) {
    case 'belongsTo':
      return SdlRelationKind.belongsTo;
    case 'hasMany':
      return SdlRelationKind.hasMany;
    case 'manyToMany':
      return SdlRelationKind.manyToMany;
    default:
      throw SdlValidationError('Unknown relation type "$raw"', path);
  }
}

/// Raw SDL relation definition.
class SdlRelationDef {
  const SdlRelationDef({
    required this.type,
    required this.target,
    this.foreignKey,
    this.through,
  });

  final SdlRelationKind type;
  final String target;
  final String? foreignKey;
  final String? through;
}

// ─── Validated IR ─────────────────────────────────────────────────────────

/// Validated IR field — what generators consume.
class IrField extends SdlFieldDef {
  const IrField({
    required this.name,
    required super.type,
    super.primary,
    super.required,
    super.unique,
    super.defaultValue,
    super.values,
    super.auto,
  });

  final String name;
}

/// Validated IR relation.
class IrRelation extends SdlRelationDef {
  const IrRelation({
    required this.name,
    required super.type,
    required super.target,
    super.foreignKey,
    super.through,
  });

  final String name;
}

/// Validated IR entity.
class IrEntity {
  const IrEntity({
    required this.name,
    required this.table,
    required this.primaryKey,
    required this.fields,
    required this.relations,
  });

  final String name;
  final String table;
  final String primaryKey;
  final List<IrField> fields;
  final List<IrRelation> relations;
}

/// SDL config block.
class SdlConfig {
  const SdlConfig({this.localFirst, this.ai});

  final SdlLocalFirstConfig? localFirst;
  final SdlAiConfig? ai;
}

class SdlLocalFirstConfig {
  const SdlLocalFirstConfig({this.engine, this.sync});
  final String? engine;
  final String? sync;
}

class SdlAiConfig {
  const SdlAiConfig({this.mcp, this.a2a});
  final bool? mcp;
  final bool? a2a;
}

/// Fully validated IR — consumed by code generators and transport builders.
class EntityGraphIR {
  const EntityGraphIR({
    required this.version,
    required this.entities,
    required this.config,
  });

  final String version;
  final List<IrEntity> entities;
  final SdlConfig config;
}

// ─── Error ────────────────────────────────────────────────────────────────

/// Thrown when an SDL document fails validation.
class SdlValidationError implements Exception {
  const SdlValidationError(this.message, this.path);

  final String message;
  final String path;

  @override
  String toString() => 'SdlValidationError: $message (at $path)';
}

// ─── Parser ───────────────────────────────────────────────────────────────

/// Parse + validate a Map SDL document (already decoded from JSON/TOML) into
/// a validated [EntityGraphIR].
///
/// Throws [SdlValidationError] with a precise JSON-path on the first problem.
///
/// ```dart
/// final ir = parseSdl(jsonDecode(rawJson));
/// ```
EntityGraphIR parseSdl(Object? doc) {
  if (doc is! Map) {
    throw const SdlValidationError('SDL root must be an object', r'$');
  }

  final version = (doc['version'] as String?) ?? '1.0';

  final entitiesRaw = doc['entities'];
  if (entitiesRaw is! Map) {
    throw const SdlValidationError(
      '`entities` must be an object',
      r'$.entities',
    );
  }

  final entities = <IrEntity>[];

  for (final MapEntry(:key, :value) in entitiesRaw.entries) {
    final name = key as String;
    final path = r'$.entities.' + name;

    if (value is! Map) {
      throw SdlValidationError('entity must be an object', path);
    }
    final fieldsRaw = value['fields'];
    if (fieldsRaw is! Map) {
      throw SdlValidationError('entity must have a `fields` object', path);
    }

    final fields = <IrField>[];
    String? primaryKey;

    for (final MapEntry(:key, :value) in fieldsRaw.entries) {
      final fname = key as String;
      final fpath = '$path.fields.$fname';

      if (value is! Map) {
        throw SdlValidationError('field must be an object', fpath);
      }
      final rawType = value['type'];
      if (rawType is! String) {
        throw SdlValidationError('field must have a `type` string', fpath);
      }
      final scalarType = _parseScalar(rawType, fpath);

      final isEnum = scalarType == SdlScalarType.enumType;
      if (isEnum) {
        final vals = value['values'];
        if (vals is! List || (vals).isEmpty) {
          throw SdlValidationError(
            'enum field requires non-empty `values`',
            fpath,
          );
        }
      }

      final isPrimary = (value['primary'] as bool?) ?? false;
      if (isPrimary) {
        if (primaryKey != null) {
          throw SdlValidationError(
            'multiple primary keys not supported',
            fpath,
          );
        }
        primaryKey = fname;
      }

      fields.add(IrField(
        name: fname,
        type: scalarType,
        primary: isPrimary,
        required: (value['required'] as bool?) ?? false,
        unique: (value['unique'] as bool?) ?? false,
        auto: (value['auto'] as bool?) ?? false,
        defaultValue: value['default'],
        values: isEnum
            ? (value['values'] as List).cast<String>()
            : null,
      ));
    }

    if (primaryKey == null) {
      throw SdlValidationError(
        'entity needs exactly one `primary: true` field',
        path,
      );
    }

    final relations = <IrRelation>[];
    final relationsRaw = value['relations'];
    if (relationsRaw is Map) {
      for (final MapEntry(:key, :value) in relationsRaw.entries) {
        final rname = key as String;
        final rpath = '$path.relations.$rname';
        if (value is! Map) {
          throw SdlValidationError('relation must be an object', rpath);
        }
        final rawKind = value['type'];
        if (rawKind is! String) {
          throw SdlValidationError('relation must have a `type`', rpath);
        }
        final target = value['target'];
        if (target is! String) {
          throw SdlValidationError('relation needs a `target`', rpath);
        }
        relations.add(IrRelation(
          name: rname,
          type: _parseRelationKind(rawKind, rpath),
          target: target,
          foreignKey: value['foreignKey'] as String?,
          through: value['through'] as String?,
        ));
      }
    }

    entities.add(IrEntity(
      name: name,
      table: (value['table'] as String?) ?? name,
      primaryKey: primaryKey,
      fields: fields,
      relations: relations,
    ));
  }

  // Cross-reference relation targets.
  final names = entities.map((e) => e.name).toSet();
  for (final entity in entities) {
    for (final relation in entity.relations) {
      if (!names.contains(relation.target)) {
        throw SdlValidationError(
          'relation target "${relation.target}" is not a defined entity',
          '\$.entities.${entity.name}.relations.${relation.name}',
        );
      }
    }
  }

  final configRaw = doc['config'];
  final config = _parseConfig(configRaw);

  return EntityGraphIR(version: version, entities: entities, config: config);
}

/// Parse an SDL document from a JSON string.
EntityGraphIR parseSdlJson(String json) {
  // Simple JSON decode without dart:convert to keep the library dependency-free.
  // In real usage, callers decode first then pass to parseSdl.
  // This is a thin wrapper for test convenience.
  // ignore: avoid_dynamic_calls
  throw UnimplementedError(
    'Use dart:convert jsonDecode first, then call parseSdl(decoded).',
  );
}

SdlConfig _parseConfig(Object? raw) {
  if (raw is! Map) return const SdlConfig();
  final lf = raw['localFirst'];
  final ai = raw['ai'];
  return SdlConfig(
    localFirst: lf is Map
        ? SdlLocalFirstConfig(
            engine: lf['engine'] as String?,
            sync: lf['sync'] as String?,
          )
        : null,
    ai: ai is Map
        ? SdlAiConfig(
            mcp: ai['mcp'] as bool?,
            a2a: ai['a2a'] as bool?,
          )
        : null,
  );
}
