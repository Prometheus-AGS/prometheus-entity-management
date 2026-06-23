import { describe, it, expect } from "vitest";
import { TerminalError, TransientError, toEntityError } from "./errors";

describe("TerminalError / TransientError", () => {
  it("are instanceof Error and instanceof themselves", () => {
    const t = new TerminalError("boom", { status: 404 });
    expect(t).toBeInstanceOf(Error);
    expect(t).toBeInstanceOf(TerminalError);
    expect(t).not.toBeInstanceOf(TransientError);
    expect(t.kind).toBe("terminal");
    expect(t.status).toBe(404);
    expect(t.message).toBe("boom");
    expect(t.name).toBe("TerminalError");
  });

  it("TransientError carries status and kind", () => {
    const t = new TransientError("oops", { status: 503 });
    expect(t).toBeInstanceOf(TransientError);
    expect(t).not.toBeInstanceOf(TerminalError);
    expect(t.kind).toBe("transient");
    expect(t.status).toBe(503);
    expect(t.name).toBe("TransientError");
  });

  it("preserve cause for chaining", () => {
    const root = new Error("root");
    const wrapped = new TerminalError("wrap", { cause: root });
    expect(wrapped.cause).toBe(root);
  });
});

describe("toEntityError", () => {
  it("passes through TerminalError unchanged", () => {
    const t = new TerminalError("x");
    expect(toEntityError(t)).toBe(t);
  });

  it("passes through TransientError unchanged", () => {
    const t = new TransientError("x");
    expect(toEntityError(t)).toBe(t);
  });

  it("maps a 4xx status object to TerminalError", () => {
    const err = toEntityError({ status: 404, message: "not found" });
    expect(err).toBeInstanceOf(TerminalError);
    expect(err.status).toBe(404);
    expect(err.message).toBe("not found");
  });

  it("maps a 5xx status object to TransientError", () => {
    const err = toEntityError({ status: 500, message: "boom" });
    expect(err).toBeInstanceOf(TransientError);
    expect(err.status).toBe(500);
  });

  it("maps AbortError to TerminalError", () => {
    const err = toEntityError({ name: "AbortError", message: "cancelled" });
    expect(err).toBeInstanceOf(TerminalError);
  });

  it("defaults to TransientError for plain Error", () => {
    const err = toEntityError(new Error("network down"));
    expect(err).toBeInstanceOf(TransientError);
    expect(err.message).toBe("network down");
  });

  it("defaults to TransientError for unknown thrown value", () => {
    const err = toEntityError("string thrown");
    expect(err).toBeInstanceOf(TransientError);
    expect(err.message).toBe("string thrown");
  });
});
