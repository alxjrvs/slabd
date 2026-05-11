import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { init as initAnalytics } from "~/lib/analytics";
import { AuthProvider } from "~/lib/auth";
import { initSentry } from "~/lib/observability/sentry";
import { ThemeProvider } from "~/lib/theme-provider";

initSentry();
void initAnalytics();

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
