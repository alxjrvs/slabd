import { logger, serializeError, type LogRecord } from "../logger";

describe("logger (AC-1)", () => {
  const consoleSpies = {
    debug: jest.spyOn(console, "debug").mockImplementation(() => {}),
    info: jest.spyOn(console, "info").mockImplementation(() => {}),
    warn: jest.spyOn(console, "warn").mockImplementation(() => {}),
    error: jest.spyOn(console, "error").mockImplementation(() => {}),
  };

  beforeEach(() => {
    Object.values(consoleSpies).forEach((s) => s.mockClear());
    logger.__resetForTests();
  });

  afterAll(() => {
    Object.values(consoleSpies).forEach((s) => s.mockRestore());
  });

  it("routes each severity to the matching console transport", () => {
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(consoleSpies.debug).toHaveBeenCalledWith("d", expect.any(Object));
    expect(consoleSpies.info).toHaveBeenCalledWith("i", expect.any(Object));
    expect(consoleSpies.warn).toHaveBeenCalledWith("w", expect.any(Object));
    expect(consoleSpies.error).toHaveBeenCalledWith("e", expect.any(Object));
  });

  it("propagates the active correlation ID into emitted records", () => {
    const captured: LogRecord[] = [];
    logger.registerSink((r) => captured.push(r));

    logger.info("outside-scope");
    logger.withCorrelationId("corr-123", () => {
      logger.warn("inside-scope");
    });
    logger.info("after-scope");

    expect(captured.map((r) => [r.message, r.correlationId])).toEqual([
      ["outside-scope", undefined],
      ["inside-scope", "corr-123"],
      ["after-scope", undefined],
    ]);
  });

  it("nests correlation scopes and restores on exit", () => {
    const captured: LogRecord[] = [];
    logger.registerSink((r) => captured.push(r));

    logger.withCorrelationId("outer", () => {
      logger.info("a");
      logger.withCorrelationId("inner", () => {
        logger.info("b");
      });
      logger.info("c");
    });

    expect(captured.map((r) => r.correlationId)).toEqual(["outer", "inner", "outer"]);
  });

  it("fans out to all registered sinks and unregisters cleanly", () => {
    const sinkA = jest.fn();
    const sinkB = jest.fn();
    const unregisterA = logger.registerSink(sinkA);
    logger.registerSink(sinkB);

    logger.info("hello");
    expect(sinkA).toHaveBeenCalledTimes(1);
    expect(sinkB).toHaveBeenCalledTimes(1);

    unregisterA();
    logger.info("again");
    expect(sinkA).toHaveBeenCalledTimes(1);
    expect(sinkB).toHaveBeenCalledTimes(2);
  });

  it("isolates a throwing sink from other sinks and the caller", () => {
    const throwing = jest.fn(() => {
      throw new Error("sink boom");
    });
    const healthy = jest.fn();
    logger.registerSink(throwing);
    logger.registerSink(healthy);

    expect(() => logger.error("payload")).not.toThrow();
    expect(throwing).toHaveBeenCalledTimes(1);
    expect(healthy).toHaveBeenCalledTimes(1);
  });
});

describe("serializeError", () => {
  it("expands Error instances to {name, message, stack}", () => {
    const err = new Error("boom");
    const out = serializeError(err);
    expect(out).toMatchObject({ name: "Error", message: "boom" });
    expect(typeof out.stack).toBe("string");
  });

  it("spreads object errors", () => {
    expect(serializeError({ code: "X", detail: 42 })).toEqual({ code: "X", detail: 42 });
  });

  it("stringifies primitives", () => {
    expect(serializeError("bad")).toEqual({ value: "bad" });
    expect(serializeError(undefined)).toEqual({ value: "undefined" });
  });
});
