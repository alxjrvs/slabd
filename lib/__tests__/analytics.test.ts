import { capture, identify, init, shutdownAnalyticsForTests } from "../analytics";

type FakeClient = {
  capture: jest.Mock;
  identify: jest.Mock;
};

const makeFakeClient = (): FakeClient => ({
  capture: jest.fn(),
  identify: jest.fn(),
});

describe("analytics (AC-5)", () => {
  beforeEach(() => {
    shutdownAnalyticsForTests();
  });

  it("is a no-op without EXPO_PUBLIC_POSTHOG_KEY", async () => {
    const factory = jest.fn();
    const result = await init(undefined, factory as never);
    expect(result).toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });

  it("buffers capture() calls made before init() resolves and flushes on init", async () => {
    capture("opened_app");
    capture("viewed_swipe_deck", { source: "home" });

    const fake = makeFakeClient();
    await init({ apiKey: "phc_test" }, async () => fake as unknown as never);

    expect(fake.capture).toHaveBeenCalledTimes(2);
    expect(fake.capture).toHaveBeenNthCalledWith(1, "opened_app", undefined);
    expect(fake.capture).toHaveBeenNthCalledWith(2, "viewed_swipe_deck", { source: "home" });
  });

  it("forwards capture() calls directly once initialized", async () => {
    const fake = makeFakeClient();
    await init({ apiKey: "phc_test" }, async () => fake as unknown as never);
    fake.capture.mockClear();

    capture("listed_comic", { listing_id: "abc123" });
    expect(fake.capture).toHaveBeenCalledWith("listed_comic", { listing_id: "abc123" });
  });

  it("only calls the factory once even when init() is invoked twice", async () => {
    const fake = makeFakeClient();
    const factory = jest.fn(async () => fake as unknown as never);
    await init({ apiKey: "phc_test" }, factory);
    await init({ apiKey: "phc_test" }, factory);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("forwards identify() once the client is ready and ignores it before init", async () => {
    identify("user_1", { plan: "free" });

    const fake = makeFakeClient();
    await init({ apiKey: "phc_test" }, async () => fake as unknown as never);
    expect(fake.identify).not.toHaveBeenCalled();

    identify("user_2", { plan: "pro" });
    expect(fake.identify).toHaveBeenCalledWith("user_2", { plan: "pro" });
  });

  it("drops the buffer + stays silent when the factory throws", async () => {
    capture("queued_event");
    const factory = jest.fn(async () => {
      throw new Error("PostHog ctor failed");
    });

    const result = await init({ apiKey: "phc_test" }, factory);
    expect(result).toBeNull();

    const fake = makeFakeClient();
    await init({ apiKey: "phc_test" }, async () => fake as unknown as never);
    expect(fake.capture).not.toHaveBeenCalled();
  });
});
