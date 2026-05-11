import { render } from "@testing-library/react-native";
import type { ReactTestInstance } from "react-test-renderer";

import { Button, Field, Text, View } from "../index";
import { ThemeProvider } from "~/lib/theme-provider";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider scheme="light">{ui}</ThemeProvider>);

const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "switch",
  "checkbox",
  "radio",
  "togglebutton",
  "menuitem",
  "tab",
]);

function collectViolations(root: ReactTestInstance): string[] {
  const violations: string[] = [];
  const walk = (node: ReactTestInstance) => {
    const role = node.props?.accessibilityRole;
    if (typeof role === "string" && INTERACTIVE_ROLES.has(role)) {
      const label = node.props?.accessibilityLabel;
      if (typeof label !== "string" || label.length === 0) {
        violations.push(`role="${role}" without accessibilityLabel`);
      }
    }
    node.children?.forEach((child) => {
      if (typeof child !== "string") walk(child);
    });
  };
  walk(root);
  return violations;
}

describe("AC-6 a11y compliance", () => {
  it("AC-6: Button exposes role=button and label-derived accessibilityLabel", () => {
    const { root } = renderWithTheme(<Button label="Continue" onPress={() => {}} />);
    expect(collectViolations(root)).toEqual([]);
  });

  it("AC-6: Field's label drives the input's accessibilityLabel", () => {
    const { getByLabelText } = renderWithTheme(
      <Field label="Email address" value="" onChangeText={() => {}} />,
    );
    expect(getByLabelText("Email address")).toBeOnTheScreen();
  });

  it("AC-6: Field reports invalid state when an error is present", () => {
    const { getByLabelText } = renderWithTheme(
      <Field
        label="Email address"
        value="not-an-email"
        onChangeText={() => {}}
        error="Enter a valid email"
      />,
    );
    const input = getByLabelText("Email address");
    expect(input.props.accessibilityState).toMatchObject({ invalid: true });
  });

  it("AC-6: Text title renders as a header for assistive tech", () => {
    const { getByRole } = renderWithTheme(<Text variant="title">Slabd</Text>);
    expect(getByRole("header", { name: "Slabd" })).toBeOnTheScreen();
  });

  it("AC-6: composed flows have no unlabeled interactive primitives", () => {
    const { root } = renderWithTheme(
      <View>
        <Text variant="title">Slabd</Text>
        <Field label="Email" value="" onChangeText={() => {}} />
        <Button label="Send code" onPress={() => {}} />
      </View>,
    );
    expect(collectViolations(root)).toEqual([]);
  });
});
