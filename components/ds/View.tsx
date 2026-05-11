import { View as RNView, type ViewProps as RNViewProps } from "react-native";

import { useTheme } from "~/lib/theme-provider";

export type ViewSurface = "bg" | "surface" | "surfaceMuted" | "transparent";

export type ViewProps = RNViewProps & {
  surface?: ViewSurface;
  padding?: number;
};

export function View({ surface = "transparent", padding, style, ...rest }: ViewProps) {
  const theme = useTheme();
  const backgroundColor = surface === "transparent" ? undefined : theme.colors[surface];
  return (
    <RNView
      style={[backgroundColor ? { backgroundColor } : null, padding != null ? { padding: theme.spacing(padding) } : null, style]}
      {...rest}
    />
  );
}
