/**
 * sell-review.test.tsx
 * AC-2: publish-success path navigates home
 * AC-3: publish-422 path shows error banner
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import ReviewScreen from "../../(app)/sell/review";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "draft-123" }),
}));

const draftListing = {
  id: "draft-123",
  status: "draft",
  series: "Amazing Spider-Man",
  issue: "300",
  gradeCompany: "CGC",
  gradeNumeric: "9.8",
  priceCents: 15000,
  conditionNotes: "First Venom",
  images: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("SellReviewScreen (AC-2, AC-3)", () => {
  it("AC-2: renders draft summary loaded from GET /api/listings/draft/:id", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => draftListing,
    }) as jest.Mock;

    render(<ReviewScreen />);
    await waitFor(() => {
      expect(screen.getByText("Amazing Spider-Man")).toBeOnTheScreen();
    });
    expect(screen.getByText("300")).toBeOnTheScreen();
    expect(screen.getByText("CGC 9.8")).toBeOnTheScreen();
    // price display: $150.00
    expect(screen.getByText(/\$150/)).toBeOnTheScreen();
  });

  it("AC-2: publish-success path navigates to home screen", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => draftListing,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "draft-123", status: "published" }),
      }) as jest.Mock;

    render(<ReviewScreen />);
    await waitFor(() => {
      expect(screen.getByText("Amazing Spider-Man")).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: /publish/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/listings/draft-123/publish"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("AC-3: publish-422 path shows inline error from response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => draftListing,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          error: "validation_failed",
          fields: ["series", "priceCents"],
        }),
      }) as jest.Mock;

    render(<ReviewScreen />);
    await waitFor(() => {
      expect(screen.getByText("Amazing Spider-Man")).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: /publish/i }));

    await waitFor(() => {
      expect(screen.getByText(/cannot publish/i)).toBeOnTheScreen();
    });
    // Should NOT have navigated away
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
