import {
  StyleSheet,
  TextInput,
  View,
  type AccessibilityState,
  type TextInputProps,
} from "react-native";

import { Text } from "./Text";
import { useTheme } from "~/lib/theme-provider";

export type FieldProps = Omit<TextInputProps, "accessibilityLabel"> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Field({
  label,
  error,
  hint,
  style,
  editable,
  ...rest
}: FieldProps) {
  const theme = useTheme();
  const invalid = typeof error === "string" && error.length > 0;

  const accessibilityState: AccessibilityState = {
    disabled: editable === false,
    ...(invalid ? { invalid: true } : {}),
  };

  return (
    <View style={styles.wrapper}>
      <Text variant="caption" muted style={{ marginBottom: theme.spacing(1) }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityState={accessibilityState}
        editable={editable}
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
            borderColor: invalid ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radii.md,
            paddingHorizontal: theme.spacing(3),
            fontSize: theme.typography.body.fontSize,
          },
          style as object,
        ]}
        {...rest}
      />
      {invalid ? (
        <Text variant="caption" style={{ color: theme.colors.danger, marginTop: theme.spacing(1) }}>
          {error}
        </Text>
      ) : null}
      {!invalid && hint ? (
        <Text variant="caption" muted style={{ marginTop: theme.spacing(1) }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
  },
});
