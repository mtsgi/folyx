import { afterEach, expect, test, vi } from "vite-plus/test";
import { createBrowserProvider, createFolyx } from "../src/index.ts";
import { toLayoutSegments } from "../src/coordinates.ts";

/** Minimal browser harness with manually controlled RAF and optional API readings. */
class Browser extends EventTarget {
  innerWidth = 900;
  innerHeight = 600;
  document = new EventTarget();
  posture = Object.assign(new EventTarget(), { type: "folded" });
  navigator: { devicePosture?: EventTarget & { type: string } } = { devicePosture: this.posture };
  viewport = {
    segments: [
      { x: 0, y: 0, width: 440, height: 600 },
      { x: 460, y: 0, width: 440, height: 600 },
    ],
  };
  visualViewport = Object.assign(new EventTarget(), {
    width: 900,
    height: 600,
    scale: 1,
    offsetLeft: 0,
    offsetTop: 0,
  });
  screen = { orientation: new EventTarget() };

  frames = new Map<number, FrameRequestCallback>();
  /** Retain cancelled callbacks so a test can replay a stale monitoring period. */
  history: FrameRequestCallback[] = [];
  id = 0;

  requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
    this.frames.set(++this.id, cb);
    this.history.push(cb);
    return this.id;
  });

  cancelAnimationFrame = vi.fn((id: number) => this.frames.delete(id));

  /** Run the queued batch; frames scheduled during dispatch wait for the next flush. */
  flush() {
    const frames = [...this.frames.values()];
    this.frames.clear();
    frames.forEach((cb) => cb(0));
  }

  /** Update layout, visual, and segment widths together before emitting resize. */
  resize(width: number) {
    this.innerWidth = width;
    this.visualViewport.width = width;
    this.viewport.segments = [{ x: 0, y: 0, width, height: 600 }];
    this.dispatchEvent(new Event("resize"));
  }
}

afterEach(() => vi.unstubAllGlobals());

/** Install an isolated browser global that afterEach restores. */
function setup() {
  const browser = new Browser();
  vi.stubGlobal("window", browser);

  return browser;
}

test("synchronous reads before RAF do not consume existing subscribers' notifications", () => {
  const b = setup();
  const folyx = createFolyx();
  const listener = vi.fn();
  const stop = folyx.subscribe(listener);
  b.resize(800);

  expect(folyx.getSnapshot().viewport.value?.width).toBe(800);
  expect(listener).toHaveBeenCalledTimes(1);

  const later = vi.fn();
  const stopLater = folyx.subscribe(later);
  b.flush();

  expect(listener).toHaveBeenCalledTimes(2);
  expect(later).toHaveBeenCalledTimes(1);

  b.flush();

  expect(listener).toHaveBeenCalledTimes(2);

  stop();
  stopLater();
});

test("coalesces events to the latest state and suppresses unchanged observations", () => {
  const b = setup();
  const folyx = createFolyx();
  const listener = vi.fn();
  const stop = folyx.subscribe(listener);
  b.resize(800);
  folyx.getSnapshot();
  b.resize(700);

  expect(b.requestAnimationFrame).toHaveBeenCalledTimes(1);

  b.flush();

  expect(listener).toHaveBeenCalledTimes(2);
  expect(listener.mock.lastCall?.[0].viewport.value.width).toBe(700);

  b.resize(700);
  b.flush();

  expect(listener).toHaveBeenCalledTimes(2);

  stop();
});

test("cancels pending RAF, reads idle changes on resubscription, and ignores a stale frame", () => {
  const b = setup();
  const folyx = createFolyx();
  const old = vi.fn();
  const stop = folyx.subscribe(old);
  b.resize(800);
  const stale = b.history[0]!;
  stop();

  expect(b.cancelAnimationFrame).toHaveBeenCalledTimes(1);

  b.resize(700);

  expect(b.frames.size).toBe(0);

  const next = vi.fn();
  const end = folyx.subscribe(next);

  expect(next.mock.lastCall?.[0].viewport.value.width).toBe(700);

  stale(0);

  expect(next).toHaveBeenCalledTimes(1);

  b.resize(600);
  b.flush();

  expect(next).toHaveBeenCalledTimes(2);
  expect(old).toHaveBeenCalledTimes(1);

  end();
});

test("multiple Core instances can share a provider without stopping each other", () => {
  const b = setup();
  const provider = createBrowserProvider();
  const a = vi.fn();
  const c = vi.fn();
  const stop = createFolyx({ provider }).subscribe(a);
  const end = createFolyx({ provider }).subscribe(c);
  stop();
  b.resize(800);
  b.flush();

  expect(a).toHaveBeenCalledTimes(1);
  expect(c).toHaveBeenCalledTimes(2);

  end();
});

test.each(["resize", "scroll"])(
  "observes visual viewport %s and never labels unmapped rectangles as layout coordinates",
  (event) => {
    const b = setup();
    const folyx = createFolyx();
    const listener = vi.fn();
    const stop = folyx.subscribe(listener);
    b.visualViewport.scale = 2;
    b.visualViewport.width = 450;
    b.visualViewport.offsetLeft = 100;
    b.visualViewport.dispatchEvent(new Event(event));
    b.flush();
    const state = folyx.getSnapshot();

    expect(state.availability.segments).toBe("available");
    expect(state.segments.source).toBe("fallback");
    expect(state.segments.items).toEqual([{ x: 0, y: 0, width: 900, height: 600 }]);
    expect(state.gaps).toEqual([]);

    stop();
  },
);

test("keyboard-only visual shrink falls back; return to coincident frames restores observed segments", () => {
  const b = setup();
  const folyx = createFolyx();
  b.visualViewport.height = 300;

  expect(folyx.getSnapshot().segments.source).toBe("fallback");

  b.visualViewport.height = 600;

  expect(folyx.getSnapshot().segments.source).toBe("browser");
});

test("API absence, throwing accessors, null and unknown posture values remain distinct", () => {
  const b = setup();
  const folyx = createFolyx();
  delete b.navigator.devicePosture;

  expect(folyx.getSnapshot().availability.posture).toBe("unsupported");

  b.navigator.devicePosture = b.posture;
  b.posture.type = "future-posture";

  expect(folyx.getSnapshot().availability.posture).toBe("available");
  expect(folyx.getSnapshot().posture.value).toBe("unknown");

  Object.defineProperty(b, "viewport", {
    get() {
      throw new Error("inactive");
    },
    configurable: true,
  });

  expect(folyx.getSnapshot().availability.segments).toBe("unavailable");

  Object.defineProperty(b, "viewport", { value: { segments: null }, configurable: true });

  expect(folyx.getSnapshot().availability.segments).toBe("unavailable");

  Reflect.deleteProperty(b, "viewport");

  expect(folyx.getSnapshot().availability.segments).toBe("unsupported");
});

test("identity conversion needs frame evidence, not just rectangles inside bounds", () => {
  const b = new Browser();

  expect(
    toLayoutSegments(b.viewport.segments, { width: 900, height: 600 }, b.visualViewport),
  ).toEqual(b.viewport.segments);
  expect(toLayoutSegments(b.viewport.segments, { width: 900, height: 600 }, null)).toBeNull();

  b.visualViewport.offsetTop = 10;

  expect(
    toLayoutSegments(b.viewport.segments, { width: 900, height: 600 }, b.visualViewport),
  ).toBeNull();
});

test("rotation, posture and page restoration are observed and detached", () => {
  const b = setup();
  const add = vi.spyOn(b.posture, "addEventListener");
  const remove = vi.spyOn(b.posture, "removeEventListener");
  const folyx = createFolyx();
  const listener = vi.fn();
  const stop = folyx.subscribe(listener);
  b.posture.type = "continuous";
  b.screen.orientation.dispatchEvent(new Event("change"));
  b.flush();

  expect(listener.mock.lastCall?.[0].posture.value).toBe("continuous");

  b.posture.type = "folded";
  b.dispatchEvent(new Event("pageshow"));
  b.flush();

  expect(listener).toHaveBeenCalledTimes(3);

  stop();

  expect(add).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledTimes(1);
});

test("invalid visual metrics cannot establish coordinate identity", () => {
  const b = setup();
  b.visualViewport.width = Number.NaN;
  const state = createFolyx().getSnapshot();

  expect(state.availability.segments).toBe("available");
  expect(state.segments.source).toBe("fallback");
});

test("out-of-frame native geometry is withheld without guessing a DPR correction", () => {
  const b = setup();
  b.viewport.segments = [
    { x: 0, y: 0, width: 880, height: 1200 },
    { x: 920, y: 0, width: 880, height: 1200 },
  ];
  const state = createFolyx().getSnapshot();

  expect(state.availability.segments).toBe("available");
  expect(state.segments.source).toBe("fallback");
  expect(state.segments.items).toEqual([{ x: 0, y: 0, width: 900, height: 600 }]);
  expect(b.viewport.segments[0]?.width).toBe(880);
});
