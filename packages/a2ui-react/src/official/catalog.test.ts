import { basicCatalog } from "@a2ui/react/v0_9";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROMETHEUS_A2UI_COMPONENTS,
  DEFAULT_PROMETHEUS_A2UI_FUNCTIONS,
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  createPrometheusA2uiCatalog,
} from "./catalog.js";

describe("Prometheus A2UI catalog over official @a2ui 0.12.0", () => {
  it("only allowlists functions the official v0.9 basic catalog still ships", () => {
    const missing = DEFAULT_PROMETHEUS_A2UI_FUNCTIONS.filter(
      (name) => !basicCatalog.functions.has(name),
    );
    expect(missing).toEqual([]);
  });

  it("builds the default catalog without throwing", () => {
    expect(() => createPrometheusA2uiCatalog()).not.toThrow();
  });

  it("passes id, protocol version, components and functions in the 0.12.0 constructor order", () => {
    const catalog = createPrometheusA2uiCatalog();

    expect(catalog.id).toBe(PROMETHEUS_A2UI_CATALOG_ID);
    expect(catalog.protocolVersion).toBe(PROMETHEUS_A2UI_PROTOCOL_VERSION);
    expect([...catalog.components.keys()]).toEqual([...DEFAULT_PROMETHEUS_A2UI_COMPONENTS]);
    expect([...catalog.functions.keys()]).toEqual([...DEFAULT_PROMETHEUS_A2UI_FUNCTIONS]);
    expect(catalog.themeSchema).toBe(basicCatalog.themeSchema);
  });

  it("reuses the official implementations rather than copies", () => {
    const catalog = createPrometheusA2uiCatalog();

    for (const name of DEFAULT_PROMETHEUS_A2UI_COMPONENTS) {
      expect(catalog.components.get(name)).toBe(basicCatalog.components.get(name));
    }
    for (const name of DEFAULT_PROMETHEUS_A2UI_FUNCTIONS) {
      expect(catalog.functions.get(name)).toBe(basicCatalog.functions.get(name));
    }
  });

  it("rejects names the official catalog does not provide", () => {
    expect(() =>
      createPrometheusA2uiCatalog({ functions: ["add" as never] }),
    ).toThrowError("Official A2UI function is unavailable: add");
    expect(() =>
      createPrometheusA2uiCatalog({ components: ["UnsafeWidget" as never] }),
    ).toThrowError("Official A2UI component is unavailable: UnsafeWidget");
  });
});
