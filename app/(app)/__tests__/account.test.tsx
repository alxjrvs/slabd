import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import AccountScreen from "../account";

jest.mock("react-native/Libraries/Components/Switch/Switch", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable } = require("react-native");
  function MockSwitch(props: {
    value: boolean;
    onValueChange?: (next: boolean) => void;
    accessibilityLabel?: string;
  }) {
    return React.createElement(Pressable, {
      accessibilityRole: "switch",
      accessibilityLabel: props.accessibilityLabel,
      accessibilityState: { checked: props.value },
      onPress: () => props.onValueChange?.(!props.value),
    });
  }
  return { __esModule: true, default: MockSwitch };
});

const mockUpdate = jest.fn();
const mockReload = jest.fn();
const mockSignOut = jest.fn();
const mockUseUser = jest.fn();

const buildUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "user_1",
  firstName: "Buyer",
  lastName: "One",
  primaryEmailAddress: { emailAddress: "buyer@slabd.io" },
  primaryPhoneNumber: null,
  unsafeMetadata: { notifications: { drops: true, messages: false } },
  update: mockUpdate,
  reload: mockReload,
  ...overrides,
});

jest.mock("@clerk/clerk-expo", () => ({
  useUser: () => mockUseUser(),
  useClerk: () => ({ signOut: mockSignOut }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockResolvedValue(undefined);
  mockUseUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: buildUser() });
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("AccountScreen (AC-5 profile editing)", () => {
  it("AC-6: renders accessible fields for display name and email", () => {
    render(<AccountScreen />);
    expect(screen.getByLabelText("First name")).toBeOnTheScreen();
    expect(screen.getByLabelText("Last name")).toBeOnTheScreen();
    expect(screen.getByText("buyer@slabd.io")).toBeOnTheScreen();
  });

  it("AC-5: pre-fills the display-name fields from Clerk's user object", () => {
    render(<AccountScreen />);
    expect(screen.getByLabelText("First name").props.value).toBe("Buyer");
    expect(screen.getByLabelText("Last name").props.value).toBe("One");
  });

  it("AC-5: persists edited names + notification prefs via user.update()", async () => {
    render(<AccountScreen />);
    fireEvent.changeText(screen.getByLabelText("First name"), "Bobby");
    fireEvent.press(screen.getByRole("switch", { name: "Direct messages" }));
    fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        firstName: "Bobby",
        lastName: "One",
        unsafeMetadata: { notifications: { drops: true, messages: true } },
      });
    });
  });

  it("AC-5: shows a saved-confirmation message after a successful update", async () => {
    render(<AccountScreen />);
    fireEvent.changeText(screen.getByLabelText("First name"), "Bobby");
    fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeOnTheScreen();
    });
  });

  it("AC-2: sign-out button invokes Clerk's signOut", async () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it("AC-5: preserves other unsafeMetadata keys when saving notification prefs", async () => {
    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: buildUser({
        unsafeMetadata: {
          notifications: { drops: true, messages: true },
          stripeCustomerId: "cus_existing",
          onboardingStep: "complete",
        },
      }),
    });
    render(<AccountScreen />);
    fireEvent.press(screen.getByRole("switch", { name: "Direct messages" }));
    fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        firstName: "Buyer",
        lastName: "One",
        unsafeMetadata: {
          notifications: { drops: true, messages: false },
          stripeCustomerId: "cus_existing",
          onboardingStep: "complete",
        },
      });
    });
  });

  it("surfaces a generic error and does NOT leak the Clerk error message when user.update rejects", async () => {
    mockUpdate.mockRejectedValueOnce(
      Object.assign(new Error("form_first_name_max_length_exceeded"), {
        errors: [{ code: "form_first_name_max_length_exceeded" }],
      }),
    );
    render(<AccountScreen />);
    fireEvent.changeText(screen.getByLabelText("First name"), "Bobby");
    fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => {
      expect(screen.getByText("Couldn't save changes. Please try again.")).toBeOnTheScreen();
    });
    expect(screen.queryByText(/form_first_name_max_length_exceeded/)).toBeNull();
    expect(screen.queryByText(/saved/i)).toBeNull();
  });
});
