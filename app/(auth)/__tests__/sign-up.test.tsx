import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import SignUpScreen from "../sign-up";

const mockRouterPush = jest.fn();
const mockCreate = jest.fn();
const mockPrepareEmail = jest.fn();
const mockSetActive = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@clerk/clerk-expo", () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      create: mockCreate,
      prepareEmailAddressVerification: mockPrepareEmail,
    },
    setActive: mockSetActive,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({});
  mockPrepareEmail.mockResolvedValue({});
});

describe("SignUpScreen (AC-2 email sign-up)", () => {
  it("AC-6: renders an accessible email field and a 'Send code' submit button", () => {
    render(<SignUpScreen />);
    expect(screen.getByLabelText("Email")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Send code" })).toBeOnTheScreen();
  });

  it("AC-4: rejects invalid email addresses and shows an error", async () => {
    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByLabelText("Email"), "not-an-email");
    fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeOnTheScreen();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("AC-2: starts the Clerk sign-up flow with the email and prepares OTP", async () => {
    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByLabelText("Email"), "buyer@slabd.io");
    fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ emailAddress: "buyer@slabd.io" });
      expect(mockPrepareEmail).toHaveBeenCalledWith({ strategy: "email_code" });
    });
  });

  it("AC-2: routes to the verify-email screen after a successful prepare call", async () => {
    render(<SignUpScreen />);
    fireEvent.changeText(screen.getByLabelText("Email"), "buyer@slabd.io");
    fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: "/(auth)/verify-email",
        params: { email: "buyer@slabd.io" },
      });
    });
  });
});
