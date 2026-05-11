import { Redirect, Stack } from "expo-router";

import { useAuth } from "~/lib/auth";

export default function AuthGroupLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/(app)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
