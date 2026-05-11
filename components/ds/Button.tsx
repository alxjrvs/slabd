import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text as RNText,
  type AccessibilityState,
  type PressableProps,
} from "react-native";

import { useTheme } from "~/lib/theme-provider";

export type ButtonVariant = "primary" | "secondary" | "danger";

export type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

export function Button({
  label,
  variant = "primary",
  disabled,
  loading,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);
  const inert = disabled === true || loading === true;

  const palette = resolvePalette(theme.colors, variant);
  const backgroundColor = inert
    ? withAlpha(palette.background, 0.6)
    : pressed
      ? palette.pressed
      : palette.background;

  const accessibilityState: AccessibilityState = {
    disabled: inert,
    busy: loading === true,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      disabled={inert}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.base,
        {
          backgroundColor,
          paddingHorizontal: theme.spacing(4),
          paddingVertical: theme.spacing(3),
          borderRadius: theme.radii.md,
        },
        style as object,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={palette.foreground} /> : null}
      <RNText
        style={[
          styles.label,
          { color: palette.foreground, fontSize: theme.typography.body.fontSize },
        ]}
      >
        {label}
      </RNText>
    </Pressable>
  );
}

type ButtonPalette = { background: string; pressed: string; foreground: string };

function resolvePalette(
  colors: ReturnType<typeof useTheme>["colors"],
  variant: ButtonVariant,
): ButtonPalette {
  switch (variant) {
    case "primary":
      return {
        background: colors.primary,
        pressed: colors.primaryPressed,
        foreground: colors.textOnPrimary,
      };
    case "secondary":
      return {
        background: colors.surface,
        pressed: colors.surfaceMuted,
        foreground: colors.text,
      };
    case "danger":
      return {
        background: colors.danger,
        pressed: colors.danger,
        foreground: colors.textOnPrimary,
      };
  }
}

function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
  },
  label: {
    fontWeight: "600",
  },
});
