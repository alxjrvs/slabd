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
