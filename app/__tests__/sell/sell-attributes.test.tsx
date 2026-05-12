/**
 * sell-attributes.test.tsx
 * AC-1: renders the form, submits, calls the PATCH endpoint with expected payload.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import AttributesScreen from "../../(app)/sell/attributes";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "draft-123" }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("SellAttributesScreen (AC-1)", () => {
  it("AC-1: renders all required attribute fields", () => {
    render(<AttributesScreen />);
    expect(screen.getByLabelText("Series")).toBeOnTheScreen();
    expect(screen.getByLabelText("Issue")).toBeOnTheScreen();
    expect(screen.getByLabelText("Grade Company")).toBeOnTheScreen();
    expect(screen.getByLabelText("Grade")).toBeOnTheScreen();
    expect(screen.getByLabelText("Price (USD)")).toBeOnTheScreen();
    expect(screen.getByLabelText("Condition Notes")).toBeOnTheScreen();
  });

  it("AC-1: submits form and calls PATCH endpoint with correct payload", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "draft-123" }),
    }) as jest.Mock;

    render(<AttributesScreen />);

    fireEvent.changeText(screen.getByLabelText("Series"), "Amazing Spider-Man");
    fireEvent.changeText(screen.getByLabelText("Issue"), "300");
    fireEvent.changeText(screen.getByLabelText("Grade Company"), "CGC");
    fireEvent.changeText(screen.getByLabelText("Grade"), "9.8");
    fireEvent.changeText(screen.getByLabelText("Price (USD)"), "150.00");
    fireEvent.changeText(screen.getByLabelText("Condition Notes"), "First Venom");

    fireEvent.press(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/listings/draft/draft-123"),
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("Amazing Spider-Man"),
        }),
      );
    });
  });

  it("AC-1: converts price dollars input to priceCents in the PATCH body", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "draft-123" }),
    }) as jest.Mock;

    render(<AttributesScreen />);
    fireEvent.changeText(screen.getByLabelText("Price (USD)"), "9.99");
    fireEvent.press(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => {
      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body as string,
      );
      expect(callBody.priceCents).toBe(999);
    });
  });

  it("AC-1: navigates to photos screen after successful PATCH", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "draft-123" }),
    }) as jest.Mock;

    render(<AttributesScreen />);
    fireEvent.press(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("draft-123"),
      );
    });
  });
});
