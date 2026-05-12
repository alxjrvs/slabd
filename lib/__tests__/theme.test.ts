import { hex, lightTheme, type HexColor, type Palette } from "../theme";

describe("hex() — branded HexColor constructor (#36 AC-6)", () => {
  it.each([
    ["#000000"],
    ["#ffffff"],
    ["#1F3Aff"],
    ["#abcdef"],
  ])("accepts valid 6-digit hex %p and returns the same string", (value) => {
    expect(hex(value)).toBe(value);
  });

  it.each([
    ["1f3aff", "missing leading #"],
    ["#1f3af", "5 digits"],
    ["#1f3affa", "7 digits"],
    ["#xyzxyz", "non-hex chars"],
    ["", "empty"],
    ["#1f3a ff", "internal whitespace"],
  ])("rejects invalid input %p (%s)", (value) => {
    expect(() => hex(value)).toThrow(/HexColor/);
  });
});

describe("HexColor — type-level brand enforcement (#36 AC-6)", () => {
  it("rejects raw strings at the Palette field site", () => {
    const _typeGuard = () => {
      const partial: Pick<Palette, "primary"> = {
        // @ts-expect-error — raw string is not a HexColor; must use hex()
        primary: "#1f3aff",
      };
      return partial;
    };
    void _typeGuard;
    expect(true).toBe(true);
  });

  it("accepts hex()-branded values at the Palette field site", () => {
    const _typeGuard = () => {
      const partial: Pick<Palette, "primary"> = {
        primary: hex("#1f3aff"),
      };
      return partial;
    };
    void _typeGuard;
    expect(true).toBe(true);
  });

  it("propagates HexColor through theme palette reads", () => {
    const c: HexColor = lightTheme.colors.primary;
    // Round-tripping through hex() is a no-op for already-branded values.
    expect(hex(c)).toBe(c);
  });
});
