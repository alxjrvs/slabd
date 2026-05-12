import { ClerkProvider, useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { useCallback, useMemo, type ReactNode } from "react";

import { tokenCache } from "./token-cache";

export type AuthUser =
  | { kind: "signed-out" }
  | {
      kind: "signed-in";
      id: string;
      identifier: string;
      firstName: string | null;
      lastName: string | null;
    };

export type AuthContextValue = {
  isLoaded: boolean;
  user: AuthUser;
  signOut: () => Promise<void>;
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!publishableKey) {
    throw new Error(
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is required. Copy .env.example to .env and set it.",
    );
  }
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}

export function useAuth(): AuthContextValue {
  const clerkAuth = useClerkAuth();
  const { user, isLoaded: userLoaded } = useUser();

  const signOut = useCallback(async () => {
    await clerkAuth.signOut();
  }, [clerkAuth]);

  return useMemo<AuthContextValue>(() => {
    const isLoaded = clerkAuth.isLoaded === true && userLoaded === true;
    const isSignedIn = clerkAuth.isSignedIn === true;
    const mappedUser: AuthUser =
      isSignedIn && user
        ? {
            kind: "signed-in",
            id: user.id,
            identifier:
              user.primaryEmailAddress?.emailAddress ??
              user.primaryPhoneNumber?.phoneNumber ??
              user.id,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        : { kind: "signed-out" };
    return { isLoaded, user: mappedUser, signOut };
  }, [clerkAuth.isLoaded, clerkAuth.isSignedIn, user, userLoaded, signOut]);
}
