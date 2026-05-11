import { Redirect } from "expo-router";

import { useAuth } from "~/lib/auth";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return <Redirect href={isSignedIn ? "/(app)" : "/(auth)/sign-in"} />;
}
