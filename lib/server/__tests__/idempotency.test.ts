/**
 * Tests for lib/server/stripe/idempotency.ts
 *
 * Pins:
 * - first insert returns { inserted: true }
 * - duplicate returns { inserted: false }
 */

import { recordEvent } from "../stripe/idempotency";

// ---------------------------------------------------------------------------
// Mock DB helpers
// ---------------------------------------------------------------------------

/**
 * A minimal mock that simulates the Drizzle chain:
 * db.insert(table).values(data).onConflictDoNothing().returning(fields)
 *
 * On the first call for a given eventId it returns [{ eventId }].
 * On subsequent calls it returns [] (simulating ON CONFLICT DO NOTHING).
 */
function buildMockDb(seenEventIds: Set<string> = new Set()) {
  return {
    insert: (_table: unknown) => ({
      values: (data: { eventId: string }) => ({
        onConflictDoNothing: () => ({
          returning: (_fields: unknown): { eventId: string }[] => {
            if (seenEventIds.has(data.eventId)) {
              return [];
            }
            seenEventIds.add(data.eventId);
            return [{ eventId: data.eventId }];
          },
        }),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("recordEvent", () => {
  it("returns { inserted: true } on first insert", async () => {
    const db = buildMockDb() as Parameters<typeof recordEvent>[0];
    const result = await recordEvent(db, "evt_001");
    expect(result).toEqual({ inserted: true });
  });

  it("returns { inserted: false } on duplicate insert", async () => {
    const seen = new Set<string>(["evt_dup"]);
    const db = buildMockDb(seen) as Parameters<typeof recordEvent>[0];
    const result = await recordEvent(db, "evt_dup");
    expect(result).toEqual({ inserted: false });
  });

  it("handles multiple distinct events independently", async () => {
    const seen = new Set<string>();
    const db = buildMockDb(seen) as Parameters<typeof recordEvent>[0];

    const r1 = await recordEvent(db, "evt_a");
    const r2 = await recordEvent(db, "evt_b");
    const r3 = await recordEvent(db, "evt_a"); // duplicate

    expect(r1).toEqual({ inserted: true });
    expect(r2).toEqual({ inserted: true });
    expect(r3).toEqual({ inserted: false });
  });
});
