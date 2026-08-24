import type { Metadata } from "next";
import "./globals.css";
import { DemoLayoutClient } from "@/components/demo-layout-client";
import { preloadRequestGraph } from "@/features/next-runtime/server-graph";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prometheus — Entity Graph Demo",
  description:
    "Entity graph store demo: Next.js + React 19, SSR hydration, CRUD, entity graph",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const snapshot = await preloadRequestGraph();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <DemoLayoutClient snapshot={snapshot}>
          {children}
        </DemoLayoutClient>
      </body>
    </html>
  );
}
