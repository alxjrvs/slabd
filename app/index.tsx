import { Redirect } from "expo-router";

import { useAuth } from "~/lib/auth";

export default function Index() {
  const { isLoaded, user } = useAuth();
  if (!isLoaded) return null;
  return <Redirect href={user.kind === "signed-in" ? "/(app)" : "/(auth)/sign-up"} />;
}
