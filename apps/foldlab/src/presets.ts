import type { MockInput, Rect } from "@folyx/core";

const r = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

/** Synthetic scenarios, including unavailable APIs and intentionally anomalous geometry. */
export const presets: { id: string; label: string; state: MockInput }[] = [
  {
    id: "book",
    label: "Book · two columns",
    state: {
      posture: "folded",
      viewport: { width: 900, height: 600 },
      segments: [r(0, 0, 440, 600), r(460, 0, 440, 600)],
    },
  },
  {
    id: "single",
    label: "Single viewport",
    state: {
      posture: "continuous",
      viewport: { width: 900, height: 600 },
      segments: [r(0, 0, 900, 600)],
    },
  },
  {
    id: "laptop",
    label: "Laptop · two rows",
    state: {
      posture: "folded",
      viewport: { width: 900, height: 600 },
      segments: [r(0, 0, 900, 290), r(0, 310, 900, 290)],
    },
  },
  {
    id: "triple",
    label: "Three columns",
    state: {
      posture: "continuous",
      viewport: { width: 900, height: 600 },
      segments: [r(0, 0, 290, 600), r(305, 0, 290, 600), r(610, 0, 290, 600)],
    },
  },
  {
    id: "complex",
    label: "Complex · four regions",
    state: {
      posture: "folded",
      viewport: { width: 900, height: 600 },
      segments: [
        r(0, 0, 440, 290),
        r(460, 0, 440, 290),
        r(0, 310, 440, 290),
        r(460, 310, 440, 290),
      ],
    },
  },
  {
    id: "unmapped",
    label: "Available API · unmapped geometry",
    state: {
      posture: "folded",
      viewport: { width: 900, height: 600 },
      segments: null,
      availability: { segments: "available" },
    },
  },
  {
    id: "unsupported",
    label: "Unsupported APIs",
    state: {
      viewport: { width: 900, height: 600 },
      availability: { posture: "unsupported", segments: "unsupported" },
    },
  },
  {
    id: "unknown",
    label: "Unknown / SSR",
    state: { viewport: null, availability: { posture: "unavailable", segments: "unavailable" } },
  },
  {
    id: "overlap",
    label: "Anomaly · overlapping",
    state: {
      posture: "folded",
      viewport: { width: 900, height: 600 },
      segments: [r(0, 0, 600, 600), r(400, 0, 500, 600)],
    },
  },
  {
    id: "outside",
    label: "Anomaly · outside viewport",
    state: {
      posture: "folded",
      viewport: { width: 900, height: 600 },
      segments: [r(-100, 0, 440, 600), r(600, 0, 440, 600)],
    },
  },
];
