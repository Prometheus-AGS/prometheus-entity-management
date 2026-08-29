export type EntityGraphDevtoolsMode = "auto" | "on" | "off";

declare const process: { env?: { NODE_ENV?: string } } | undefined;

/** Resolve host/build enablement without touching the DOM or loading the inspector. */
export function isEntityGraphDevtoolsEnabled(mode: EntityGraphDevtoolsMode = "auto"): boolean {
  if (mode === "off") return false;
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (mode === "on") return true;

  const nodeEnvironment = typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;
  return typeof nodeEnvironment === "string" && nodeEnvironment !== "production";
}
