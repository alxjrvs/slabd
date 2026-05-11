import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { AuthProvider, useAuth } from "../auth";

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe("auth context (stub for cycle-3, replaced by Clerk in cycle-4)", () => {
  it("AC-2: starts unauthenticated once loaded", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("AC-2: signIn marks the session signed in and stores the identifier", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.signIn({ id: "user_stub_1", identifier: "buyer@slabd.io" });
    });
    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.user).toEqual({ id: "user_stub_1", identifier: "buyer@slabd.io" });
  });

  it("AC-2: signOut clears the session", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.signIn({ id: "user_stub_1", identifier: "buyer@slabd.io" });
    });
    act(() => {
      result.current.signOut();
    });
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
