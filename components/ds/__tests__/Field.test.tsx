import { fireEvent, render, screen } from "@testing-library/react-native";

import { Field } from "../Field";
import { ThemeProvider } from "~/lib/theme-provider";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider scheme="light">{ui}</ThemeProvider>);

describe("Field (DS primitive)", () => {
  it("AC-6: pairs a visible label with the input via accessibilityLabel", () => {
    renderWithTheme(
      <Field label="Email" value="" onChangeText={() => {}} testID="email-field" />,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toBeOnTheScreen();
  });

  it("AC-6: announces error text and reflects it in accessibilityState.invalid", () => {
    renderWithTheme(
      <Field
        label="Email"
        value="bad"
        onChangeText={() => {}}
        error="Enter a valid email address"
      />,
    );
    expect(screen.getByText("Enter a valid email address")).toBeOnTheScreen();
    const input = screen.getByLabelText("Email");
    expect(input.props.accessibilityState).toMatchObject({ invalid: true });
  });

  it("AC-2: propagates text changes to onChangeText", () => {
    const onChangeText = jest.fn();
    renderWithTheme(<Field label="Email" value="" onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByLabelText("Email"), "buyer@slabd.io");
    expect(onChangeText).toHaveBeenCalledWith("buyer@slabd.io");
  });

  it("AC-6: forwards keyboardType + autoCapitalize for typed inputs", () => {
    renderWithTheme(
      <Field
        label="Phone"
        value=""
        onChangeText={() => {}}
        keyboardType="phone-pad"
        autoCapitalize="none"
      />,
    );
    const input = screen.getByLabelText("Phone");
    expect(input.props.keyboardType).toBe("phone-pad");
    expect(input.props.autoCapitalize).toBe("none");
  });
});
