import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import SignInScreen from "../sign-in";
import VerifyEmailScreen from "../verify-email";

const mockCreate = jest.fn();
const mockPrepareEmail = jest.fn();
const mockAttemptEmail = jest.fn();
const mockSetActive = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

let mockVerifyEmailParam = "";

jest.mock("@clerk/clerk-expo", () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      create: mockCreate,
      prepareEmailAddressVerification: mockPrepareEmail,
      attemptEmailAddressVerification: mockAttemptEmail,
    },
    setActive: mockSetActive,
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ email: mockVerifyEmailParam }),
  Link: ({ children }: { children: unknown }) => children,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyEmailParam = "";
  mockCreate.mockResolvedValue(undefined);
  mockPrepareEmail.mockResolvedValue(undefined);
  mockAttemptEmail.mockResolvedValue({ status: "complete", createdSessionId: "sess_1" });
  mockSetActive.mockResolvedValue(undefined);
});

describe("AC-4 + AC-7 email sign-up integration", () => {
  it("AC-4/AC-7: drives email → OTP → authed-home end-to-end in well under 90s", async () => {
    const start = Date.now();

    const { unmount } = render(<SignInScreen />);

    fireEvent.changeText(screen.getByLabelText("Email"), "buyer@slabd.io");
    fireEvent.press(screen.getByRole("button", { name: "Send code" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ emailAddress: "buyer@slabd.io" });
      expect(mockPrepareEmail).toHaveBeenCalledWith({ strategy: "email_code" });
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/(auth)/verify-email",
        params: { email: "buyer@slabd.io" },
      });
    });

    unmount();
    mockVerifyEmailParam = "buyer@slabd.io";

    render(<VerifyEmailScreen />);
    fireEvent.changeText(screen.getByLabelText("Verification code"), "424242");
    fireEvent.press(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(mockAttemptEmail).toHaveBeenCalledWith({ code: "424242" });
      expect(mockSetActive).toHaveBeenCalledWith({ session: "sess_1" });
      expect(mockReplace).toHaveBeenCalledWith("/(app)");
    });

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(90_000);
  });
});
