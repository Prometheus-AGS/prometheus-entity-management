import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('parseSdl', () {
    test('parses a minimal valid SDL document', () {
      final ir = parseSdl({
        'version': '1.0',
        'entities': {
          'User': {
            'fields': {
              'id': {'type': 'uuid', 'primary': true},
              'name': {'type': 'string', 'required': true},
            },
          },
        },
      });

      expect(ir.version, equals('1.0'));
      expect(ir.entities.length, equals(1));
      final user = ir.entities.first;
      expect(user.name, equals('User'));
      expect(user.primaryKey, equals('id'));
      expect(user.table, equals('User'));
      expect(user.fields.length, equals(2));
    });

    test('defaults version to 1.0 when absent', () {
      final ir = parseSdl({
        'entities': {
          'Item': {
            'fields': {
              'id': {'type': 'string', 'primary': true},
            },
          },
        },
      });
      expect(ir.version, equals('1.0'));
    });

    test('uses custom table name when provided', () {
      final ir = parseSdl({
        'entities': {
          'User': {
            'table': 'users',
            'fields': {
              'id': {'type': 'uuid', 'primary': true},
            },
          },
        },
      });
      expect(ir.entities.first.table, equals('users'));
    });

    test('parses enum field with values', () {
      final ir = parseSdl({
        'entities': {
          'Post': {
            'fields': {
              'id': {'type': 'uuid', 'primary': true},
              'status': {
                'type': 'enum',
                'values': ['draft', 'published', 'archived'],
              },
            },
          },
        },
      });
      final statusField = ir.entities.first.fields
          .firstWhere((f) => f.name == 'status');
      expect(statusField.type, equals(SdlScalarType.enumType));
      expect(statusField.values, equals(['draft', 'published', 'archived']));
    });

    test('parses hasMany relation', () {
      final ir = parseSdl({
        'entities': {
          'User': {
            'fields': {
              'id': {'type': 'uuid', 'primary': true},
            },
            'relations': {
              'posts': {
                'type': 'hasMany',
                'target': 'Post',
                'foreignKey': 'userId',
              },
            },
          },
          'Post': {
            'fields': {
              'id': {'type': 'uuid', 'primary': true},
            },
          },
        },
      });
      final user = ir.entities.firstWhere((e) => e.name == 'User');
      expect(user.relations.length, equals(1));
      expect(user.relations.first.name, equals('posts'));
      expect(user.relations.first.type, equals(SdlRelationKind.hasMany));
      expect(user.relations.first.target, equals('Post'));
    });

    test('parses belongsTo and manyToMany relations', () {
      final ir = parseSdl({
        'entities': {
          'Post': {
            'fields': {
              'id': {'type': 'uuid', 'primary': true},
            },
            'relations': {
              'author': {
                'type': 'belongsTo',
                'target': 'User',
                'foreignKey': 'authorId',
              },
              'tags': {
                'type': 'manyToMany',
                'target': 'Tag',
                'through': 'PostTag',
              },
            },
          },
          'User': {
            'fields': {'id': {'type': 'uuid', 'primary': true}},
          },
          'Tag': {
            'fields': {'id': {'type': 'uuid', 'primary': true}},
          },
          'PostTag': {
            'fields': {'id': {'type': 'uuid', 'primary': true}},
          },
        },
      });
      final post = ir.entities.firstWhere((e) => e.name == 'Post');
      expect(post.relations.length, equals(2));
    });

    test('parses config block', () {
      final ir = parseSdl({
        'entities': {
          'Item': {
            'fields': {'id': {'type': 'string', 'primary': true}},
          },
        },
        'config': {
          'localFirst': {'engine': 'pglite', 'sync': 'electric'},
          'ai': {'mcp': true, 'a2a': false},
        },
      });
      expect(ir.config.localFirst?.engine, equals('pglite'));
      expect(ir.config.ai?.mcp, isTrue);
    });

    group('validation errors', () {
      test('throws when root is not a map', () {
        expect(
          () => parseSdl('not a map'),
          throwsA(isA<SdlValidationError>()),
        );
      });

      test('throws when entities is missing', () {
        expect(
          () => parseSdl({'version': '1.0'}),
          throwsA(isA<SdlValidationError>()),
        );
      });

      test('throws when entity has no primary key', () {
        expect(
          () => parseSdl({
            'entities': {
              'User': {
                'fields': {
                  'name': {'type': 'string'},
                },
              },
            },
          }),
          throwsA(isA<SdlValidationError>()),
        );
      });

      test('throws for duplicate primary keys', () {
        expect(
          () => parseSdl({
            'entities': {
              'User': {
                'fields': {
                  'id': {'type': 'uuid', 'primary': true},
                  'altId': {'type': 'uuid', 'primary': true},
                },
              },
            },
          }),
          throwsA(isA<SdlValidationError>()),
        );
      });

      test('throws for unknown field type', () {
        expect(
          () => parseSdl({
            'entities': {
              'User': {
                'fields': {
                  'id': {'type': 'unknown_type', 'primary': true},
                },
              },
            },
          }),
          throwsA(isA<SdlValidationError>()),
        );
      });

      test('throws for enum field without values', () {
        expect(
          () => parseSdl({
            'entities': {
              'User': {
                'fields': {
                  'id': {'type': 'uuid', 'primary': true},
                  'role': {'type': 'enum'},
                },
              },
            },
          }),
          throwsA(isA<SdlValidationError>()),
        );
      });

      test('throws when relation target does not exist', () {
        expect(
          () => parseSdl({
            'entities': {
              'User': {
                'fields': {
                  'id': {'type': 'uuid', 'primary': true},
                },
                'relations': {
                  'posts': {
                    'type': 'hasMany',
                    'target': 'NonExistentEntity',
                  },
                },
              },
            },
          }),
          throwsA(isA<SdlValidationError>()),
        );
      });
    });

    group('SdlValidationError', () {
      test('toString includes message and path', () {
        const err = SdlValidationError('bad field', r'$.entities.User.fields.id');
        expect(err.toString(), contains('bad field'));
        expect(err.toString(), contains(r'$.entities.User.fields.id'));
      });
    });
  });
}
