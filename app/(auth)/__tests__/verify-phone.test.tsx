import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import VerifyPhoneScreen from "../verify-phone";

const mockRouterReplace = jest.fn();
const mockAttempt = jest.fn();
const mockPreparePhone = jest.fn();
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
      preparePhoneNumberVerification: mockPreparePhone,
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

describe("VerifyPhoneScreen — 90-second resend gate (#34 AC-4)", () => {
  // Load-bearing: drives the cooldown clock with jest fake timers so the
  // assertions actually exercise the gating logic. A wall-clock check would
  // pass even if the gate were silently removed.
  beforeEach(() => {
    jest.useFakeTimers();
    mockPreparePhone.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("disables resend at t=0 and t=89s, enables at t=90s, and only prepares once before the gate opens", async () => {
    render(<VerifyPhoneScreen />);

    // t=0: resend must be disabled (cooldown just started). Pressing it
    // must NOT call preparePhoneNumberVerification.
    const initial = screen.getByRole("button", { name: /Resend in 90s/ });
    expect(initial.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(initial);
    expect(mockPreparePhone).not.toHaveBeenCalled();

    // t=89s: still disabled, still no resend call.
    act(() => {
      jest.advanceTimersByTime(89_000);
    });
    const at89 = screen.getByRole("button", { name: /Resend in 1s/ });
    expect(at89.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(at89);
    expect(mockPreparePhone).not.toHaveBeenCalled();

    // t=90s: gate opens. Button label flips to "Resend code" and disabled
    // flag clears.
    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    const at90 = screen.getByRole("button", { name: "Resend code" });
    expect(at90.props.accessibilityState).toMatchObject({ disabled: false });

    // Pressing now triggers exactly one preparePhoneNumberVerification call.
    await act(async () => {
      fireEvent.press(at90);
    });
    await waitFor(() => {
      expect(mockPreparePhone).toHaveBeenCalledTimes(1);
      expect(mockPreparePhone).toHaveBeenCalledWith({ strategy: "phone_code" });
    });
  });
});
