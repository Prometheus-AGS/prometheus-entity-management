/**
 * registry.test.ts — Unit tests for the SyncProvider registry.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  registerSyncProvider,
  getSyncProvider,
  getAllSyncProviders,
  getRegisteredSyncTypes,
  getTypesForProvider,
  __resetSyncRegistry,
} from "./registry";
import type { SyncProvider } from "./types";

// Minimal no-op provider for testing.
function makeMockProvider(name: string): SyncProvider {
  return {
    name,
    async start() {},
    pushLocalChange() {},
    stop() {},
  };
}

describe("SyncProvider registry", () => {
  beforeEach(() => {
    __resetSyncRegistry();
  });

  it("registers a provider for multiple entity types", () => {
    const provider = makeMockProvider("test");
    registerSyncProvider({ entityTypes: ["Document", "Task"], provider });

    expect(getSyncProvider("Document")).toBe(provider);
    expect(getSyncProvider("Task")).toBe(provider);
  });

  it("returns undefined for unregistered type", () => {
    expect(getSyncProvider("Unknown")).toBeUndefined();
  });

  it("replaces a prior provider when re-registering the same type", () => {
    const providerA = makeMockProvider("A");
    const providerB = makeMockProvider("B");

    registerSyncProvider({ entityTypes: ["Document"], provider: providerA });
    registerSyncProvider({ entityTypes: ["Document"], provider: providerB });

    expect(getSyncProvider("Document")).toBe(providerB);
  });

  it("getAllSyncProviders returns de-duplicated provider set", () => {
    const sharedProvider = makeMockProvider("shared");
    const otherProvider = makeMockProvider("other");

    registerSyncProvider({ entityTypes: ["Document", "Task"], provider: sharedProvider });
    registerSyncProvider({ entityTypes: ["Comment"], provider: otherProvider });

    const all = getAllSyncProviders();
    expect(all.size).toBe(2);
    expect(all.has(sharedProvider)).toBe(true);
    expect(all.has(otherProvider)).toBe(true);
  });

  it("getRegisteredSyncTypes returns all registered entity types", () => {
    const provider = makeMockProvider("p");
    registerSyncProvider({ entityTypes: ["Alpha", "Beta", "Gamma"], provider });

    const types = getRegisteredSyncTypes();
    expect(types).toContain("Alpha");
    expect(types).toContain("Beta");
    expect(types).toContain("Gamma");
    expect(types.length).toBe(3);
  });

  it("getTypesForProvider returns only types managed by that provider", () => {
    const p1 = makeMockProvider("p1");
    const p2 = makeMockProvider("p2");

    registerSyncProvider({ entityTypes: ["X", "Y"], provider: p1 });
    registerSyncProvider({ entityTypes: ["Z"], provider: p2 });

    expect(getTypesForProvider(p1)).toEqual(expect.arrayContaining(["X", "Y"]));
    expect(getTypesForProvider(p1)).not.toContain("Z");
    expect(getTypesForProvider(p2)).toEqual(["Z"]);
  });

  it("throws when entityTypes is empty", () => {
    const provider = makeMockProvider("p");
    expect(() =>
      registerSyncProvider({ entityTypes: [], provider }),
    ).toThrowError(/entityTypes must be non-empty/);
  });

  it("__resetSyncRegistry clears all registrations", () => {
    const provider = makeMockProvider("p");
    registerSyncProvider({ entityTypes: ["Doc"], provider });
    __resetSyncRegistry();
    expect(getSyncProvider("Doc")).toBeUndefined();
    expect(getRegisteredSyncTypes()).toHaveLength(0);
  });
});
