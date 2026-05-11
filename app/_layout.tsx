import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { init as initAnalytics } from "~/lib/analytics";
import { AuthProvider } from "~/lib/auth";
import { initSentry } from "~/lib/observability/sentry";
import { ThemeProvider } from "~/lib/theme-provider";

export default function RootLayout() {
  useEffect(() => {
    initSentry();
    void initAnalytics();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Slot />
      </AuthProvider>
    </ThemeProvider>
  );
}
