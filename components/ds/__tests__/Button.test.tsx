import { fireEvent, render, screen } from "@testing-library/react-native";

import { Button } from "../Button";
import { ThemeProvider } from "~/lib/theme-provider";

const renderWithTheme = (ui: React.ReactElement, scheme: "light" | "dark" = "light") =>
  render(<ThemeProvider scheme={scheme}>{ui}</ThemeProvider>);

describe("Button (DS primitive)", () => {
  it("AC-6: exposes an accessible button role with the given label", () => {
    renderWithTheme(<Button label="Continue" onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeOnTheScreen();
  });

  it("AC-6: fires onPress when enabled", () => {
    const onPress = jest.fn();
    renderWithTheme(<Button label="Continue" onPress={onPress} />);
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("AC-6: marks itself as disabled and suppresses onPress when disabled", () => {
    const onPress = jest.fn();
    renderWithTheme(<Button label="Continue" onPress={onPress} disabled />);
    const button = screen.getByRole("button", { name: "Continue" });
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("AC-6: announces busy state to assistive tech when loading", () => {
    renderWithTheme(<Button label="Saving" onPress={() => {}} loading />);
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });

  it("AC-1: resolves primary background from the active palette", () => {
    renderWithTheme(<Button label="Continue" onPress={() => {}} />, "dark");
    const button = screen.getByRole("button", { name: "Continue" });
    const styles = Array.isArray(button.props.style) ? button.props.style : [button.props.style];
    const flat = Object.assign({}, ...styles.filter(Boolean));
    expect(flat.backgroundColor).toBe("#7c8cff");
  });
});
