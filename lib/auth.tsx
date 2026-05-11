import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type AuthUser = {
  id: string;
  identifier: string;
};

export type AuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: AuthUser | null;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
};

const noop = () => {};

const defaultValue: AuthContextValue = {
  isLoaded: false,
  isSignedIn: false,
  user: null,
  signIn: noop,
  signOut: noop,
};

const AuthContext = createContext<AuthContextValue>(defaultValue);

/**
 * Stub auth provider used in cycle-3 to wire routing + gating. Cycle-4
 * replaces this with Clerk's `useAuth()` while keeping the same shape.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const signIn = useCallback((next: AuthUser) => setUser(next), []);
  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoaded: true,
      isSignedIn: user !== null,
      user,
      signIn,
      signOut,
    }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
