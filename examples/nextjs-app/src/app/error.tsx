"use client";

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-3 p-6" role="alert">
      <h2 className="text-lg font-semibold">The graph route could not render.</h2>
      <button className="rounded-md border px-3 py-2" onClick={reset} type="button">
        Retry route
      </button>
    </div>
  );
}
