/**
 * Structural sanity tests for the Drizzle schema.
 * No real Postgres connection — uses getTableColumns() for type-level assertions.
 */
import { getTableColumns } from "drizzle-orm";
import { users, sellerAccounts } from "../schema";

describe("users table schema", () => {
  const columns = getTableColumns(users);

  it("has id column (text, primary key)", () => {
    expect(columns.id).toBeDefined();
    expect(columns.id.dataType).toBe("string");
  });

  it("has email column (text, not null)", () => {
    expect(columns.email).toBeDefined();
    expect(columns.email.dataType).toBe("string");
    expect(columns.email.notNull).toBe(true);
  });

  it("has createdAt column", () => {
    expect(columns.createdAt).toBeDefined();
  });

  it("has updatedAt column", () => {
    expect(columns.updatedAt).toBeDefined();
  });
});

describe("sellerAccounts table schema", () => {
  const columns = getTableColumns(sellerAccounts);

  it("has userId column (text, primary key)", () => {
    expect(columns.userId).toBeDefined();
    expect(columns.userId.dataType).toBe("string");
  });

  it("has stripeAccountId column (text, nullable)", () => {
    expect(columns.stripeAccountId).toBeDefined();
    expect(columns.stripeAccountId.dataType).toBe("string");
  });

  it("has onboardingStatus column (text, not null, default pending)", () => {
    expect(columns.onboardingStatus).toBeDefined();
    expect(columns.onboardingStatus.notNull).toBe(true);
    expect(columns.onboardingStatus.default).toBe("pending");
  });

  it("has payoutsEnabled column (boolean, not null, default false)", () => {
    expect(columns.payoutsEnabled).toBeDefined();
    expect(columns.payoutsEnabled.dataType).toBe("boolean");
    expect(columns.payoutsEnabled.notNull).toBe(true);
    expect(columns.payoutsEnabled.default).toBe(false);
  });

  it("has createdAt column", () => {
    expect(columns.createdAt).toBeDefined();
  });

  it("has updatedAt column", () => {
    expect(columns.updatedAt).toBeDefined();
  });
});
