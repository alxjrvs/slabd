import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { TokenCache } from "@clerk/clerk-expo";

const secureStoreOpts: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    if (Platform.OS === "web") return null;
    try {
      return await SecureStore.getItemAsync(key, secureStoreOpts);
    } catch {
      await SecureStore.deleteItemAsync(key, secureStoreOpts);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    if (Platform.OS === "web") return;
    await SecureStore.setItemAsync(key, value, secureStoreOpts);
  },
};
