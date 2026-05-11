import { renderHook } from "@testing-library/react-native";

import { useAuth } from "../auth";

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

describe("useAuth() — Clerk adapter", () => {
  it("AC-2: reports isLoaded=false while either Clerk hook is loading", () => {
    mockUseClerkAuth.mockReturnValue({
      isLoaded: false,
      isSignedIn: false,
      signOut: mockClerkSignOut,
    });
    mockUseUser.mockReturnValue({ isLoaded: false, user: null });

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoaded).toBe(false);
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("AC-2: maps a signed-in Clerk user to the AuthUser shape (email identifier)", () => {
    mockUseClerkAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      signOut: mockClerkSignOut,
    });
    mockUseUser.mockReturnValue({
      isLoaded: true,
      user: {
        id: "user_123",
        primaryEmailAddress: { emailAddress: "buyer@slabd.io" },
        primaryPhoneNumber: null,
      },
    });

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.user).toEqual({ id: "user_123", identifier: "buyer@slabd.io" });
  });

  it("AC-3: falls back to the phone number when no email is set", () => {
    mockUseClerkAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      signOut: mockClerkSignOut,
    });
    mockUseUser.mockReturnValue({
      isLoaded: true,
      user: {
        id: "user_456",
        primaryEmailAddress: null,
        primaryPhoneNumber: { phoneNumber: "+15555550101" },
      },
    });

    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toEqual({ id: "user_456", identifier: "+15555550101" });
  });

  it("AC-2: signOut delegates to Clerk's signOut", async () => {
    mockUseClerkAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      signOut: mockClerkSignOut,
    });
    mockUseUser.mockReturnValue({
      isLoaded: true,
      user: { id: "user_1", primaryEmailAddress: { emailAddress: "buyer@slabd.io" } },
    });
    const { result } = renderHook(() => useAuth());
    await result.current.signOut();
    expect(mockClerkSignOut).toHaveBeenCalledTimes(1);
  });
});
