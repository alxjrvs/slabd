import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import SignUpPhoneScreen from "../sign-up-phone";

const mockRouterPush = jest.fn();
const mockCreate = jest.fn();
const mockPreparePhone = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@clerk/clerk-expo", () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      create: mockCreate,
      preparePhoneNumberVerification: mockPreparePhone,
    },
    setActive: jest.fn(),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({});
  mockPreparePhone.mockResolvedValue({});
});

describe("SignUpPhoneScreen (AC-3 phone sign-up)", () => {
  it("AC-6: renders an accessible phone field and a 'Send code' submit", () => {
    render(<SignUpPhoneScreen />);
    expect(screen.getByLabelText("Phone number")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Send code" })).toBeOnTheScreen();
  });

  it("AC-4: rejects values that are not E.164 phone numbers", async () => {
    render(<SignUpPhoneScreen />);
    fireEvent.changeText(screen.getByLabelText("Phone number"), "555-not-a-phone");
    fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    await waitFor(() => {
      expect(screen.getByText(/country code/i)).toBeOnTheScreen();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("AC-3: starts the Clerk sign-up flow with the phone number and prepares OTP", async () => {
    render(<SignUpPhoneScreen />);
    fireEvent.changeText(screen.getByLabelText("Phone number"), "+15555550101");
    fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ phoneNumber: "+15555550101" });
      expect(mockPreparePhone).toHaveBeenCalledWith({ strategy: "phone_code" });
    });
  });

  it("AC-3: routes to the verify-phone screen with the phone as a param", async () => {
    render(<SignUpPhoneScreen />);
    fireEvent.changeText(screen.getByLabelText("Phone number"), "+15555550101");
    fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: "/(auth)/verify-phone",
        params: { phone: "+15555550101" },
      });
    });
  });
});
