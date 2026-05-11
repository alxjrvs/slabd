const { device } = require("detox");

beforeAll(async () => {
  await device.launchApp({ newInstance: true });
});

afterEach(async () => {
  await device.reloadReactNative();
});
