import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { useTheme } from "~/lib/theme-provider";

export type TextVariant = "title" | "body" | "caption";

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  muted?: boolean;
};

export function Text({ variant = "body", muted, style, accessibilityRole, ...rest }: TextProps) {
  const theme = useTheme();
  const role = accessibilityRole ?? (variant === "title" ? "header" : undefined);
  const color = muted ? theme.colors.textMuted : theme.colors.text;
  const typography = theme.typography[variant];
  return (
    <RNText
      accessibilityRole={role}
      style={[{ color, ...typography }, style]}
      {...rest}
    />
  );
}
