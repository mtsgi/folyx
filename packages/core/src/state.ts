import type { FolyxSnapshot, Layout, Posture, ProviderSnapshot, Rect, Viewport } from "./types.ts";

/** Accept only finite, positive dimensions before copying or deriving geometry. */
export const isViewport = (v: unknown): v is Viewport =>
  typeof v === "object" &&
  v !== null &&
  "width" in v &&
  "height" in v &&
  typeof v.width === "number" &&
  Number.isFinite(v.width) &&
  v.width > 0 &&
  typeof v.height === "number" &&
  Number.isFinite(v.height) &&
  v.height > 0;

/** Validate rectangle fields and reject coordinates whose far edges overflow. */
export const isRect = (v: unknown): v is Rect =>
  isViewport(v) &&
  "x" in v &&
  "y" in v &&
  typeof v.x === "number" &&
  typeof v.y === "number" &&
  Number.isFinite(v.x) &&
  Number.isFinite(v.y) &&
  Number.isFinite(v.x + v.width) &&
  Number.isFinite(v.y + v.height);

/** Copy dimensions into a frozen value that does not retain the input object. */
export const copyViewport = (v: Viewport): Viewport =>
  Object.freeze({ width: v.width, height: v.height });

/** Copy geometry into a frozen value without retaining DOM or caller objects. */
export const copyRect = (v: Rect): Rect =>
  Object.freeze({ x: v.x, y: v.y, width: v.width, height: v.height });

/** Preserve known posture values and leave future or unrecognized values unknown. */
export const postureValue = (value: unknown): Posture =>
  value === "folded" || value === "continuous" ? value : "unknown";

/**
 * Derive an arrangement and rectangular gaps from regions sorted by y, then x.
 * Overlapping, out-of-bounds, or unaligned regions remain complex; gaps do not
 * imply a physical hinge or occlusion.
 */
export function classify(
  items: readonly Rect[],
  viewport: Viewport | null,
): { layout: Layout; gaps: readonly Rect[] | null } {
  if (!items.length) return { layout: "unknown", gaps: null };

  const outside = items.some(
    (r) =>
      r.x < 0 ||
      r.y < 0 ||
      (viewport !== null && (r.x + r.width > viewport.width || r.y + r.height > viewport.height)),
  );

  const overlap = items.some((a, i) =>
    items
      .slice(i + 1)
      .some(
        (b) =>
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y,
      ),
  );

  if (outside || overlap) return { layout: "complex", gaps: null };
  if (items.length === 1) return { layout: "single", gaps: Object.freeze([]) };

  const first = items[0]!;
  const horizontal = items.every((r) => r.y === first.y && r.height === first.height);
  const vertical = items.every((r) => r.x === first.x && r.width === first.width);

  if (!horizontal && !vertical) return { layout: "complex", gaps: null };

  const gaps: Rect[] = [];

  for (let i = 1; i < items.length; i++) {
    const a = items[i - 1]!;
    const b = items[i]!;
    const gap = horizontal
      ? { x: a.x + a.width, y: a.y, width: b.x - a.x - a.width, height: a.height }
      : { x: a.x, y: a.y + a.height, width: a.width, height: b.y - a.y - a.height };

    if (gap.width > 0 && gap.height > 0) gaps.push(copyRect(gap));
  }

  return { layout: horizontal ? "horizontal" : "vertical", gaps: Object.freeze(gaps) };
}

/**
 * Copy Provider observations into immutable public state and derive geometry.
 * Missing or withheld segments fall back to a known layout viewport without
 * changing API availability or inferring posture.
 */
export function normalize(input: ProviderSnapshot): FolyxSnapshot {
  const availability = Object.freeze({
    posture: input.availability.posture,
    segments: input.availability.segments,
  });
  const viewport = isViewport(input.viewport) ? copyViewport(input.viewport) : null;
  const observed =
    input.availability.segments === "available" &&
    input.segments !== null &&
    input.segments.length > 0 &&
    input.segments.every(isRect);

  const items = Object.freeze(
    observed
      ? input.segments!.map(copyRect).sort((a, b) => a.y - b.y || a.x - b.x)
      : viewport
        ? [copyRect({ x: 0, y: 0, ...viewport })]
        : [],
  );
  const geometry = classify(items, viewport);

  return Object.freeze({
    availability,
    posture: Object.freeze({
      value: availability.posture === "available" ? postureValue(input.posture) : "unknown",
      source: availability.posture === "available" ? input.source : "unknown",
    }),
    viewport: Object.freeze({ value: viewport, source: viewport ? input.source : "unknown" }),
    segments: Object.freeze({
      items,
      source: observed ? input.source : viewport ? "fallback" : "unknown",
    }),
    layout: geometry.layout,
    gaps: geometry.gaps,
  });
}

/** Compare the fixed, JSON-safe snapshot shape, including source and availability. */
export const sameState = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
