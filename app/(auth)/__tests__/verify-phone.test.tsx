import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import VerifyPhoneScreen from "../verify-phone";

const mockRouterReplace = jest.fn();
const mockAttempt = jest.fn();
const mockSetActive = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockRouterReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ phone: "+15555550101" }),
}));

jest.mock("@clerk/clerk-expo", () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      attemptPhoneNumberVerification: mockAttempt,
    },
    setActive: mockSetActive,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("VerifyPhoneScreen (AC-4 phone OTP)", () => {
  it("AC-6: renders an accessible code field and a 'Verify' submit", () => {
    render(<VerifyPhoneScreen />);
    expect(screen.getByLabelText("Verification code")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Verify" })).toBeOnTheScreen();
  });

  it("AC-4: surfaces an error when the code is not 6 digits", async () => {
    render(<VerifyPhoneScreen />);
    fireEvent.changeText(screen.getByLabelText("Verification code"), "12");
    fireEvent.press(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => {
      expect(screen.getByText(/6-digit/i)).toBeOnTheScreen();
    });
    expect(mockAttempt).not.toHaveBeenCalled();
  });

  it("AC-3: activates the session and redirects to (app) on success", async () => {
    mockAttempt.mockResolvedValue({ status: "complete", createdSessionId: "sess_phone_1" });
    render(<VerifyPhoneScreen />);
    fireEvent.changeText(screen.getByLabelText("Verification code"), "654321");
    fireEvent.press(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => {
      expect(mockAttempt).toHaveBeenCalledWith({ code: "654321" });
      expect(mockSetActive).toHaveBeenCalledWith({ session: "sess_phone_1" });
      expect(mockRouterReplace).toHaveBeenCalledWith("/(app)");
    });
  });
});
