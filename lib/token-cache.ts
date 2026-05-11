import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { TokenCache } from "@clerk/clerk-expo";

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
        // TODO(S-1.5): replace with structured logger / Sentry breadcrumb
        console.warn(`tokenCache: corrupt entry for "${key}", self-healing`, err);
        try {
          await SecureStore.deleteItemAsync(key, secureStoreOpts);
        } catch (deleteErr) {
          console.error(`tokenCache: delete-on-corrupt failed for "${key}"`, deleteErr);
        }
        return null;
      }
      console.error(`tokenCache: read failed for "${key}"`, err);
      throw err;
    }
  },
  async saveToken(key: string, value: string) {
    if (Platform.OS === "web") return;
    try {
      await SecureStore.setItemAsync(key, value, secureStoreOpts);
    } catch (err) {
      console.error(`tokenCache: write failed for "${key}"`, err);
      throw err;
    }
  },
};
