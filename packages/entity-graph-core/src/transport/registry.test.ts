import { describe, it, expect, beforeEach } from "vitest";
import {
  registerEntityTransport,
  getEntityTransport,
  getRegisteredEntityTypes,
  __resetEntityTransports,
} from "./registry";
import type { EntityTransport } from "./types";

function makeNoopTransport<T extends object>(): EntityTransport<T> {
  return {
    identify: (row) => String((row as { id?: unknown }).id),
    authoritative: false,
    list: async () => ({ rows: [], total: 0, nextCursor: null }),
  };
}

beforeEach(() => {
  __resetEntityTransports();
});

describe("entity transport registry", () => {
  it("register + get round-trips", () => {
    const t = makeNoopTransport<{ id: string }>();
    registerEntityTransport("Client", t);
    expect(getEntityTransport("Client")).toBe(t);
  });

  it("re-registering replaces the prior transport", () => {
    const t1 = makeNoopTransport();
    const t2 = makeNoopTransport();
    registerEntityTransport("Foo", t1);
    registerEntityTransport("Foo", t2);
    expect(getEntityTransport("Foo")).toBe(t2);
  });

  it("throws a helpful error when no transport is registered", () => {
    expect(() => getEntityTransport("Missing")).toThrow(
      /No transport registered for entity type "Missing"/,
    );
  });

  it("getRegisteredEntityTypes returns the registered keys", () => {
    registerEntityTransport("A", makeNoopTransport());
    registerEntityTransport("B", makeNoopTransport());
    expect(getRegisteredEntityTypes().sort()).toEqual(["A", "B"]);
  });

  it("__resetEntityTransports clears all entries", () => {
    registerEntityTransport("A", makeNoopTransport());
    __resetEntityTransports();
    expect(getRegisteredEntityTypes()).toEqual([]);
  });
});
