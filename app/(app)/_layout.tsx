import { Redirect, Stack } from "expo-router";

import { useAuth } from "~/lib/auth";

export default function AppGroupLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
