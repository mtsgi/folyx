/**
 * Whether an API currently supplies an observation.
 *
 * `unsupported` means the API is absent; `unavailable` includes SSR and failed
 * reads. `available` does not guarantee a known posture or usable coordinates.
 */
export type Availability = "available" | "unsupported" | "unavailable";

/** API availability, kept independent of each public value's source. */
export interface ApiAvailability {
  readonly posture: Availability;
  readonly segments: Availability;
}

/** Observed posture; unknown values are never inferred from screen geometry. */
export type Posture = "continuous" | "folded" | "unknown";

/** Region arrangement in layout coordinates, independent of physical hinges. */
export type Layout = "single" | "horizontal" | "vertical" | "complex" | "unknown";

/** Origin of a public value, including synthesized fallbacks and unknown values. */
export type Source = "browser" | "mock" | "provider" | "fallback" | "unknown";

/** Layout viewport dimensions in CSS pixels, with finite, positive values. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** A region in CSS pixels, relative to the layout viewport's upper-left corner. */
export interface Rect extends Viewport {
  readonly x: number;
  readonly y: number;
}

/** Observations supplied to Core before fallback and layout derivation. */
export interface ProviderSnapshot {
  readonly source: "browser" | "mock" | "provider";
  readonly availability: ApiAvailability;
  readonly posture: Posture;
  readonly viewport: Viewport | null;
  /**
   * Layout coordinates only. Return `null` when no safe mapping is known,
   * even if the API supplied raw rectangles and remains `available`.
   */
  readonly segments: readonly Rect[] | null;
}

/** Common observation contract for Browser, Mock, and custom Providers. */
export interface FolyxProvider {
  /** Read current observations synchronously, without notifying subscribers. */
  getSnapshot(): ProviderSnapshot;

  /**
   * Observe changes only; Core supplies the initial notification.
   *
   * @returns An idempotent cleanup function for this registration only.
   */
  subscribe(listener: (state: ProviderSnapshot) => void): () => void;
}

/** Immutable public state: observations, derived geometry, and fallback sources. */
export interface FolyxSnapshot {
  readonly availability: ApiAvailability;
  readonly posture: { readonly value: Posture; readonly source: Source };
  readonly viewport: { readonly value: Viewport | null; readonly source: Source };
  readonly segments: { readonly items: readonly Rect[]; readonly source: Source };
  readonly layout: Layout;
  /** Aligned region gaps; `[]` means none, while `null` means not derivable. */
  readonly gaps: readonly Rect[] | null;
}

/** Small, framework-independent interface for reading and observing state. */
export interface Folyx {
  /**
   * Read the latest state synchronously, without waiting for RAF or notifying.
   * Equal values, sources, and availability retain the same snapshot reference.
   */
  getSnapshot(): FolyxSnapshot;

  /**
   * Receive the current state once synchronously, then subsequent changes.
   * Browser changes are batched by RAF; Mock changes are synchronous.
   *
   * @returns An idempotent cleanup function. The last cleanup releases this
   * instance's Provider subscription without stopping other consumers.
   */
  subscribe(listener: (state: FolyxSnapshot) => void): () => void;
}

/** Options for an independent Core instance; the default Provider is Browser. */
export interface FolyxOptions {
  readonly provider?: FolyxProvider;
}

/**
 * A partial Mock update. Viewport and segments replace their entire values.
 *
 * Omitted availability is inferred from supplied observations. Explicit
 * non-available statuses clear their observations; restoring availability
 * requires supplying the observation again. Explicitly available `null`
 * segments model an API whose coordinates cannot be mapped safely.
 */
export interface MockInput {
  readonly posture?: Posture;
  readonly viewport?: Viewport | null;
  readonly segments?: readonly Rect[] | null;
  readonly availability?: Partial<ApiAvailability>;
}

/** A controllable Provider with copied, immutable observations. */
export interface MockProvider extends FolyxProvider {
  /**
   * Validate and apply one patch, then synchronously notify on a state change.
   *
   * @throws {TypeError} If input validation fails; the previous state is retained.
   */
  set(patch: MockInput): void;
}
