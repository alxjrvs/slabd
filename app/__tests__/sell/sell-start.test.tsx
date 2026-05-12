/**
 * sell-start.test.tsx
 * AC-1: Continue button is disabled until draft creation succeeds.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import StartScreen from "../../(app)/sell/index";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("SellStartScreen (AC-1)", () => {
  it("AC-1: renders the sell start screen with a Continue button", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: "draft-123" }),
    }) as jest.Mock;

    render(<StartScreen />);
    expect(screen.getByText(/sell a comic/i)).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeOnTheScreen();
    });
  });

  it("AC-1: Continue button is disabled while draft creation is in flight", () => {
    let resolveCreate: (val: unknown) => void = () => {};
    global.fetch = jest.fn().mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    ) as jest.Mock;

    render(<StartScreen />);
    const button = screen.getByRole("button", { name: /continue/i });
    expect(button).toBeDisabled();
    resolveCreate({
      ok: true,
      status: 201,
      json: async () => ({ id: "draft-123" }),
    });
  });

  it("AC-1: Continue navigates to attributes with draft id after creation succeeds", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: "draft-456" }),
    }) as jest.Mock;

    render(<StartScreen />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).not.toBeDisabled();
    });
    fireEvent.press(screen.getByRole("button", { name: /continue/i }));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("draft-456"),
    );
  });

  it("AC-1: shows error when draft creation fails", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "internal_error" }),
    }) as jest.Mock;

    render(<StartScreen />);
    await waitFor(() => {
      expect(screen.getByText(/couldn't start/i)).toBeOnTheScreen();
    });
  });
});
