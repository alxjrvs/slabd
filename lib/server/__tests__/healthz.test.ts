/**
 * Tests for GET /api/healthz handler.
 *
 * AC-3: /api/healthz returns { status: "ok", db: "ok" | "down" }.
 * AC-5: handler tests (DB probe covered here).
 *
 * `lib/db/client` is mocked so no real Neon connection is made.
 */

import { createApp } from "../app";

// ---------------------------------------------------------------------------
// Mock lib/db/client — control the db.execute() behavior per-test
// ---------------------------------------------------------------------------

const mockExecute = jest.fn<Promise<unknown>, [unknown]>();

jest.mock("~/lib/db/client", () => ({
  db: { execute: (arg: unknown) => mockExecute(arg) },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AC-3: GET /api/healthz — DB probe resolves", () => {
  it('returns { status: "ok", db: "ok" } when DB probe resolves', async () => {
    mockExecute.mockResolvedValueOnce([{ "?column?": 1 }]);
    const app = createApp();
    const res = await app.request("/api/healthz");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", db: "ok" });
  });
});

describe("AC-3: GET /api/healthz — DB probe rejects", () => {
  it('returns { status: "ok", db: "down" } when DB probe rejects', async () => {
    mockExecute.mockRejectedValueOnce(new Error("connection refused"));
    const app = createApp();
    const res = await app.request("/api/healthz");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", db: "down" });
  });
});

describe("AC-3: GET /api/healthz — DB probe times out", () => {
  it('returns { status: "ok", db: "down" } when DB probe exceeds 1 second', async () => {
    jest.useFakeTimers();

    // Never resolves — simulates a hung connection
    mockExecute.mockImplementationOnce(
      () => new Promise<unknown>(() => undefined),
    );

    const app = createApp();
    const resPromise = app.request("/api/healthz");

    // Advance timers past the 1-second timeout
    jest.advanceTimersByTime(1100);

    const res = await resPromise;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", db: "down" });

    jest.useRealTimers();
  });
});
