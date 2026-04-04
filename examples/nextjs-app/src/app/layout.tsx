import type { Metadata } from "next";
import "./globals.css";
import "@/schema";
import { DemoLayoutClient } from "@/components/demo-layout-client";
import { buildInitialEntitiesFromSeed } from "@/lib/ssr-entities";

export const metadata: Metadata = {
  title: "Prometheus — Entity Graph Demo",
  description:
    "Entity graph store demo: Next.js + React 19, SSR hydration, CRUD, entity graph",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialEntities = buildInitialEntitiesFromSeed();

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
        <DemoLayoutClient initialEntities={initialEntities}>
          {children}
        </DemoLayoutClient>
      </body>
    </html>
  );
}
