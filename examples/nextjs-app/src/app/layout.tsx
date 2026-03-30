import type { Metadata } from "next";
import "./globals.css";
import "@/lib/schema";
import { Navigation } from "@/components/navigation";

export const metadata: Metadata = {
  title: "Prometheus — Entity Graph Demo",
  description: "Entity graph store demo: Next.js 15 + React 19, SSR hydration, CRUD, Suspense, live entity graph",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
