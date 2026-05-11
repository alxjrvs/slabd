import { render, screen } from "@testing-library/react-native";

import AppGroupLayout from "../(app)/_layout";
import AuthGroupLayout from "../(auth)/_layout";
import IndexRoute from "../index";
import { AuthProvider } from "~/lib/auth";

jest.mock("expo-router", () => {
  const React = jest.requireActual("react");
  return {
    Redirect: ({ href }: { href: string }) =>
      React.createElement("Text", { testID: "redirect" }, href),
    Stack: ({ children }: { children: React.ReactNode }) =>
      React.createElement("View", { testID: "stack" }, children),
    Slot: ({ children }: { children: React.ReactNode }) =>
      React.createElement("View", { testID: "slot" }, children),
  };
});

describe("routing: auth gating (AC-2, AC-7)", () => {
  it("AC-7: app/index redirects unauthenticated users to (auth)/sign-in", () => {
    render(
      <AuthProvider>
        <IndexRoute />
      </AuthProvider>,
    );
    expect(screen.getByTestId("redirect")).toHaveTextContent("/(auth)/sign-in");
  });

  it("AC-7: (app) group redirects unauthenticated users back to sign-in", () => {
    render(
      <AuthProvider>
        <AppGroupLayout />
      </AuthProvider>,
    );
    expect(screen.getByTestId("redirect")).toHaveTextContent("/(auth)/sign-in");
  });

  it("AC-7: (auth) group renders its stack when unauthenticated (no redirect)", () => {
    render(
      <AuthProvider>
        <AuthGroupLayout />
      </AuthProvider>,
    );
    expect(screen.queryByTestId("redirect")).toBeNull();
    expect(screen.getByTestId("stack")).toBeOnTheScreen();
  });
});
