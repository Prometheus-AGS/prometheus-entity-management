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
  final String appliedAt;
}

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
  if (controller._disposed ||
      controller._graph.readCanonicalEntity(type, id) == null) {
    return null;
  }
  final key = _entityIdentityKey(type, id);
  final previousPreviewId = controller._activePreviewByEntity[key];
  if (previousPreviewId != null) {
    controller._previewReceipts.remove(previousPreviewId);
  }
  final storedPriorPatch = controller._graph.readEntityPatch(type, id);
  final priorPatch = storedPriorPatch == null
      ? null
      : Map<String, Object?>.of(storedPriorPatch);
  final previewPatch = Map<String, Object?>.of(patch);
  final baselineRevision = _entityValueRevision(controller, type, id);
  controller._graph.patchEntity(type, id, previewPatch);
  final appliedPatch = Map<String, Object?>.of(
    controller._graph.readEntityPatch(type, id) ?? const {},
  );
  final previewRevision = _entityValueRevision(controller, type, id);
  final receipt = _EntityPreviewReceipt(
    previewId:
        'preview-${controller.storeId}-'
        '${controller._nextPreviewNumber++}',
    type: type,
    id: id,
    priorPatch: priorPatch,
    previewPatch: previewPatch,
    appliedPatch: appliedPatch,
    baselineRevision: baselineRevision,
    previewRevision: previewRevision,
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
  String previewId,
) {
  if (controller._disposed) return null;
  final receipt = controller._previewReceipts[previewId];
  if (receipt == null) return null;
  final observedRevision = _entityValueRevision(
    controller,
    receipt.type,
    receipt.id,
  );
  if (observedRevision != receipt.previewRevision) {
    final currentPatch = controller._graph.readEntityPatch(
      receipt.type,
      receipt.id,
    );
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
  return EntityGraphDevtoolsPreviewRestoredReceipt(
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
}
