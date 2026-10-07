import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { configureEngine, createGraphStore } from "@prometheus-ags/entity-graph-core";
import { GraphStoreProvider } from "./graph-store";
import { useEntityList } from "./hooks";

// Regression for issue #43: ~6 minutes after mount, the default GC (5 min gcTime, 60 s interval)
// evicted every row of a still-mounted useEntityList and stripped the ids from the list.
const SIX_MINUTES = 6 * 60 * 1000;

interface User {
  id: string;
  name: string;
}

describe("useEntityList under the default garbage collector", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    configureEngine({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps every row of a mounted list past the GC window", async () => {
    const store = createGraphStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GraphStoreProvider store={store}>{children}</GraphStoreProvider>
    );
    const fetchUsers = vi.fn(async () => ({
      items: [
        { id: "1", name: "Ada" },
        { id: "2", name: "Grace" },
      ],
    }));

    const { result } = renderHook(
      () =>
        useEntityList<User, User>({
          type: "User",
          queryKey: ["users"],
          fetch: fetchUsers,
          normalize: (user) => ({ id: user.id, data: user }),
          staleTime: 10 * 60 * 1000,
        }),
      { wrapper },
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.items.map((user) => user.name)).toEqual(["Ada", "Grace"]);

    await act(() => vi.advanceTimersByTimeAsync(SIX_MINUTES));

    expect(result.current.items.map((user) => user.name)).toEqual(["Ada", "Grace"]);
    expect(fetchUsers).toHaveBeenCalledTimes(1);
  });
});
