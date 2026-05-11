import { render, screen } from "@testing-library/react-native";

import { Text } from "../Text";
import { ThemeProvider } from "~/lib/theme-provider";

const renderWithTheme = (ui: React.ReactElement, scheme: "light" | "dark" = "light") =>
  render(<ThemeProvider scheme={scheme}>{ui}</ThemeProvider>);

describe("Text (DS primitive)", () => {
  it("AC-6: resolves the body color from the active palette", () => {
    renderWithTheme(<Text>Slabd</Text>, "light");
    const node = screen.getByText("Slabd");
    const styles = Array.isArray(node.props.style) ? node.props.style : [node.props.style];
    const flat = Object.assign({}, ...styles.filter(Boolean));
    expect(flat.color).toBe("#0b0b0c");
  });

  it("AC-6: applies the title variant scale", () => {
    renderWithTheme(<Text variant="title">Hello</Text>);
    const node = screen.getByText("Hello");
    const styles = Array.isArray(node.props.style) ? node.props.style : [node.props.style];
    const flat = Object.assign({}, ...styles.filter(Boolean));
    expect(flat.fontSize).toBe(28);
    expect(flat.fontWeight).toBe("700");
  });

  it("AC-6: exposes accessibilityRole='header' for the title variant", () => {
    renderWithTheme(<Text variant="title">Slabd</Text>);
    expect(screen.getByRole("header", { name: "Slabd" })).toBeOnTheScreen();
  });
});
