import { isValidEmail, isValidOtp, isValidPhone } from "../identifier";

describe("isValidEmail", () => {
  it.each([
    ["buyer@slabd.io", true],
    ["alice+filter@example.co.uk", true],
    ["a@b.c", true],
    ["  buyer@slabd.io  ", true],
    ["buyer", false],
    ["buyer@slabd", false],
    ["@slabd.io", false],
    ["buyer@.io", false],
    ["", false],
    ["buyer @slabd.io", false],
  ])("treats %p as valid=%p", (value, expected) => {
    expect(isValidEmail(value)).toBe(expected);
  });
});

describe("isValidPhone (E.164)", () => {
  it.each([
    ["+15555550101", true],
    ["+447911123456", true],
    ["+819012345678", true],
    ["  +15555550101  ", true],
    ["+0123456789", false],
    ["15555550101", false],
    ["+", false],
    ["+1234567890123456", false],
    ["", false],
  ])("treats %p as valid=%p", (value, expected) => {
    expect(isValidPhone(value)).toBe(expected);
  });

  // AC-3: boundary regression — E.164 mandates 8-15 total digits after the +.
  // Anything outside that range (7 below, 16 above) must be rejected, and the
  // leading digit must never be 0 (country codes have no leading zero).
  describe("AC-3: digit-count boundary regression (#33)", () => {
    it.each([
      ["+1234567", false, "7 digits — below the 8-digit floor"],
      ["+12345678", true, "8 digits — minimum E.164 length"],
      ["+123456789012345", true, "15 digits — maximum E.164 length"],
      ["+1234567890123456", false, "16 digits — exceeds the 15-digit ceiling"],
      ["+01234567", false, "leading 0 — country codes cannot start with 0"],
    ])("treats %p as valid=%p (%s)", (value, expected) => {
      expect(isValidPhone(value)).toBe(expected);
    });
  });
});

describe("isValidOtp", () => {
  it.each([
    ["424242", true],
    ["000000", true],
    ["12345", false],
    ["1234567", false],
    ["12345a", false],
    ["", false],
    [" 424242", false],
  ])("treats %p as valid=%p", (value, expected) => {
    expect(isValidOtp(value)).toBe(expected);
  });
});
