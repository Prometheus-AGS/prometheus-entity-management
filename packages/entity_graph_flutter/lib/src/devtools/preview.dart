part of 'controller.dart';

final class _EntityPreviewReceipt {
  const _EntityPreviewReceipt({
    required this.previewId,
    required this.type,
    required this.id,
    required this.priorPatch,
    required this.previewPatch,
    required this.appliedPatch,
    required this.baselineRevision,
    required this.previewRevision,
    required this.appliedPatchRevision,
    required this.appliedAt,
  });

  final String previewId;
  final String type;
  final String id;
  final Map<String, Object?>? priorPatch;
  final Map<String, Object?> previewPatch;
  final Map<String, Object?> appliedPatch;
  final int baselineRevision;
  final int previewRevision;
  final int appliedPatchRevision;
  final String appliedAt;
}

Object? _copyPreviewValue(Object? value) {
  if (value is Map) {
    return Map<Object?, Object?>.unmodifiable({
      for (final entry in value.entries)
        entry.key: _copyPreviewValue(entry.value),
    });
  }
  if (value is List) {
    return List<Object?>.unmodifiable(value.map(_copyPreviewValue));
  }
  if (value is Set) {
    return Set<Object?>.unmodifiable(value.map(_copyPreviewValue));
  }
  return value;
}

Map<String, Object?> _copyPreviewPatch(Map<String, Object?> value) =>
    Map<String, Object?>.unmodifiable({
      for (final entry in value.entries)
        entry.key: _copyPreviewValue(entry.value),
    });

int _entityValueRevision(
  EntityGraphDevtoolsController controller,
  String type,
  String id,
) =>
    (controller._entityValueRevisions[_entityIdentityKey(type, id)] ?? 0) +
    controller._projectionFailureRevision;

Object? _projectPreviewPatch(
  EntityGraphDevtoolsController controller,
  String type,
  String id,
  Object? value,
) => _projectInspectionValue(
  controller,
  value,
  category: EntityGraphDevtoolsChangeCategory.patch,
  key: type,
  id: id,
);

bool _previewValueEquals(Object? left, Object? right) {
  if (identical(left, right) || left == right) return true;
  if (left is List && right is List) {
    if (left.length != right.length) return false;
    for (var index = 0; index < left.length; index += 1) {
      if (!_previewValueEquals(left[index], right[index])) return false;
    }
    return true;
  }
  if (left is Set && right is Set) {
    if (left.length != right.length) return false;
    final unmatched = right.toList(growable: true);
    for (final leftValue in left) {
      final index = unmatched.indexWhere(
        (rightValue) => _previewValueEquals(leftValue, rightValue),
      );
      if (index < 0) return false;
      unmatched.removeAt(index);
    }
    return true;
  }
  if (left is Map && right is Map) {
    if (left.length != right.length) return false;
    for (final entry in left.entries) {
      if (!right.containsKey(entry.key) ||
          !_previewValueEquals(entry.value, right[entry.key])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

void _removePreviewReceipt(
  EntityGraphDevtoolsController controller,
  _EntityPreviewReceipt receipt,
) {
  controller._previewReceipts.remove(receipt.previewId);
  final key = _entityIdentityKey(receipt.type, receipt.id);
  if (controller._activePreviewByEntity[key] == receipt.previewId) {
    controller._activePreviewByEntity.remove(key);
  }
}

EntityGraphDevtoolsPreviewAppliedReceipt? _applyEntityPreview(
  EntityGraphDevtoolsController controller,
  String type,
  String id,
  Map<String, Object?> patch,
) {
  if (controller.isDisposed ||
      patch.isEmpty ||
      controller._historyMode == EntityGraphDevtoolsHistoryMode.rewound ||
      controller._graph.readCanonicalEntity(type, id) == null) {
    return null;
  }
  final key = _entityIdentityKey(type, id);
  if (controller._activePreviewByEntity.containsKey(key)) return null;
  final storedPriorPatch = controller._graph.readEntityPatch(type, id);
  final priorPatch = storedPriorPatch == null
      ? null
      : _copyPreviewPatch(storedPriorPatch);
  final previewPatch = _copyPreviewPatch(patch);
  final baselineRevision = _entityValueRevision(controller, type, id);
  controller._graph.patchEntity(type, id, previewPatch);
  final appliedPatch = _copyPreviewPatch(
    controller._graph.readEntityPatch(type, id) ?? const {},
  );
  final previewRevision = _entityValueRevision(controller, type, id);
  final appliedPatchRevision = controller._entityPatchRevisions[key] ?? 0;
  final receipt = _EntityPreviewReceipt(
    previewId:
        'preview-${controller.controllerId}-'
        '${controller._nextPreviewNumber++}',
    type: type,
    id: id,
    priorPatch: priorPatch,
    previewPatch: previewPatch,
    appliedPatch: appliedPatch,
    baselineRevision: baselineRevision,
    previewRevision: previewRevision,
    appliedPatchRevision: appliedPatchRevision,
    appliedAt: DateTime.now().toUtc().toIso8601String(),
  );
  controller._previewReceipts[receipt.previewId] = receipt;
  controller._activePreviewByEntity[key] = receipt.previewId;
  return EntityGraphDevtoolsPreviewAppliedReceipt(
    previewId: receipt.previewId,
    entity: EntityGraphDevtoolsViewMembership(type: type, id: id),
    priorPatch: priorPatch == null
        ? null
        : _projectPreviewPatch(controller, type, id, priorPatch),
    previewPatch: _projectPreviewPatch(controller, type, id, previewPatch),
    appliedPatch: _projectPreviewPatch(controller, type, id, appliedPatch),
    baselineRevision: baselineRevision,
    previewRevision: previewRevision,
    appliedAt: receipt.appliedAt,
  );
}

EntityGraphDevtoolsPreviewRestoreReceipt? _restoreEntityPreview(
  EntityGraphDevtoolsController controller,
  String previewId, {
  bool allowDisposing = false,
}) {
  if (controller._disposed || (controller._disposing && !allowDisposing)) {
    return null;
  }
  if (controller._historyMode == EntityGraphDevtoolsHistoryMode.rewound) {
    return null;
  }
  final receipt = controller._previewReceipts[previewId];
  if (receipt == null) return null;
  final observedRevision = _entityValueRevision(
    controller,
    receipt.type,
    receipt.id,
  );
  final currentPatch = controller._graph.readEntityPatch(
    receipt.type,
    receipt.id,
  );
  final currentPatchRevision =
      controller._entityPatchRevisions[_entityIdentityKey(
        receipt.type,
        receipt.id,
      )] ??
      0;
  if (currentPatchRevision != receipt.appliedPatchRevision ||
      !_previewValueEquals(currentPatch, receipt.appliedPatch)) {
    final conflict = EntityGraphDevtoolsPreviewConflictReceipt(
      previewId: previewId,
      expectedRevision: receipt.previewRevision,
      observedRevision: observedRevision,
      currentPatch: currentPatch == null
          ? null
          : _projectPreviewPatch(
              controller,
              receipt.type,
              receipt.id,
              currentPatch,
            ),
      priorPatch: receipt.priorPatch == null
          ? null
          : _projectPreviewPatch(
              controller,
              receipt.type,
              receipt.id,
              receipt.priorPatch,
            ),
    );
    _removePreviewReceipt(controller, receipt);
    return conflict;
  }
  controller._graph.replaceEntityPatch(
    receipt.type,
    receipt.id,
    receipt.priorPatch,
  );
  _removePreviewReceipt(controller, receipt);
  final result = EntityGraphDevtoolsPreviewRestoredReceipt(
    previewId: previewId,
    restoredPatch: receipt.priorPatch == null
        ? null
        : _projectPreviewPatch(
            controller,
            receipt.type,
            receipt.id,
            receipt.priorPatch,
          ),
    observedRevision: observedRevision,
    restoredAt: DateTime.now().toUtc().toIso8601String(),
  );
  return result;
}
