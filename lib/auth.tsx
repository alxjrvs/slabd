import { ClerkProvider, useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { useCallback, useMemo, type ReactNode } from "react";

import { tokenCache } from "./token-cache";

export type AuthUser = {
  id: string;
  identifier: string;
};

export type AuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: AuthUser | null;
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
    const mappedUser: AuthUser | null =
      isSignedIn && user
        ? {
            id: user.id,
            identifier:
              user.primaryEmailAddress?.emailAddress ??
              user.primaryPhoneNumber?.phoneNumber ??
              user.id,
          }
        : null;
    return { isLoaded, isSignedIn, user: mappedUser, signOut };
  }, [clerkAuth.isLoaded, clerkAuth.isSignedIn, user, userLoaded, signOut]);
}
