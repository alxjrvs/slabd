/**
 * Structural sanity tests for the Drizzle schema.
 * No real Postgres connection — uses getTableColumns() for type-level assertions.
 */
import { getTableColumns } from "drizzle-orm";
import { users, sellerAccounts, listingImages, listings } from "../schema";

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

describe("listingImages table schema", () => {
  const columns = getTableColumns(listingImages);

  it("has id column (text, primary key)", () => {
    expect(columns.id).toBeDefined();
    expect(columns.id.dataType).toBe("string");
  });

  it("has listingId column (text, not null)", () => {
    expect(columns.listingId).toBeDefined();
    expect(columns.listingId.dataType).toBe("string");
    expect(columns.listingId.notNull).toBe(true);
  });

  it("has r2Key column (text, not null)", () => {
    expect(columns.r2Key).toBeDefined();
    expect(columns.r2Key.dataType).toBe("string");
    expect(columns.r2Key.notNull).toBe(true);
  });

  it("has position column (integer, not null)", () => {
    expect(columns.position).toBeDefined();
    expect(columns.position.dataType).toBe("number");
    expect(columns.position.notNull).toBe(true);
  });

  it("has isPrimary column (boolean, not null, default false)", () => {
    expect(columns.isPrimary).toBeDefined();
    expect(columns.isPrimary.dataType).toBe("boolean");
    expect(columns.isPrimary.notNull).toBe(true);
    expect(columns.isPrimary.default).toBe(false);
  });

  it("has createdAt column (timestamp with timezone, not null)", () => {
    expect(columns.createdAt).toBeDefined();
    expect(columns.createdAt.notNull).toBe(true);
  });
});

describe("listings table schema (S-2.4 cycle-1)", () => {
  const columns = getTableColumns(listings);

  it("has id column (text, primary key)", () => {
    expect(columns.id).toBeDefined();
    expect(columns.id.dataType).toBe("string");
  });

  it("has sellerUserId column (text, not null)", () => {
    expect(columns.sellerUserId).toBeDefined();
    expect(columns.sellerUserId.dataType).toBe("string");
    expect(columns.sellerUserId.notNull).toBe(true);
  });

  it("has status column (text, not null, default 'draft')", () => {
    expect(columns.status).toBeDefined();
    expect(columns.status.dataType).toBe("string");
    expect(columns.status.notNull).toBe(true);
    expect(columns.status.default).toBe("draft");
  });

  it("has series column (text, nullable)", () => {
    expect(columns.series).toBeDefined();
    expect(columns.series.dataType).toBe("string");
    expect(columns.series.notNull).toBe(false);
  });

  it("has issue column (text, nullable)", () => {
    expect(columns.issue).toBeDefined();
    expect(columns.issue.dataType).toBe("string");
    expect(columns.issue.notNull).toBe(false);
  });

  it("has gradeCompany column (text, nullable)", () => {
    expect(columns.gradeCompany).toBeDefined();
    expect(columns.gradeCompany.dataType).toBe("string");
    expect(columns.gradeCompany.notNull).toBe(false);
  });

  it("has gradeNumeric column (numeric, nullable)", () => {
    expect(columns.gradeNumeric).toBeDefined();
    expect(columns.gradeNumeric.notNull).toBe(false);
  });

  it("has priceCents column (integer, nullable)", () => {
    expect(columns.priceCents).toBeDefined();
    expect(columns.priceCents.dataType).toBe("number");
    expect(columns.priceCents.notNull).toBe(false);
  });

  it("has conditionNotes column (text, nullable)", () => {
    expect(columns.conditionNotes).toBeDefined();
    expect(columns.conditionNotes.dataType).toBe("string");
    expect(columns.conditionNotes.notNull).toBe(false);
  });

  it("has catalogMatchId column (text, nullable — manual entry is valid)", () => {
    expect(columns.catalogMatchId).toBeDefined();
    expect(columns.catalogMatchId.dataType).toBe("string");
    expect(columns.catalogMatchId.notNull).toBe(false);
  });

  it("has publishedAt column (timestamp with timezone, nullable)", () => {
    expect(columns.publishedAt).toBeDefined();
    expect(columns.publishedAt.notNull).toBe(false);
  });

  it("has createdAt column (timestamp with timezone, not null)", () => {
    expect(columns.createdAt).toBeDefined();
    expect(columns.createdAt.notNull).toBe(true);
  });

  it("has updatedAt column (timestamp with timezone, not null)", () => {
    expect(columns.updatedAt).toBeDefined();
    expect(columns.updatedAt.notNull).toBe(true);
  });
});
