import { render, screen } from "@testing-library/react-native";
import Home from "../(app)/index";

describe("Home screen (smoke test for AC-1)", () => {
  it("AC-1: scaffold-boots — renders the Slabd brand header", () => {
    render(<Home />);
    expect(screen.getByRole("header", { name: "Slabd" })).toBeOnTheScreen();
    expect(screen.getByText("An Infinite Longbox")).toBeOnTheScreen();
  });
});
