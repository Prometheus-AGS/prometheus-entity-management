"use client";

import { useNextRuntime } from "./use-next-runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NextRuntimeClient() {
  const runtime = useNextRuntime();

  return (
    <div className="grid gap-4 lg:grid-cols-3" data-testid="next-runtime">
      <Card>
        <CardHeader><CardTitle>Request-scoped SSR</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Server preload: <strong>{runtime.request?.preload ?? "missing"}</strong></p>
          <p className="break-all" data-testid="request-id">
            Request: {runtime.request?.requestId ?? "missing"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Server Action mutation</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p data-testid="task-status">Status: {runtime.task?.status ?? "missing"}</p>
          <Button onClick={runtime.confirmMutation} disabled={runtime.mutation.isPending}>
            {runtime.mutation.isPending ? "Confirming…" : "Move to review"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Realtime takeover</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p data-testid="task-priority">Priority: {runtime.task?.priority ?? "missing"}</p>
          <Button onClick={runtime.emitRealtime} disabled={!runtime.realtimeReady}>
            Apply client event
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
