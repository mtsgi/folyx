import { copyRect, copyViewport, isRect, isViewport, sameState } from "./state.ts";
import type { Availability, MockInput, MockProvider, ProviderSnapshot } from "./types.ts";

const statuses: readonly Availability[] = ["available", "unsupported", "unavailable"];

/**
 * Create a controllable Provider for tests and device-independent experiments.
 * Inputs are copied and frozen; patches notify synchronously when state changes.
 *
 * @param initial - Optional observations and explicit API availability.
 * @throws {TypeError} If the initial observations or availability are invalid.
 */
export function createMockProvider(initial: MockInput = {}): MockProvider {
  let current: ProviderSnapshot = Object.freeze({
    source: "mock",
    posture: "unknown",
    viewport: null,
    segments: null,
    availability: Object.freeze({ posture: "unavailable", segments: "unavailable" }),
  });
  const listeners = new Set<(state: ProviderSnapshot) => void>();

  /** Validate the entire patch before replacing current state or notifying listeners. */
  function set(patch: MockInput) {
    if (patch.posture !== undefined && !["unknown", "folded", "continuous"].includes(patch.posture))
      throw new TypeError("Invalid posture");
    if (patch.viewport !== undefined && patch.viewport !== null && !isViewport(patch.viewport))
      throw new TypeError("Viewport dimensions must be finite and positive");
    if (patch.segments !== undefined && patch.segments !== null && !patch.segments.every(isRect))
      throw new TypeError("Segment coordinates must be finite and dimensions positive");
    for (const value of Object.values(patch.availability ?? {}))
      if (!statuses.includes(value)) throw new TypeError("Invalid availability");

    const availability = {
      posture:
        patch.availability?.posture ??
        (patch.posture !== undefined ? "available" : current.availability.posture),
      segments:
        patch.availability?.segments ??
        (patch.segments !== undefined
          ? patch.segments === null
            ? "unavailable"
            : "available"
          : current.availability.segments),
    } as const;
    const posture =
      availability.posture === "available" ? (patch.posture ?? current.posture) : "unknown";
    const rawSegments = patch.segments !== undefined ? patch.segments : current.segments;

    // Cleared observations must be supplied again rather than silently restored.
    if (
      availability.posture === "available" &&
      current.availability.posture !== "available" &&
      patch.posture === undefined
    )
      throw new TypeError("Supply posture when making it available");
    if (
      availability.segments === "available" &&
      ((current.availability.segments !== "available" && patch.segments === undefined) ||
        (rawSegments !== null && !rawSegments.length))
    )
      throw new TypeError(
        "Supply segments (or explicit null for unmapped geometry) when making segments available",
      );

    const viewport = patch.viewport !== undefined ? patch.viewport : current.viewport;
    const next: ProviderSnapshot = Object.freeze({
      source: "mock",
      posture,
      viewport: viewport ? copyViewport(viewport) : null,
      segments:
        availability.segments === "available" && rawSegments !== null
          ? Object.freeze(rawSegments.map(copyRect))
          : null,
      availability: Object.freeze(availability),
    });

    if (!sameState(current, next)) {
      current = next;

      // oxlint-disable-next-line unicorn/no-useless-spread -- Freeze the dispatch set against subscriptions added by callbacks.
      for (const listener of [...listeners]) if (listeners.has(listener)) listener(current);
    }
  }

  set(initial);

  return {
    getSnapshot: () => current,
    set,

    subscribe(listener) {
      // Wrapping gives repeated registrations of the same callback independent cleanup.
      const subscription = (state: ProviderSnapshot) => listener(state);
      listeners.add(subscription);

      return () => {
        listeners.delete(subscription);
      };
    },
  };
}
