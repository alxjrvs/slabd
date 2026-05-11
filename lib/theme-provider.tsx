import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import { darkTheme, lightTheme, type ColorScheme, type Theme } from "./theme";

const ThemeContext = createContext<Theme>(darkTheme);

export type ThemeProviderProps = {
  children: ReactNode;
  /**
   * Force a specific color scheme. When omitted, follows the device setting
   * via `useColorScheme()` and falls back to dark (Slabd's brand default).
   */
  scheme?: ColorScheme;
};

export function ThemeProvider({ children, scheme }: ThemeProviderProps) {
  const deviceScheme = useColorScheme();
  const resolved: ColorScheme = scheme ?? (deviceScheme === "light" ? "light" : "dark");
  const value = useMemo(() => (resolved === "light" ? lightTheme : darkTheme), [resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
