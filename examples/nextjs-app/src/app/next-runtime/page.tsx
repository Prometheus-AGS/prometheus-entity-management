import { NextRuntimeClient } from "@/features/next-runtime/next-runtime-client";

export default function NextRuntimePage() {
  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-primary">Next.js 16 App Router</p>
        <h1 className="text-3xl font-semibold tracking-tight">SSR and hydration runtime</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          A request-owned server graph is dehydrated into one scoped browser graph.
          Server Actions confirm mutations; realtime ownership begins only after mount.
        </p>
      </div>
      <NextRuntimeClient />
    </main>
  );
}
