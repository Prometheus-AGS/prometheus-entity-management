/// A2UI agent panel: runs the keyless demo agent, renders the genui surface,
/// routes destructive actions through an approval dialog, and shows the
/// fail-closed receipt log so denials are visible rather than silent.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:genui/genui.dart';

import '../a2ui/action_policy.dart';
import '../a2ui/showcase_runtime.dart';
import '../a2ui/surface_messages.dart';
import 'task_board_page.dart';

/// Renders the agent lifecycle, the A2UI surface, and the policy receipts.
class A2uiPanel extends ConsumerStatefulWidget {
  const A2uiPanel({super.key});

  @override
  ConsumerState<A2uiPanel> createState() => _A2uiPanelState();
}

class _A2uiPanelState extends ConsumerState<A2uiPanel> {
  @override
  void initState() {
    super.initState();
    final runtime = ref.read(showcaseRuntimeProvider);
    runtime.approvalHandler = _requestApproval;
  }

  Future<bool> _requestApproval(A2uiApprovalRequest request) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Approve ${request.actionName}?'),
        content: Text(
          'Destructive action on ${request.entityType}/${request.entityId}.\n'
          'Data: ${request.data}',
        ),
        actions: [
          TextButton(
            key: const Key('approval-reject'),
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Reject'),
          ),
          FilledButton(
            key: const Key('approval-approve'),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Approve'),
          ),
        ],
      ),
    );
    return approved ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final runtime = ref.watch(showcaseRuntimeProvider);
    return Material(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                ValueListenableBuilder<DemoAgentState>(
                  valueListenable: runtime.agentState,
                  builder: (context, state, _) => Semantics(
                    label: 'Agent state ${state.name}',
                    child: Chip(label: Text('agent: ${state.name}')),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton.tonal(
                  key: const Key('run-agent-button'),
                  onPressed: () => runtime.runDemoAgent(
                    taskId: 'task-sync',
                    title: 'Wire realtime sync',
                    status: 'todo',
                  ),
                  child: const Text('Run agent'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            StreamBuilder<SurfaceUpdate>(
              stream: runtime.controller.surfaceUpdates,
              builder: (context, _) {
                final active = runtime.controller.activeSurfaceIds.contains(
                  taskBoardSurfaceId,
                );
                if (!active) {
                  return const Text('No agent surface yet');
                }
                return SizedBox(
                  height: 260,
                  child: Surface(
                    surfaceContext: runtime.controller.contextFor(
                      taskBoardSurfaceId,
                    ),
                  ),
                );
              },
            ),
            ValueListenableBuilder<List<A2uiActionReceipt>>(
              valueListenable: runtime.receipts,
              builder: (context, receipts, _) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final receipt in receipts)
                    Text(
                      receipt.toString(),
                      key: Key('receipt-${receipt.decision.name}'),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
