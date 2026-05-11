const { device, element, by, waitFor } = require("detox");

describe("S-1.7 parity smoke: app boots on native", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it("renders the root view within 30s of cold start", async () => {
    await waitFor(element(by.type("RCTView")).atIndex(0))
      .toBeVisible()
      .withTimeout(30000);
  });
});
