import { render, screen } from "@testing-library/react-native";

import AppGroupLayout from "../(app)/_layout";
import AuthGroupLayout from "../(auth)/_layout";
import IndexRoute from "../index";

jest.mock("~/lib/auth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ isLoaded: true, isSignedIn: false, user: null, signOut: jest.fn() }),
}));

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
    render(<IndexRoute />);
    expect(screen.getByTestId("redirect")).toHaveTextContent("/(auth)/sign-in");
  });

  it("AC-7: (app) group redirects unauthenticated users back to sign-in", () => {
    render(<AppGroupLayout />);
    expect(screen.getByTestId("redirect")).toHaveTextContent("/(auth)/sign-in");
  });

  it("AC-7: (auth) group renders its stack when unauthenticated (no redirect)", () => {
    render(<AuthGroupLayout />);
    expect(screen.queryByTestId("redirect")).toBeNull();
    expect(screen.getByTestId("stack")).toBeOnTheScreen();
  });
});
