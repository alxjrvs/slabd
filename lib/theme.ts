export type ColorScheme = "light" | "dark";

export type Palette = {
  bg: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  primary: string;
  primaryPressed: string;
  border: string;
  danger: string;
  success: string;
};

export type Spacing = (n: number) => number;
export type Radii = { sm: number; md: number; lg: number; pill: number };
export type Typography = {
  title: { fontSize: number; fontWeight: "700"; lineHeight: number };
  body: { fontSize: number; fontWeight: "400"; lineHeight: number };
  caption: { fontSize: number; fontWeight: "400"; lineHeight: number };
};

export type Theme = {
  scheme: ColorScheme;
  colors: Palette;
  spacing: Spacing;
  radii: Radii;
  typography: Typography;
};

const baseSpacing: Spacing = (n) => n * 4;

const baseRadii: Radii = { sm: 6, md: 10, lg: 16, pill: 999 };

const baseTypography: Typography = {
  title: { fontSize: 28, fontWeight: "700", lineHeight: 34 },
  body: { fontSize: 16, fontWeight: "400", lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
};

const lightPalette: Palette = {
  bg: "#ffffff",
  surface: "#fafafa",
  surfaceMuted: "#f1f3f5",
  text: "#0b0b0c",
  textMuted: "#5b6470",
  textOnPrimary: "#ffffff",
  primary: "#1f3aff",
  primaryPressed: "#1731cc",
  border: "#d8dde3",
  danger: "#b21f2d",
  success: "#1a7a3d",
};

const darkPalette: Palette = {
  bg: "#0b0b0c",
  surface: "#141416",
  surfaceMuted: "#1d1f23",
  text: "#fafafa",
  textMuted: "#a4abb6",
  textOnPrimary: "#ffffff",
  primary: "#7c8cff",
  primaryPressed: "#5d6fe6",
  border: "#2a2d33",
  danger: "#ff7a85",
  success: "#5ed18a",
};

export const lightTheme: Theme = {
  scheme: "light",
  colors: lightPalette,
  spacing: baseSpacing,
  radii: baseRadii,
  typography: baseTypography,
};

export const darkTheme: Theme = {
  scheme: "dark",
  colors: darkPalette,
  spacing: baseSpacing,
  radii: baseRadii,
  typography: baseTypography,
};

export const themes = { light: lightTheme, dark: darkTheme } as const;
