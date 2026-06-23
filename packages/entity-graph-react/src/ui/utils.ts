/**
 * ui/utils.ts  — minimal cn() helper for the UI layer
 * (same as app-level utils but keeps the library self-contained)
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
