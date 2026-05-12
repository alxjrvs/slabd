export type ColorScheme = "light" | "dark";

declare const HexColorBrand: unique symbol;
export type HexColor = string & { readonly [HexColorBrand]: "HexColor" };

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function hex(value: string): HexColor {
  if (!HEX_RE.test(value)) {
    throw new Error(`Invalid HexColor: ${JSON.stringify(value)} — expected #rrggbb`);
  }
  return value as HexColor;
}

export type Palette = {
  bg: HexColor;
  surface: HexColor;
  surfaceMuted: HexColor;
  text: HexColor;
  textMuted: HexColor;
  textOnPrimary: HexColor;
  primary: HexColor;
  primaryPressed: HexColor;
  border: HexColor;
  danger: HexColor;
  success: HexColor;
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
  bg: hex("#ffffff"),
  surface: hex("#fafafa"),
  surfaceMuted: hex("#f1f3f5"),
  text: hex("#0b0b0c"),
  textMuted: hex("#5b6470"),
  textOnPrimary: hex("#ffffff"),
  primary: hex("#1f3aff"),
  primaryPressed: hex("#1731cc"),
  border: hex("#d8dde3"),
  danger: hex("#b21f2d"),
  success: hex("#1a7a3d"),
};

const darkPalette: Palette = {
  bg: hex("#0b0b0c"),
  surface: hex("#141416"),
  surfaceMuted: hex("#1d1f23"),
  text: hex("#fafafa"),
  textMuted: hex("#a4abb6"),
  textOnPrimary: hex("#ffffff"),
  primary: hex("#7c8cff"),
  primaryPressed: hex("#5d6fe6"),
  border: hex("#2a2d33"),
  danger: hex("#ff7a85"),
  success: hex("#5ed18a"),
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
