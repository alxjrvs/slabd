import { Redirect, Stack } from "expo-router";

import { useAuth } from "~/lib/auth";

export default function AuthGroupLayout() {
  const { isLoaded, user } = useAuth();
  if (!isLoaded) return null;
  if (user.kind === "signed-in") return <Redirect href="/(app)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
