"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[release-showcase] route error boundary", error.message);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <div role="alert" className="rounded-lg bg-red-100 p-4 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300">
        The release showcase failed to render: {error.message}
      </div>
      <Button size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
