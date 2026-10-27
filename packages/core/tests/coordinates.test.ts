import { expect, test } from "vite-plus/test";
import { toLayoutSegments } from "../src/coordinates.ts";
import { createFolyx, createMockProvider } from "../src/index.ts";
import type { FolyxProvider } from "../src/index.ts";

const viewport = { width: 1024, height: 512 };
const visual = { ...viewport, scale: 1, offsetLeft: 0, offsetTop: 0 };
const regions = [
  { x: 0, y: 0, width: 511.75, height: 512 },
  { x: 512.25, y: 0, width: 511.75, height: 512 },
];

test.each([1, 1 + 0.5 / 1024, 1 - 0.5 / 1024, 1 + 1 / 1024, 1 - 1 / 1024])(
  "accepts scale %s within a one CSS pixel drift without rescaling regions",
  (scale) => {
    expect(toLayoutSegments(regions, viewport, { ...visual, scale })).toEqual(regions);
  },
);

test.each([1 + 1.25 / 1024, 1 - 1.25 / 1024, 2, 0, -1, Number.NaN, Infinity, -Infinity])(
  "withholds regions for invalid or excessive scale %s",
  (scale) => {
    expect(toLayoutSegments(regions, viewport, { ...visual, scale })).toBeNull();
  },
);

test("uses the longer viewport axis to bound scale drift in portrait", () => {
  const portrait = { width: 512, height: 1024 };
  const raw = [{ x: 0, y: 0, ...portrait }];

  expect(toLayoutSegments(raw, portrait, { ...visual, ...portrait, scale: 1 + 1 / 1024 })).toEqual(
    raw,
  );
  expect(
    toLayoutSegments(raw, portrait, { ...visual, ...portrait, scale: 1 + 1.25 / 1024 }),
  ).toBeNull();
});

test.each(["width", "height"] as const)("checks visual %s independently of scale", (axis) => {
  for (const delta of [-1, -0.5, 0.5, 1])
    expect(
      toLayoutSegments(regions, viewport, { ...visual, [axis]: viewport[axis] + delta }),
    ).toEqual(regions);

  for (const delta of [-1.25, 1.25, Number.NaN, Infinity])
    expect(
      toLayoutSegments(regions, viewport, { ...visual, [axis]: viewport[axis] + delta }),
    ).toBeNull();
});

test.each(["left", "top", "right", "bottom"])(
  "clamps rounding overflow at the %s edge and preserves internal boundaries",
  (edge) => {
    for (const overflow of [0.5, 1, 1.25]) {
      const raw = regions.map((r) => ({ ...r }));

      if (edge === "left") {
        raw[0]!.x -= overflow;
        raw[0]!.width += overflow;
      } else if (edge === "right") raw[1]!.width += overflow;
      else
        for (const r of raw) {
          if (edge === "top") r.y -= overflow;
          r.height += overflow;
        }

      const original = structuredClone(raw);
      const result = toLayoutSegments(raw, viewport, visual);

      if (overflow <= 1) expect(result).toEqual(regions);
      else expect(result).toBeNull();

      expect(raw).toEqual(original);
    }
  },
);

test.each(["left", "top", "right", "bottom"])(
  "allows rounding underfill at the %s edge without expanding regions",
  (edge) => {
    for (const inset of [0.5, 1, 1.25]) {
      const raw = regions.map((r) => ({ ...r }));

      if (edge === "left") {
        raw[0]!.x += inset;
        raw[0]!.width -= inset;
      } else if (edge === "right") raw[1]!.width -= inset;
      else
        for (const r of raw) {
          if (edge === "top") r.y += inset;
          r.height -= inset;
        }

      const result = toLayoutSegments(raw, viewport, visual);

      if (inset <= 1) expect(result).toEqual(raw);
      else expect(result).toBeNull();
    }
  },
);

test("normalizes vertical regions without inventing a gap", () => {
  const folyx = createFolyx({
    provider: {
      getSnapshot: () => ({
        source: "browser",
        availability: { posture: "available", segments: "available" },
        posture: "folded",
        viewport,
        segments: toLayoutSegments(
          [
            { x: 0, y: 0, width: 1024, height: 256.25 },
            { x: 0, y: 256.25, width: 1024, height: 256.75 },
          ],
          viewport,
          visual,
        ),
      }),
      subscribe: () => () => {},
    },
  });
  const state = folyx.getSnapshot();

  expect(state.segments).toEqual({
    items: [
      { x: 0, y: 0, width: 1024, height: 256.25 },
      { x: 0, y: 256.25, width: 1024, height: 255.75 },
    ],
    source: "browser",
  });
  expect(state.layout).toBe("vertical");
  expect(state.gaps).toEqual([]);
});

test.each([
  { x: -0.5, y: 0, width: 0.25, height: 512 },
  { x: 1024, y: 0, width: 0.5, height: 512 },
  { x: 0, y: -0.5, width: 1024, height: 0.25 },
  { x: 0, y: 512, width: 1024, height: 0.5 },
])("withholds all regions if clamping collapses a region: %j", (outside) => {
  expect(toLayoutSegments([...regions, outside], viewport, visual)).toBeNull();
});

test("leaves already in-bounds fractional coordinates and gaps unchanged", () => {
  const raw = [
    { x: 0, y: 0, width: 0.1, height: 512 },
    { x: 0.1, y: 0, width: 0.2, height: 512 },
    { x: 0.5, y: 0, width: 1023.5, height: 512 },
  ];
  const result = toLayoutSegments(raw, viewport, visual);

  expect(result).toEqual(raw);
  expect(result).not.toBe(raw);
  expect(result?.[0]).not.toBe(raw[0]);
  expect(Object.isFrozen(result)).toBe(true);
  expect(result?.every(Object.isFrozen)).toBe(true);
});

test("keeps rounding overflow complex for Mock and custom Providers", () => {
  const segments = [
    { x: 0, y: 0, width: 512, height: 512 },
    { x: 512, y: 0, width: 513, height: 512 },
  ];
  const mock = createMockProvider({ viewport, segments });
  const custom: FolyxProvider = {
    getSnapshot: () => ({ ...mock.getSnapshot(), source: "provider" }),
    subscribe: (listener) => mock.subscribe(listener),
  };

  for (const provider of [mock, custom]) {
    const state = createFolyx({ provider }).getSnapshot();

    expect(state.segments.items).toEqual(segments);
    expect(state.layout).toBe("complex");
    expect(state.gaps).toBeNull();
  }
});
