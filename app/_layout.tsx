import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "~/lib/auth";
import { initSentry } from "~/lib/observability/sentry";
import { ThemeProvider } from "~/lib/theme-provider";

initSentry();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Slot />
      </AuthProvider>
    </ThemeProvider>
  );
}
