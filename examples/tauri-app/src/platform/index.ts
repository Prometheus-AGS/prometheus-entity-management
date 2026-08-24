/**
 * platform/index.ts
 *
 * One detection point for the whole app (design D-2).
 */
import { isTauriHost, type PlatformBridge } from "./bridge";
import { TauriBridge } from "./tauri-bridge";
import { WebBridge } from "./web-bridge";

let bridge: PlatformBridge | null = null;

export function getBridge(): PlatformBridge {
  if (!bridge) bridge = isTauriHost() ? new TauriBridge() : new WebBridge();
  return bridge;
}
