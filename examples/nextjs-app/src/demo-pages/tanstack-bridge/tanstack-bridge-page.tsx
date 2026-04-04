import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useBridgePostFromGraph,
  useSyncQueryResultToGraph,
  useTanStackQueryBridgePost,
} from "@/features/tanstack-bridge/use-tanstack-query-bridge";

export function TanStackBridgePage() {
  const [postId, setPostId] = useState("demo-1");
  const query = useTanStackQueryBridgePost(postId);
  useSyncQueryResultToGraph(query.data);
  const fromGraph = useBridgePostFromGraph(postId);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">TanStack Query → entity graph</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The left panel uses <code className="text-xs">useQuery</code>. On success, a hook syncs the
          payload into the Zustand graph. The right panel reads the same record via{" "}
          <code className="text-xs">readEntity</code>—no second network request.
        </p>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <Label htmlFor="post-id">Post id (change to refetch)</Label>
        <Input
          id="post-id"
          value={postId}
          onChange={(e) => setPostId(e.target.value)}
          className="font-mono text-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">TanStack Query</CardTitle>
            <CardDescription>Async request + query cache</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <span className="text-muted-foreground">status:</span>{" "}
              <span className="font-mono">{query.status}</span>
            </p>
            <p>
              <span className="text-muted-foreground">fetchStatus:</span>{" "}
              <span className="font-mono">{query.fetchStatus}</span>
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/60 p-3 text-xs">
              {query.data ? JSON.stringify(query.data, null, 2) : "—"}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entity graph</CardTitle>
            <CardDescription>
              <code className="text-xs">readEntity(&quot;BridgeDemoPost&quot;, id)</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <pre className="overflow-x-auto rounded-lg bg-muted/60 p-3 text-xs">
              {fromGraph ? JSON.stringify(fromGraph, null, 2) : "— (empty until Query succeeds)"}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
