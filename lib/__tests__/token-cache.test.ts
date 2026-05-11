import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { tokenCache } from "../token-cache";

jest.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK: "after_first_unlock",
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockGet = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;
const mockSet = SecureStore.setItemAsync as jest.MockedFunction<typeof SecureStore.setItemAsync>;
const mockDelete = SecureStore.deleteItemAsync as jest.MockedFunction<
  typeof SecureStore.deleteItemAsync
>;

const KEY = "__clerk_client_jwt";

const setPlatform = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
};

beforeEach(() => {
  jest.clearAllMocks();
  setPlatform("ios");
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("tokenCache.getToken (AC-5)", () => {
  it("returns the stored token on native", async () => {
    mockGet.mockResolvedValue("the-token");
    await expect(tokenCache.getToken!(KEY)).resolves.toBe("the-token");
    expect(mockGet).toHaveBeenCalledWith(KEY, expect.objectContaining({ keychainAccessible: "after_first_unlock" }));
  });

  it("returns null on web without touching SecureStore", async () => {
    setPlatform("web");
    await expect(tokenCache.getToken!(KEY)).resolves.toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("self-heals known-corrupt entries (deletes and returns null)", async () => {
    const err = Object.assign(new Error("decrypt failed"), { code: "E_SECURESTORE_DECRYPT_ERROR" });
    mockGet.mockRejectedValue(err);
    mockDelete.mockResolvedValue(undefined);
    await expect(tokenCache.getToken!(KEY)).resolves.toBeNull();
    expect(mockDelete).toHaveBeenCalledWith(KEY, expect.any(Object));
  });

  it("does NOT delete on unknown read errors — rethrows so callers can react", async () => {
    mockGet.mockRejectedValue(new Error("keychain temporarily unavailable"));
    await expect(tokenCache.getToken!(KEY)).rejects.toThrow("keychain temporarily unavailable");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("returns null even if delete-on-corrupt itself fails", async () => {
    const corrupt = Object.assign(new Error("corrupt"), { code: "E_CRYPTO_FAILED" });
    mockGet.mockRejectedValue(corrupt);
    mockDelete.mockRejectedValue(new Error("delete failed"));
    await expect(tokenCache.getToken!(KEY)).resolves.toBeNull();
  });
});

describe("tokenCache.saveToken (AC-5)", () => {
  it("writes the token on native", async () => {
    mockSet.mockResolvedValue(undefined);
    await tokenCache.saveToken!(KEY, "abc");
    expect(mockSet).toHaveBeenCalledWith(KEY, "abc", expect.any(Object));
  });

  it("is a no-op on web", async () => {
    setPlatform("web");
    await tokenCache.saveToken!(KEY, "abc");
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("propagates write failures so Clerk sees the error", async () => {
    mockSet.mockRejectedValue(new Error("disk full"));
    await expect(tokenCache.saveToken!(KEY, "abc")).rejects.toThrow("disk full");
  });
});
