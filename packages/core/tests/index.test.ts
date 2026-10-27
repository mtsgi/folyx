import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { createFolyx, createMockProvider } from "../src/index.ts";
import type { Rect } from "../src/index.ts";

afterEach(() => vi.unstubAllGlobals());

/** Mutable input geometry for normalization, validation, and input-isolation tests. */
const rect = (x = 0, y = 0, width = 440, height = 600): Rect => ({ x, y, width, height });

const viewport = { width: 900, height: 600 };

test("SSR: import, creation, snapshots and subscriptions need no browser globals", () => {
  vi.stubGlobal("window", undefined);
  const folyx = createFolyx();
  const state = folyx.getSnapshot();

  expect(state.availability).toEqual({ posture: "unavailable", segments: "unavailable" });
  expect(state.posture.value).toBe("unknown");
  expect(state.viewport.value).toBeNull();
  expect(state.segments.items).toEqual([]);
  expect(state.layout).toBe("unknown");

  const listener = vi.fn();
  const stop = folyx.subscribe(listener);

  expect(listener).toHaveBeenCalledExactlyOnceWith(state);

  stop();
  stop();
});

describe("Mock and normalization", () => {
  test("keeps posture independent of geometry and calculates gaps", () => {
    const mock = createMockProvider({
      posture: "continuous",
      viewport,
      segments: [rect(460), rect()],
    });
    const state = createFolyx({ provider: mock }).getSnapshot();

    expect(state.layout).toBe("horizontal");
    expect(state.posture.value).toBe("continuous");
    expect(state.segments.items[0]?.x).toBe(0);
    expect(state.gaps).toEqual([rect(440, 0, 20)]);
  });

  test.each([
    ["single", [rect(0, 0, 900)]],
    ["vertical", [rect(0, 0, 900, 290), rect(0, 310, 900, 290)]],
    ["horizontal", [rect(0, 0, 300), rect(300, 0, 300), rect(600, 0, 300)]],
    ["complex", [rect(), rect(300)]],
    ["complex", [rect(-10)]],
    ["complex", [rect(700)]],
    ["complex", [rect(0, 0, 400, 200), rect(500, 300, 400, 200)]],
  ] as const)("classifies %s", (layout, segments) => {
    const state = createFolyx({
      provider: createMockProvider({ viewport, segments }),
    }).getSnapshot();

    expect(state.layout).toBe(layout);

    if (layout === "complex") expect(state.gaps).toBeNull();
  });

  test("handles fractional coordinates and touching segments without invented gaps", () => {
    const state = createFolyx({
      provider: createMockProvider({
        viewport,
        segments: [rect(0, 0, 450.5), rect(450.5, 0, 449.5)],
      }),
    }).getSnapshot();

    expect(state.gaps).toEqual([]);
    expect(state.segments.items[0]?.width).toBe(450.5);
  });

  test.each(["unsupported", "unavailable"] as const)(
    "clears %s observations without changing fallback provenance",
    (status) => {
      const mock = createMockProvider({ posture: "folded", viewport, segments: [rect()] });
      const folyx = createFolyx({ provider: mock });
      mock.set({ availability: { posture: status, segments: status } });

      expect(mock.getSnapshot().posture).toBe("unknown");
      expect(mock.getSnapshot().segments).toBeNull();
      expect(folyx.getSnapshot().segments.source).toBe("fallback");
      expect(folyx.getSnapshot().availability.segments).toBe(status);
      expect(() => mock.set({ availability: { segments: "available" } })).toThrow();
      expect(() => mock.set({ availability: { posture: "available" } })).toThrow();

      mock.set({ posture: "continuous", segments: [rect(0, 0, 900)] });

      expect(folyx.getSnapshot().availability).toEqual({
        posture: "available",
        segments: "available",
      });
    },
  );

  test("rejects invalid patches atomically", () => {
    const mock = createMockProvider({ posture: "folded", viewport });
    const state = mock.getSnapshot();

    expect(() => mock.set({ posture: "continuous", segments: [rect(0, 0, Number.NaN)] })).toThrow();
    expect(() => mock.set({ viewport: { width: 0, height: 600 } })).toThrow();
    expect(mock.getSnapshot()).toBe(state);
  });

  test("copies inputs and freezes deeply; partial updates preserve other fields", () => {
    const input = { x: 0, y: 0, width: 900, height: 600 };
    const mock = createMockProvider({ viewport, segments: [input] });
    const folyx = createFolyx({ provider: mock });
    input.width = 5;
    mock.set({ posture: "folded" });
    const state = folyx.getSnapshot();

    expect(state.segments.items[0]?.width).toBe(900);
    expect(Object.isFrozen(state.segments.items[0])).toBe(true);
    expect(Object.isFrozen(state.availability)).toBe(true);
    expect(folyx.getSnapshot()).toBe(state);
  });

  test("notifies synchronously, includes availability changes, and releases only its subscriptions", () => {
    const mock = createMockProvider({ viewport });
    const folyx = createFolyx({ provider: mock });
    const first = vi.fn();
    const second = vi.fn();
    const stop = folyx.subscribe(first);
    const stopSecond = folyx.subscribe(second);
    mock.set({ availability: { segments: "unsupported" } });

    expect(first).toHaveBeenCalledTimes(2);

    stop();
    stop();
    mock.set({ posture: "folded" });

    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(3);

    mock.set({ posture: "folded" });

    expect(second).toHaveBeenCalledTimes(3);

    stopSecond();
  });
});

test("reentrant synchronous Mock changes never deliver an older snapshot afterward", () => {
  const mock = createMockProvider({ posture: "unknown" });
  const folyx = createFolyx({ provider: mock });
  const first = folyx.subscribe((state) => {
    if (state.posture.value === "folded") mock.set({ posture: "continuous" });
  });
  const seen: string[] = [];
  const second = folyx.subscribe((state) => seen.push(state.posture.value));
  mock.set({ posture: "folded" });

  expect(seen).toEqual(["unknown", "continuous"]);
  expect(folyx.getSnapshot().posture.value).toBe("continuous");

  first();
  second();
});

test("two registrations of the same Provider listener have independent cleanup", () => {
  const mock = createMockProvider();
  const listener = vi.fn();
  const first = mock.subscribe(listener);
  const second = mock.subscribe(listener);
  first();
  mock.set({ posture: "folded" });

  expect(listener).toHaveBeenCalledTimes(1);

  second();
});

test("a failing custom Provider read does not leak the newly acquired subscription", () => {
  const stop = vi.fn();
  const folyx = createFolyx({
    provider: {
      getSnapshot() {
        throw new Error("read failed");
      },
      subscribe() {
        return stop;
      },
    },
  });

  expect(() => folyx.subscribe(() => {})).toThrow("read failed");
  expect(stop).toHaveBeenCalledTimes(1);
});

test("Mock can model an available API with withheld coordinates, just like Browser Provider", () => {
  const mock = createMockProvider({
    viewport,
    segments: null,
    availability: { segments: "available" },
  });
  const folyx = createFolyx({ provider: mock });

  expect(mock.getSnapshot().availability.segments).toBe("available");
  expect(mock.getSnapshot().segments).toBeNull();
  expect(folyx.getSnapshot().segments.source).toBe("fallback");

  mock.set({ posture: "folded" });

  expect(folyx.getSnapshot().availability.segments).toBe("available");

  mock.set({ segments: [rect(0, 0, 900)] });

  expect(folyx.getSnapshot().segments.source).toBe("mock");

  mock.set({ segments: null });

  expect(folyx.getSnapshot().availability.segments).toBe("unavailable");
});
