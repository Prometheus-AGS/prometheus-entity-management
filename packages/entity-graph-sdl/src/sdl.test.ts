import { describe, it, expect } from "vitest";
import { parseSdl, parseSdlJson, SdlValidationError } from "./index";

const valid = {
  version: "1.0",
  entities: {
    user: {
      fields: {
        id: { type: "string", primary: true },
        name: { type: "string", required: true },
        status: { type: "enum", values: ["active", "inactive"], default: "active" },
      },
      relations: { orders: { type: "hasMany", target: "order", foreignKey: "userId" } },
    },
    order: {
      fields: { id: { type: "string", primary: true }, userId: { type: "string", required: true } },
      relations: { user: { type: "belongsTo", target: "user", foreignKey: "userId" } },
    },
  },
  config: { localFirst: { engine: "pglite", sync: "electric" }, ai: { mcp: true } },
} as const;

describe("SDL parser", () => {
  it("parses a valid document into IR", () => {
    const ir = parseSdl(valid);
    expect(ir.entities).toHaveLength(2);
    const user = ir.entities.find((e) => e.name === "user")!;
    expect(user.primaryKey).toBe("id");
    expect(user.table).toBe("user");
    expect(user.relations[0]).toMatchObject({ name: "orders", type: "hasMany", target: "order" });
    expect(ir.config.ai?.mcp).toBe(true);
  });

  it("requires exactly one primary key", () => {
    expect(() => parseSdl({ version: "1.0", entities: { x: { fields: { a: { type: "string" } } } } }))
      .toThrow(/primary: true/);
  });

  it("rejects unknown field types", () => {
    expect(() => parseSdl({ version: "1.0", entities: { x: { fields: { id: { type: "frobnicate", primary: true } } } } }))
      .toThrow(/unknown field type/);
  });

  it("rejects enum without values", () => {
    expect(() => parseSdl({ version: "1.0", entities: { x: { fields: { id: { type: "string", primary: true }, s: { type: "enum" } } } } }))
      .toThrow(/enum field requires/);
  });

  it("rejects relations to undefined entities", () => {
    expect(() => parseSdl({ version: "1.0", entities: { x: { fields: { id: { type: "string", primary: true } }, relations: { y: { type: "belongsTo", target: "ghost" } } } } }))
      .toThrow(/not a defined entity/);
  });

  it("parseSdlJson surfaces invalid JSON as SdlValidationError", () => {
    expect(() => parseSdlJson("{not json")).toThrow(SdlValidationError);
  });
});
