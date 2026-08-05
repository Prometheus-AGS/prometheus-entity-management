import { describe, expect, it } from "vitest";
import { createPrometheusA2uiRuntime } from "@prometheus-ags/a2ui-react";
import malformedFixture from "./fixtures/malformed-unknown-component.v0.9.1.json";
import taskReviewFixture from "./fixtures/task-review.v0.9.1.json";
import { createMalformedSurface, createTaskReviewSurface } from "./reference-surfaces";

describe("golden A2UI protocol fixtures", () => {
  it("keeps the deterministic shared-domain surface byte-structurally stable", () => {
    expect(createTaskReviewSurface()).toEqual(taskReviewFixture);
  });

  it("keeps the hostile-component fixture stable and rejected", () => {
    expect(createMalformedSurface()).toEqual(malformedFixture);
    const runtime = createPrometheusA2uiRuntime();
    expect(() => runtime.processMessages(createMalformedSurface())).toThrowError(
      expect.objectContaining({ code: "component-not-allowed" }),
    );
    runtime.dispose();
  });
});
