import { copyRect, isRect, isViewport } from "./state.ts";
import type { Rect, Viewport } from "./types.ts";

/** Visual frame measurements used to guard the supported coordinate mapping. */
interface VisualMetrics extends Viewport {
  readonly scale: number;
  readonly offsetLeft: number;
  readonly offsetTop: number;
}

/** Maximum browser rounding discrepancy in layout CSS pixels. */
const ROUNDING_TOLERANCE = 1;

/**
 * Layout and visual frames must coincide within browser rounding, with zero
 * visual offsets (CSSOM View: these are relative to the layout viewport).
 * Bounds alone do not establish a coordinate frame. Do not infer a scale from
 * rectangle extents, or apply DPR to values already expressed in CSS pixels.
 * A Pixel 10 Pro Fold normal-display recording covers near-unit scale and a
 * one-pixel outer overflow. Only overflowing edges are clamped; internal
 * coordinates and already in-bounds dimensions retain their reported values.
 *
 * @param raw - Copied native API rectangles, before coordinate normalization.
 * @param viewport - Current layout viewport, or null if it could not be read.
 * @param visual - Visual frame evidence, or null when unavailable.
 * @returns Frozen bounded copies, or null when a safe mapping is not established.
 */
export function toLayoutSegments(
  raw: readonly Rect[],
  viewport: Viewport | null,
  visual: VisualMetrics | null,
): readonly Rect[] | null {
  if (
    !isViewport(viewport) ||
    !isViewport(visual) ||
    !Number.isFinite(visual.scale) ||
    visual.scale <= 0 ||
    Math.abs(visual.scale - 1) * Math.max(viewport.width, viewport.height) > ROUNDING_TOLERANCE ||
    visual.offsetLeft !== 0 ||
    visual.offsetTop !== 0 ||
    Math.abs(visual.width - viewport.width) > ROUNDING_TOLERANCE ||
    Math.abs(visual.height - viewport.height) > ROUNDING_TOLERANCE
  )
    return null;

  if (!raw.length || !raw.every(isRect)) return null;

  // Full outer bounds are a consistency check, not the evidence for identity.
  if (
    Math.abs(Math.min(...raw.map((r) => r.x))) > ROUNDING_TOLERANCE ||
    Math.abs(Math.min(...raw.map((r) => r.y))) > ROUNDING_TOLERANCE ||
    Math.abs(Math.max(...raw.map((r) => r.x + r.width)) - viewport.width) > ROUNDING_TOLERANCE ||
    Math.abs(Math.max(...raw.map((r) => r.y + r.height)) - viewport.height) > ROUNDING_TOLERANCE
  )
    return null;

  const items = raw.map((r) => {
    const x = Math.max(0, r.x);
    const y = Math.max(0, r.y);
    const right = r.x + r.width;
    const bottom = r.y + r.height;

    return copyRect({
      x,
      y,
      width: r.x < 0 || right > viewport.width ? Math.min(right, viewport.width) - x : r.width,
      height:
        r.y < 0 || bottom > viewport.height ? Math.min(bottom, viewport.height) - y : r.height,
    });
  });

  // An entirely out-of-viewport region must not be silently removed or collapsed.
  return items.every(isRect) ? Object.freeze(items) : null;
}
