import { computed, getCurrentInstance, onMounted, onScopeDispose, shallowRef } from "vue";
import { createFolyx } from "@folyx/core";
import type { Folyx, FolyxProvider, FolyxSnapshot } from "@folyx/core";

/** Borrow a Core instance or supply a Provider for a component-owned instance. */
export type UseFolyxOptions =
  | { readonly provider?: FolyxProvider; readonly folyx?: never }
  | { readonly folyx: Folyx; readonly provider?: never };

/** Shared immutable placeholder used for SSR and the first client render. */
const initial: FolyxSnapshot = Object.freeze({
  availability: Object.freeze({ posture: "unavailable", segments: "unavailable" }),
  posture: Object.freeze({ value: "unknown", source: "unknown" }),
  viewport: Object.freeze({ value: null, source: "unknown" }),
  segments: Object.freeze({ items: Object.freeze([]), source: "unknown" }),
  layout: "unknown",
  gaps: null,
});

/**
 * Connect Folyx to the current component with readonly computed refs.
 *
 * SSR and the first client render use the same unknown state without reading
 * or subscribing to an external instance. Mounting subscribes and immediately
 * receives the latest state, including changes made before mount.
 *
 * A supplied instance is borrowed. Scope cleanup releases only this
 * component's subscription, leaving other consumers and the Provider intact.
 *
 * @param options - A Provider override or an existing Core instance, exclusively.
 * @returns Readonly refs for the snapshot and its commonly used values.
 * @throws {Error} If called outside component setup.
 * @throws {TypeError} If both provider and folyx are supplied.
 */
export function useFolyx(options: UseFolyxOptions = {}) {
  if (!getCurrentInstance()) throw new Error("useFolyx() must be called inside component setup");
  if (options.provider && options.folyx) throw new TypeError("Choose provider or folyx, not both");

  const snapshot = shallowRef<FolyxSnapshot>(initial);
  let stop: (() => void) | undefined;

  onMounted(() => {
    const folyx = options.folyx ?? createFolyx({ provider: options.provider });
    stop = folyx.subscribe((next) => {
      snapshot.value = next;
    });
  });

  onScopeDispose(() => {
    stop?.();
    stop = undefined;
  });

  return {
    snapshot: computed(() => snapshot.value),
    posture: computed(() => snapshot.value.posture.value),
    layout: computed(() => snapshot.value.layout),
    segments: computed(() => snapshot.value.segments.items),
    viewport: computed(() => snapshot.value.viewport.value),
    gaps: computed(() => snapshot.value.gaps),
  };
}
