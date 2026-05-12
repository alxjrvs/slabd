import { renderHook } from "@testing-library/react-native";

import { useAuth, type AuthUser } from "../auth";

const mockUseClerkAuth = jest.fn();
const mockUseUser = jest.fn();
const mockClerkSignOut = jest.fn();

jest.mock("@clerk/clerk-expo", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockUseClerkAuth(),
  useUser: () => mockUseUser(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockClerkSignOut.mockResolvedValue(undefined);
});

describe("useAuth() — Clerk adapter (AuthUser discriminated union)", () => {
  it("AC-2: reports isLoaded=false while either Clerk hook is loading", () => {
    mockUseClerkAuth.mockReturnValue({
      isLoaded: false,
      isSignedIn: false,
      signOut: mockClerkSignOut,
    });
    mockUseUser.mockReturnValue({ isLoaded: false, user: null });

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoaded).toBe(false);
    expect(result.current.user).toEqual({ kind: "signed-out" });
  });

  it("AC-2: maps a signed-in Clerk user to the signed-in variant (email identifier)", () => {
    mockUseClerkAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      signOut: mockClerkSignOut,
    });
    mockUseUser.mockReturnValue({
      isLoaded: true,
      user: {
        id: "user_123",
        firstName: "Ada",
        lastName: "Lovelace",
        primaryEmailAddress: { emailAddress: "buyer@slabd.io" },
        primaryPhoneNumber: null,
      },
    });

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.user).toEqual({
      kind: "signed-in",
      id: "user_123",
      identifier: "buyer@slabd.io",
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("AC-2: falls back to the phone number when no email is set", () => {
    mockUseClerkAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      signOut: mockClerkSignOut,
    });
    mockUseUser.mockReturnValue({
      isLoaded: true,
      user: {
        id: "user_456",
        firstName: null,
        lastName: null,
        primaryEmailAddress: null,
        primaryPhoneNumber: { phoneNumber: "+15555550101" },
      },
    });

    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toEqual({
      kind: "signed-in",
      id: "user_456",
      identifier: "+15555550101",
      firstName: null,
      lastName: null,
    });
  });

  it("AC-2: signOut delegates to Clerk's signOut", async () => {
    mockUseClerkAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      signOut: mockClerkSignOut,
    });
    mockUseUser.mockReturnValue({
      isLoaded: true,
      user: {
        id: "user_1",
        firstName: null,
        lastName: null,
        primaryEmailAddress: { emailAddress: "buyer@slabd.io" },
      },
    });
    const { result } = renderHook(() => useAuth());
    await result.current.signOut();
    expect(mockClerkSignOut).toHaveBeenCalledTimes(1);
  });

  it("AC-2 type-level: AuthUser requires narrowing on `kind` before accessing signed-in fields", () => {
    // Type-only check: TS must reject accessing firstName without narrowing.
    // Wrapped in a function never called at runtime — purely a compile-time
    // assertion via @ts-expect-error.
    const _typeGuard = (u: AuthUser) => {
      // @ts-expect-error — property 'firstName' does not exist on the union
      void u.firstName;
      if (u.kind === "signed-in") {
        // After narrowing, firstName is accessible:
        void u.firstName;
      }
    };
    void _typeGuard;
    expect(true).toBe(true);
  });
});
