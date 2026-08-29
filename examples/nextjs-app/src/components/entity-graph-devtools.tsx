"use client";

import { useEffect, useState } from "react";
import type { GraphStore } from "@prometheus-ags/entity-graph-core";

type EntityGraphDevtoolsHost = typeof import(
  "@prometheus-ags/prometheus-entity-management/devtools"
)["EntityGraphDevtools"];

export function NextEntityGraphDevtools({ store }: { store: GraphStore }) {
  const [Host, setHost] = useState<EntityGraphDevtoolsHost | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let active = true;
    void import("@prometheus-ags/prometheus-entity-management/devtools").then((module) => {
      if (active) setHost(() => module.EntityGraphDevtools);
    });
    return () => {
      active = false;
    };
  }, []);

  return Host ? <Host mode="auto" store={store} /> : null;
}
