import { Redirect, Stack } from "expo-router";

import { useAuth } from "~/lib/auth";

export default function AppGroupLayout() {
  const { isLoaded, user } = useAuth();
  if (!isLoaded) return null;
  if (user.kind === "signed-out") return <Redirect href="/(auth)/sign-up" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
