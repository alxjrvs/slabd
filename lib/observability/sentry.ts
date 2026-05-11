import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

import { logger, type LogRecord } from "~/lib/logger";

let initialized = false;
let unregisterSink: (() => void) | null = null;

const LEVEL_MAP: Record<LogRecord["level"], Sentry.SeverityLevel> = {
  debug: "debug",
  info: "info",
  warn: "warning",
  error: "error",
};

export function buildSentryConfig(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): Sentry.ReactNativeOptions | null {
  const dsn = env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;

  const commitSha =
    env.EAS_BUILD_COMMIT_SHA ??
    (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.commitSha ??
    "dev";
  const runtimeVersion =
    env.EAS_BUILD_RUNTIME_VERSION ??
    (typeof Constants.expoConfig?.runtimeVersion === "string"
      ? Constants.expoConfig.runtimeVersion
      : undefined) ??
    "dev";

  const bundleId =
    Constants.expoConfig?.ios?.bundleIdentifier ??
    Constants.expoConfig?.android?.package ??
    Constants.expoConfig?.slug ??
    "app";
  const version = Constants.expoConfig?.version ?? "0.0.0";

  // Release format matches `@sentry/react-native`'s source-map upload default
  // (`bundleId@version+commitSha`) so symbolication artifacts resolve in prod.
  // `dist` distinguishes builds within a release — runtime version is stable.
  return {
    dsn,
    release: `${bundleId}@${version}+${commitSha}`,
    dist: String(runtimeVersion),
    environment: env.EXPO_PUBLIC_SENTRY_ENV ?? (__DEV__ ? "development" : "production"),
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.1,
  };
}

export function initSentry(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): boolean {
  if (initialized) return true;
  const config = buildSentryConfig(env);
  if (!config) return false;

  Sentry.init(config);

  unregisterSink = logger.registerSink((record) => {
    if (record.level === "debug") return;
    Sentry.addBreadcrumb({
      level: LEVEL_MAP[record.level],
      message: record.message,
      category: pickCategory(record),
      data: {
        ...(record.correlationId ? { correlation_id: record.correlationId } : {}),
        ...sanitizeData(record.data),
      },
    });
    if (record.level === "error") {
      const err = extractError(record.data);
      if (err) {
        Sentry.captureException(err, {
          tags: record.correlationId ? { correlation_id: record.correlationId } : undefined,
          extra: sanitizeData(record.data),
        });
      } else {
        Sentry.captureMessage(record.message, "error");
      }
    }
  });

  initialized = true;
  return true;
}

export function shutdownSentryForTests(): void {
  if (unregisterSink) {
    unregisterSink();
    unregisterSink = null;
  }
  initialized = false;
}

function pickCategory(record: LogRecord): string {
  const cat = record.data?.breadcrumb_category;
  if (typeof cat === "string" && cat.length > 0) return cat;
  const flow = record.data?.flow;
  if (typeof flow === "string" && flow.length > 0) return flow;
  return "app";
}

function sanitizeData(data: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!data) return {};
  const { breadcrumb_category: _bc, ...rest } = data;
  void _bc;
  return rest;
}

function extractError(data: Record<string, unknown> | undefined): Error | null {
  if (!data) return null;
  const raw = data.error;
  if (raw instanceof Error) return raw;
  if (raw && typeof raw === "object" && "message" in raw) {
    const shape = raw as { message?: unknown; name?: unknown; stack?: unknown };
    const err = new Error(String(shape.message));
    if (typeof shape.name === "string") err.name = shape.name;
    if (typeof shape.stack === "string") err.stack = shape.stack;
    return err;
  }
  return null;
}
