import * as Sentry from "@sentry/react-native";

import { logger } from "~/lib/logger";
import { buildSentryConfig, initSentry, shutdownSentryForTests } from "../sentry";

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      runtimeVersion: "1.0.0",
      extra: { commitSha: "test-sha" },
    },
  },
}));

const mockInit = Sentry.init as jest.MockedFunction<typeof Sentry.init>;
const mockBreadcrumb = Sentry.addBreadcrumb as jest.MockedFunction<typeof Sentry.addBreadcrumb>;
const mockException = Sentry.captureException as jest.MockedFunction<typeof Sentry.captureException>;

beforeEach(() => {
  jest.clearAllMocks();
  shutdownSentryForTests();
  logger.__resetForTests();
});

describe("buildSentryConfig (AC-3)", () => {
  it("returns null when EXPO_PUBLIC_SENTRY_DSN is unset", () => {
    expect(buildSentryConfig({})).toBeNull();
    /* env is Record<string, string | undefined> so {} satisfies it */
  });

  it("tags release with EAS_BUILD_COMMIT_SHA and dist with EAS_BUILD_RUNTIME_VERSION", () => {
    const cfg = buildSentryConfig({
      EXPO_PUBLIC_SENTRY_DSN: "https://example.ingest.sentry.io/1",
      EAS_BUILD_COMMIT_SHA: "abc1234",
      EAS_BUILD_RUNTIME_VERSION: "2.4.0",
    });
    expect(cfg).toMatchObject({
      dsn: "https://example.ingest.sentry.io/1",
      release: "abc1234",
      dist: "2.4.0",
    });
  });

  it("falls back to Constants.expoConfig for SHA + runtime when EAS env is absent", () => {
    const cfg = buildSentryConfig({
      EXPO_PUBLIC_SENTRY_DSN: "https://example.ingest.sentry.io/1",
    });
    expect(cfg).toMatchObject({ release: "test-sha", dist: "1.0.0" });
  });
});

describe("initSentry (AC-3)", () => {
  it("is a no-op when DSN is unset and returns false", () => {
    expect(initSentry({})).toBe(false);
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("initializes the SDK exactly once even when called twice", () => {
    const env = { EXPO_PUBLIC_SENTRY_DSN: "https://example.ingest.sentry.io/1" };
    expect(initSentry(env)).toBe(true);
    expect(initSentry(env)).toBe(true);
    expect(mockInit).toHaveBeenCalledTimes(1);
  });
});

describe("Sentry breadcrumb sink (AC-4)", () => {
  const env = { EXPO_PUBLIC_SENTRY_DSN: "https://example.ingest.sentry.io/1" };

  it("emits an info-level breadcrumb with the correlation ID attached", () => {
    initSentry(env);
    logger.withCorrelationId("corr-99", () => {
      logger.info("user clicked save", { surface: "account" });
    });
    expect(mockBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
        message: "user clicked save",
        category: "app",
        data: expect.objectContaining({ correlation_id: "corr-99", surface: "account" }),
      }),
    );
  });

  it("uses breadcrumb_category from the log data when present", () => {
    initSentry(env);
    logger.warn("tokenCache: corrupt entry", {
      breadcrumb_category: "corrupt_token_cache",
      key: "__clerk_jwt",
    });
    expect(mockBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "warning",
        category: "corrupt_token_cache",
        data: expect.objectContaining({ key: "__clerk_jwt" }),
      }),
    );
    const call = mockBreadcrumb.mock.calls[0]?.[0] as { data?: Record<string, unknown> };
    expect(call.data).not.toHaveProperty("breadcrumb_category");
  });

  it("falls back to the flow tag when breadcrumb_category is absent", () => {
    initSentry(env);
    logger.error("verify phone: attempt failed", { flow: "auth.phone.verify" });
    expect(mockBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: "auth.phone.verify" }),
    );
  });

  it("captures errors via Sentry.captureException when data.error is an Error", () => {
    initSentry(env);
    const err = new Error("boom");
    logger.error("op failed", { error: err });
    expect(mockException).toHaveBeenCalledWith(err, expect.any(Object));
  });

  it("captures errors when data.error is a serialized object", () => {
    initSentry(env);
    logger.error("op failed", { error: { name: "ClerkAPIError", message: "rate limited" } });
    const arg = mockException.mock.calls[0]?.[0] as Error;
    expect(arg).toBeInstanceOf(Error);
    expect(arg.message).toBe("rate limited");
    expect(arg.name).toBe("ClerkAPIError");
  });

  it("does not emit debug-level breadcrumbs", () => {
    initSentry(env);
    logger.debug("noisy detail");
    expect(mockBreadcrumb).not.toHaveBeenCalled();
  });
});
