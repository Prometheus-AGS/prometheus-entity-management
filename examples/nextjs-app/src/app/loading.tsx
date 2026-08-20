export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center p-6" data-testid="route-loading">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        <p className="text-sm">Loading route…</p>
      </div>
    </div>
  );
}
