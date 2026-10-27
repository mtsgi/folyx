import { toLayoutSegments } from "./coordinates.ts";
import { copyRect, copyViewport, isRect, isViewport, postureValue } from "./state.ts";
import type {
  Availability,
  FolyxProvider,
  Posture,
  ProviderSnapshot,
  Rect,
  Viewport,
} from "./types.ts";

/** Minimal shape for the optional posture API without extending public DOM types. */
interface PostureApi extends EventTarget {
  readonly type: string;
}

type BrowserWindow = Window & {
  readonly viewport?: { readonly segments?: readonly Rect[] | null };
  readonly navigator: Navigator & { readonly devicePosture?: PostureApi };
};

const browserWindow = (): BrowserWindow | null =>
  typeof window === "undefined" ? null : (window as BrowserWindow);

/** Read current browser observations independently, retaining safe defaults on failure. */
function readBrowser(): ProviderSnapshot {
  const win = browserWindow();
  let posture: Posture = "unknown";
  let postureAvailability: Availability = "unavailable";
  let segmentsAvailability: Availability = "unavailable";
  let viewport: Viewport | null = null;
  let segments: readonly Rect[] | null = null;

  if (win) {
    try {
      const size = { width: win.innerWidth, height: win.innerHeight };
      if (isViewport(size)) viewport = copyViewport(size);
    } catch {
      /* No usable layout viewport. */
    }

    try {
      if (!("devicePosture" in win.navigator)) postureAvailability = "unsupported";
      else if (typeof win.navigator.devicePosture?.type === "string") {
        postureAvailability = "available";
        posture = postureValue(win.navigator.devicePosture.type);
      }
    } catch {
      /* Present but inaccessible. */
    }

    try {
      if (!("viewport" in win)) segmentsAvailability = "unsupported";
      else if (win.viewport && !("segments" in win.viewport)) segmentsAvailability = "unsupported";
      else {
        const raw = win.viewport?.segments;

        if (Array.isArray(raw) && raw.length && raw.every((r) => r != null && isRect(r))) {
          // Mapping can fail after observation succeeds; availability stays available.
          segmentsAvailability = "available";
          const visual = win.visualViewport;

          segments = toLayoutSegments(
            raw.map(copyRect),
            viewport,
            visual
              ? {
                  width: visual.width,
                  height: visual.height,
                  scale: visual.scale,
                  offsetLeft: visual.offsetLeft,
                  offsetTop: visual.offsetTop,
                }
              : null,
          );
        }
      }
    } catch {
      /* Present but no observation can be read. */
    }
  }

  return Object.freeze({
    source: "browser",
    posture,
    viewport,
    segments,
    availability: Object.freeze({ posture: postureAvailability, segments: segmentsAvailability }),
  });
}

/**
 * Create an SSR-safe Provider for current browser posture and viewport APIs.
 *
 * Reads are synchronous. Monitoring starts with the first subscriber, batches
 * browser events into RAF, and releases listeners and pending RAF when idle.
 * Unmapped native rectangles are withheld so Core can supply a layout fallback.
 *
 * @returns A shareable Provider; each subscription owns only its own cleanup.
 */
export function createBrowserProvider(): FolyxProvider {
  const listeners = new Set<(state: ProviderSnapshot) => void>();
  let detach: (() => void) | undefined;
  let generation = 0;

  /** Own one monitoring period and invalidate its queued callbacks on cleanup. */
  function attach() {
    const win = browserWindow();

    if (!win) return () => {};

    const epoch = ++generation;
    let frame: number | undefined;
    const cleanups: (() => void)[] = [];

    const schedule = () => {
      if (frame !== undefined || !listeners.size) return;

      frame = win.requestAnimationFrame(() => {
        // A cancelled frame may still run after a new subscription period begins.
        if (epoch !== generation) return;

        frame = undefined;
        const next = readBrowser();

        // oxlint-disable-next-line unicorn/no-useless-spread -- Freeze the dispatch set against subscriptions added by callbacks.
        for (const listener of [...listeners]) if (listeners.has(listener)) listener(next);
      });
    };

    /** Track listeners together so sharing a Provider does not duplicate monitoring. */
    function add(target: EventTarget | null | undefined, event: string) {
      if (typeof target?.addEventListener !== "function") return;

      target.addEventListener(event, schedule);
      cleanups.push(() => target.removeEventListener(event, schedule));
    }

    add(win, "resize");
    add(win, "pageshow");
    add(win.document, "visibilitychange");

    try {
      add(win.screen?.orientation, "change");
    } catch {
      /* Optional. */
    }

    try {
      add(win.navigator.devicePosture, "change");
    } catch {
      /* Optional. */
    }

    try {
      add(win.visualViewport, "resize");
      add(win.visualViewport, "scroll");
    } catch {
      /* Optional. */
    }

    return () => {
      generation++;
      if (frame !== undefined) win.cancelAnimationFrame(frame);
      for (const cleanup of cleanups) cleanup();
    };
  }

  return {
    getSnapshot: readBrowser,

    subscribe(listener) {
      const subscription = (state: ProviderSnapshot) => listener(state);
      listeners.add(subscription);

      if (listeners.size === 1) detach = attach();

      return () => {
        listeners.delete(subscription);

        if (!listeners.size) {
          detach?.();
          detach = undefined;
        }
      };
    },
  };
}
