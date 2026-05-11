import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import VerifyEmailScreen from "../verify-email";

const mockRouterReplace = jest.fn();
const mockAttempt = jest.fn();
const mockSetActive = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockRouterReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ email: "buyer@slabd.io" }),
}));

jest.mock("@clerk/clerk-expo", () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      attemptEmailAddressVerification: mockAttempt,
    },
    setActive: mockSetActive,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("VerifyEmailScreen (AC-4 OTP confirmation)", () => {
  it("AC-6: renders an accessible code field and a 'Verify' submit", () => {
    render(<VerifyEmailScreen />);
    expect(screen.getByLabelText("Verification code")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Verify" })).toBeOnTheScreen();
  });

  it("AC-4: surfaces an error when the code does not match the 6-digit shape", async () => {
    render(<VerifyEmailScreen />);
    fireEvent.changeText(screen.getByLabelText("Verification code"), "12");
    fireEvent.press(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => {
      expect(screen.getByText(/6-digit/i)).toBeOnTheScreen();
    });
    expect(mockAttempt).not.toHaveBeenCalled();
  });

  it("AC-2: activates the session and redirects to the (app) home on successful verify", async () => {
    mockAttempt.mockResolvedValue({ status: "complete", createdSessionId: "sess_1" });
    render(<VerifyEmailScreen />);
    fireEvent.changeText(screen.getByLabelText("Verification code"), "123456");
    fireEvent.press(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => {
      expect(mockAttempt).toHaveBeenCalledWith({ code: "123456" });
      expect(mockSetActive).toHaveBeenCalledWith({ session: "sess_1" });
      expect(mockRouterReplace).toHaveBeenCalledWith("/(app)");
    });
  });

  it("AC-4: shows an error if Clerk returns a non-complete status", async () => {
    mockAttempt.mockResolvedValue({ status: "missing_requirements" });
    render(<VerifyEmailScreen />);
    fireEvent.changeText(screen.getByLabelText("Verification code"), "123456");
    fireEvent.press(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => {
      expect(screen.getByText(/couldn't verify/i)).toBeOnTheScreen();
    });
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
