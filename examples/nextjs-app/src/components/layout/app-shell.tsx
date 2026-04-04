import React from "react";
import { Sidebar } from "./sidebar";

interface AppShellProps { children: React.ReactNode; }

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="tj-app-main flex-1 overflow-auto flex flex-col min-w-0 bg-background px-1 py-1">
        {children}
      </main>
    </div>
  );
}
