import { PostHog } from "posthog-react-native";

import { logger, serializeError } from "./logger";

type Properties = Parameters<PostHog["capture"]>[1];

type Buffered = { event: string; properties?: Properties };

let client: PostHog | null = null;
let buffer: Buffered[] = [];
let initPromise: Promise<PostHog | null> | null = null;

export interface AnalyticsInitOptions {
  apiKey?: string;
  host?: string;
}

function readEnvOptions(env: Record<string, string | undefined>): AnalyticsInitOptions {
  return {
    apiKey: env.EXPO_PUBLIC_POSTHOG_KEY,
    host: env.EXPO_PUBLIC_POSTHOG_HOST,
  };
}

export async function init(
  options?: AnalyticsInitOptions,
  envOrFactory?:
    | Record<string, string | undefined>
    | ((opts: { apiKey: string; host?: string }) => Promise<PostHog>),
): Promise<PostHog | null> {
  if (initPromise) return initPromise;

  const resolved =
    options ??
    readEnvOptions(
      (envOrFactory && typeof envOrFactory === "object"
        ? envOrFactory
        : (process.env as Record<string, string | undefined>)),
    );
  const factory =
    typeof envOrFactory === "function"
      ? envOrFactory
      : async (opts: { apiKey: string; host?: string }) =>
          new PostHog(opts.apiKey, opts.host ? { host: opts.host } : undefined);

  if (!resolved.apiKey) {
    initPromise = Promise.resolve(null);
    buffer = [];
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const factoryOpts =
        resolved.host !== undefined
          ? { apiKey: resolved.apiKey!, host: resolved.host }
          : { apiKey: resolved.apiKey! };
      const created = await factory(factoryOpts);
      client = created;
      for (const item of buffer) {
        created.capture(item.event, item.properties);
      }
      buffer = [];
      return created;
    } catch (err) {
      logger.error("analytics: init failed", {
        breadcrumb_category: "analytics",
        error: serializeError(err),
      });
      buffer = [];
      return null;
    }
  })();

  return initPromise;
}

export function capture(event: string, properties?: Properties): void {
  if (client) {
    client.capture(event, properties);
    return;
  }
  buffer.push(properties === undefined ? { event } : { event, properties });
}

export function identify(distinctId: string, properties?: Properties): void {
  if (client) {
    client.identify(distinctId, properties);
  }
}

export function shutdownAnalyticsForTests(): void {
  client = null;
  buffer = [];
  initPromise = null;
}

export const analytics = { init, capture, identify };
