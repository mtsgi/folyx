import { copyRect, isRect, isViewport } from "./state.ts";
import type { Rect, Viewport } from "./types.ts";

/** Visual frame measurements used to guard the supported coordinate mapping. */
interface VisualMetrics extends Viewport {
  readonly scale: number;
  readonly offsetLeft: number;
  readonly offsetTop: number;
}

/**
 * Only the identity mapping is enabled in 0.1. Layout and visual frames must
 * coincide (CSSOM View: offsetLeft/Top are relative to the layout viewport).
 * Bounds alone do not establish a coordinate frame. Do not infer a scale from
 * rectangle extents, or apply DPR to values already expressed in CSS pixels.
 * This conservative policy has not yet been validated on Pixel 10 Pro Fold.
 *
 * @param raw - Copied native API rectangles, before coordinate normalization.
 * @param viewport - Current layout viewport, or null if it could not be read.
 * @param visual - Visual frame evidence, or null when unavailable.
 * @returns Frozen rectangle copies, or null when a safe mapping is not established.
 */
export function toLayoutSegments(
  raw: readonly Rect[],
  viewport: Viewport | null,
  visual: VisualMetrics | null,
): readonly Rect[] | null {
  if (
    !isViewport(viewport) ||
    !isViewport(visual) ||
    visual.scale !== 1 ||
    visual.offsetLeft !== 0 ||
    visual.offsetTop !== 0 ||
    Math.abs(visual.width - viewport.width) > 1 ||
    Math.abs(visual.height - viewport.height) > 1
  )
    return null;

  if (!raw.length || !raw.every(isRect)) return null;

  if (
    raw.some(
      (r) =>
        r.x < 0 || r.y < 0 || r.x + r.width > viewport.width || r.y + r.height > viewport.height,
    )
  )
    return null;

  // Full outer bounds are a consistency check, not the evidence for identity.
  if (
    Math.min(...raw.map((r) => r.x)) !== 0 ||
    Math.min(...raw.map((r) => r.y)) !== 0 ||
    Math.abs(Math.max(...raw.map((r) => r.x + r.width)) - viewport.width) > 1 ||
    Math.abs(Math.max(...raw.map((r) => r.y + r.height)) - viewport.height) > 1
  )
    return null;

  return Object.freeze(raw.map(copyRect));
}
