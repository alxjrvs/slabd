import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import SignInPhoneScreen from "../sign-in-phone";
import VerifyPhoneScreen from "../verify-phone";

const mockCreate = jest.fn();
const mockPreparePhone = jest.fn();
const mockAttemptPhone = jest.fn();
const mockSetActive = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

let mockVerifyPhoneParam = "";

jest.mock("@clerk/clerk-expo", () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      create: mockCreate,
      preparePhoneNumberVerification: mockPreparePhone,
      attemptPhoneNumberVerification: mockAttemptPhone,
    },
    setActive: mockSetActive,
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ phone: mockVerifyPhoneParam }),
  Link: ({ children }: { children: unknown }) => children,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyPhoneParam = "";
  mockCreate.mockResolvedValue(undefined);
  mockPreparePhone.mockResolvedValue(undefined);
  mockAttemptPhone.mockResolvedValue({ status: "complete", createdSessionId: "sess_phone_1" });
  mockSetActive.mockResolvedValue(undefined);
});

describe("AC-4 phone sign-up integration", () => {
  it("AC-4: drives phone → OTP → authed-home end-to-end in well under 90s", async () => {
    const start = Date.now();

    const { unmount } = render(<SignInPhoneScreen />);

    fireEvent.changeText(screen.getByLabelText("Phone number"), "+15555550101");
    fireEvent.press(screen.getByRole("button", { name: "Send code" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ phoneNumber: "+15555550101" });
      expect(mockPreparePhone).toHaveBeenCalledWith({ strategy: "phone_code" });
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/(auth)/verify-phone",
        params: { phone: "+15555550101" },
      });
    });

    unmount();
    mockVerifyPhoneParam = "+15555550101";

    render(<VerifyPhoneScreen />);
    fireEvent.changeText(screen.getByLabelText("Verification code"), "424242");
    fireEvent.press(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(mockAttemptPhone).toHaveBeenCalledWith({ code: "424242" });
      expect(mockSetActive).toHaveBeenCalledWith({ session: "sess_phone_1" });
      expect(mockReplace).toHaveBeenCalledWith("/(app)");
    });

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(90_000);
  });
});
