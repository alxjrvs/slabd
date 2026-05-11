import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { TokenCache } from "@clerk/clerk-expo";

/**
 * SecureStore-backed token cache for native; falls back to in-memory on web
 * where SecureStore is unavailable. Clerk persists session JWTs through this.
 */
export const tokenCache: TokenCache = {
  async getToken(key: string) {
    if (Platform.OS === "web") return null;
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    if (Platform.OS === "web") return;
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      /* noop — Clerk re-fetches on failure */
    }
  },
};
