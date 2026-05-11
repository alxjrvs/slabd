import { expect, test } from "@playwright/test";

const TEST_MODE_FIXTURE_EMAIL = "buyer+clerk_test@slabd.io";
const CLERK_TEST_OTP = "424242";
const HARD_LIMIT_MS = 90_000;

const hasClerkTestKey = (() => {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof key === "string" && key.startsWith("pk_test_");
})();

test.describe("AC-4 buyer email sign-up reaches authed home within 90s", () => {
  test.skip(
    !hasClerkTestKey,
    "Requires EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_… in env (Clerk test mode)",
  );

  test("completes email OTP sign-up under 90 seconds wall-clock", async ({ page }) => {
    const started = Date.now();

    await page.goto("/");

    const emailField = page.getByLabel("Email");
    await emailField.fill(TEST_MODE_FIXTURE_EMAIL);
    await page.getByRole("button", { name: "Send code" }).click();

    const codeField = page.getByLabel("Verification code");
    await codeField.waitFor({ state: "visible" });
    await codeField.fill(CLERK_TEST_OTP);
    await page.getByRole("button", { name: "Verify" }).click();

    await expect(page.getByRole("header", { name: "Slabd" })).toBeVisible({
      timeout: HARD_LIMIT_MS - (Date.now() - started),
    });

    const elapsed = Date.now() - started;
    expect(elapsed, `email sign-up took ${elapsed}ms (limit ${HARD_LIMIT_MS}ms)`).toBeLessThan(
      HARD_LIMIT_MS,
    );
  });
});
