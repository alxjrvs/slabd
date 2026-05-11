import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { TokenCache } from "@clerk/clerk-expo";

import { logger, serializeError } from "./logger";

const secureStoreOpts: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

const CORRUPT_DATA_CODES = new Set([
  "E_SECURESTORE_DECRYPT_ERROR",
  "E_SECURESTORE_CORRUPT_DATA",
  "E_CRYPTO_FAILED",
]);

function isCorruptDataError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" && CORRUPT_DATA_CODES.has(code);
}

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    if (Platform.OS === "web") return null;
    try {
      return await SecureStore.getItemAsync(key, secureStoreOpts);
    } catch (err) {
      if (isCorruptDataError(err)) {
        logger.warn(`tokenCache: corrupt entry for "${key}", self-healing`, {
          breadcrumb_category: "corrupt_token_cache",
          key,
          error: serializeError(err),
        });
        try {
          await SecureStore.deleteItemAsync(key, secureStoreOpts);
        } catch (deleteErr) {
          logger.error(`tokenCache: delete-on-corrupt failed for "${key}"`, {
            breadcrumb_category: "corrupt_token_cache",
            key,
            error: serializeError(deleteErr),
          });
        }
        return null;
      }
      logger.error(`tokenCache: read failed for "${key}"`, {
        breadcrumb_category: "token_cache",
        key,
        error: serializeError(err),
      });
      throw err;
    }
  },
  async saveToken(key: string, value: string) {
    if (Platform.OS === "web") return;
    try {
      await SecureStore.setItemAsync(key, value, secureStoreOpts);
    } catch (err) {
      logger.error(`tokenCache: write failed for "${key}"`, {
        breadcrumb_category: "token_cache",
        key,
        error: serializeError(err),
      });
      throw err;
    }
  },
};
