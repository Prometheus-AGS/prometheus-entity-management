import { describe, it, expect, vi } from "vitest";
import {
  buildTenantWhere,
  createTenantScopedElectricAdapter,
  type TenantScopedTableConfig,
} from "./electricsql-tenant";

const VALID_UUID = "11111111-2222-4333-8444-555555555555";

function fakeShapeStream() {
  return {
    subscribe: () => () => {},
    isUpToDate: false,
    lastOffset: "0",
  };
}

function fakePGlite() {
  return {
    query: vi.fn(async () => ({ rows: [] as never[] })),
    exec: vi.fn(async () => {}),
    listen: vi.fn(async () => () => {}),
  };
}

describe("buildTenantWhere", () => {
  it("builds an id= clause for tenant root (null tenantColumn)", () => {
    expect(buildTenantWhere(null, VALID_UUID, "company")).toBe(
      `id = '${VALID_UUID}'`,
    );
  });

  it("builds a tenant column clause", () => {
    expect(buildTenantWhere("company_id", VALID_UUID, "client")).toBe(
      `company_id = '${VALID_UUID}'`,
    );
  });

  it("throws when tenantColumn is undefined", () => {
    expect(() => buildTenantWhere(undefined, VALID_UUID, "client")).toThrow(
      /lacks tenantColumn/,
    );
  });

  it("throws when companyId is not a UUID", () => {
    expect(() =>
      buildTenantWhere("company_id", "not-a-uuid", "client"),
    ).toThrow(/must be a UUID/);
  });

  it("throws when tenantColumn contains unsafe characters", () => {
    expect(() =>
      buildTenantWhere("company_id; DROP TABLE x", VALID_UUID, "client"),
    ).toThrow(/unsafe tenantColumn/);
  });
});

describe("createTenantScopedElectricAdapter", () => {
  it("refuses to attach when companyId is not a UUID", () => {
    expect(() =>
      createTenantScopedElectricAdapter({
        pglite: fakePGlite(),
        tenantClaim: { companyId: "nope" },
        tables: [],
      }),
    ).toThrow(/must be a UUID/);
  });

  it("refuses to attach when a table lacks tenantColumn", () => {
    const badTable = {
      type: "Client",
      table: "client",
      // tenantColumn intentionally omitted
      shapeStreamFactory: () => fakeShapeStream(),
    } as unknown as TenantScopedTableConfig;

    expect(() =>
      createTenantScopedElectricAdapter({
        pglite: fakePGlite(),
        tenantClaim: { companyId: VALID_UUID },
        tables: [badTable],
      }),
    ).toThrow(/lacks tenantColumn/);
  });

  it("passes the tenant claim and built where clause to the factory", () => {
    const factory = vi.fn(() => fakeShapeStream());
    const tables: TenantScopedTableConfig[] = [
      {
        type: "Client",
        table: "client",
        tenantColumn: "company_id",
        shapeStreamFactory: factory,
      },
      {
        type: "Company",
        table: "company",
        tenantColumn: null,
        shapeStreamFactory: factory,
      },
    ];
    createTenantScopedElectricAdapter({
      pglite: fakePGlite(),
      tenantClaim: { companyId: VALID_UUID },
      tables,
    });
    expect(factory).toHaveBeenCalledTimes(2);
    expect(factory).toHaveBeenNthCalledWith(1, {
      table: "client",
      where: `company_id = '${VALID_UUID}'`,
      tenantClaim: { companyId: VALID_UUID },
    });
    expect(factory).toHaveBeenNthCalledWith(2, {
      table: "company",
      where: `id = '${VALID_UUID}'`,
      tenantClaim: { companyId: VALID_UUID },
    });
  });
});
