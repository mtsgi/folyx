import { onScopeDispose, ref, shallowRef } from "vue";
import type { FolyxSnapshot } from "@folyx/core";

/** Retain optional API read errors as diagnostic data instead of losing the sample. */
function safely<T>(read: () => T): T | { error: string } {
  try {
    return read();
  } catch (error) {
    return { error: String(error) };
  }
}

/** Native shapes used only by FoldLab; raw values never enter Core's public state. */
type RawWindow = Window & {
  viewport?: { segments?: readonly DOMRectReadOnly[] | null };
  navigator: Navigator & { devicePosture?: EventTarget & { type: string } };
};

/** Compare CSS segment variables within a bounded probe, independently of Core. */
function cssSegments() {
  const probe = document.createElement("span");
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none";
  document.body.append(probe);

  try {
    const result = [];

    for (let row = 0; row < 4; row++)
      for (let column = 0; column < 4; column++) {
        for (const key of ["width", "height", "left", "top"])
          probe.style.setProperty(
            `--${key}`,
            `env(viewport-segment-${key} ${column} ${row}, missing)`,
          );

        const style = getComputedStyle(probe);
        const values = Object.fromEntries(
          ["width", "height", "left", "top"].map((key) => [
            key,
            style.getPropertyValue(`--${key}`).trim(),
          ]),
        );

        if (values.width !== "missing") result.push({ column, row, ...values });
      }

    return { probeRange: "4 x 4", items: result };
  } finally {
    probe.remove();
  }
}

/**
 * Capture browser-only measurements for comparison with a public Folyx snapshot.
 * Native geometry, visual offsets, CSS probes, and getter failures stay here
 * rather than becoming part of the library's coordinate contract.
 */
export function readRawBrowser() {
  const win = window as RawWindow;

  return {
    layout: {
      width: innerWidth,
      height: innerHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
    },
    visual: safely(() =>
      win.visualViewport
        ? {
            width: win.visualViewport.width,
            height: win.visualViewport.height,
            offsetLeft: win.visualViewport.offsetLeft,
            offsetTop: win.visualViewport.offsetTop,
            scale: win.visualViewport.scale,
          }
        : null,
    ),
    segments: safely(
      () =>
        win.viewport?.segments?.map((r) => ({
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        })) ?? null,
    ),
    posture: safely(() => win.navigator.devicePosture?.type ?? null),
    orientation: safely(() => ({
      type: screen.orientation?.type,
      angle: screen.orientation?.angle,
    })),
    scroll: { x: scrollX, y: scrollY },
    devicePixelRatio,
    css: safely(cssSegments),
    interactiveWidget: document.querySelector('meta[name="viewport"]')?.getAttribute("content"),
  };
}

/**
 * Manage a component-scoped, local diagnostic recording with JSON export.
 *
 * Event samples are batched per animation frame. The latest 1,000 samples are
 * retained in memory, and scope disposal stops listeners and pending work.
 *
 * @param readSnapshot - Synchronous read of the associated Core instance.
 * @returns Recording controls, editable context, and the retained sample buffer.
 */
export function useDiagnostics(readSnapshot: () => FolyxSnapshot) {
  const recording = ref(false);
  const samples = shallowRef<readonly unknown[]>([]);
  const dropped = ref(0);
  const scenario = ref("normal");
  const notes = ref("");
  let cleanup: (() => void) | undefined;

  /** Append raw and public readings, counting evictions from the bounded buffer. */
  function sample(events: readonly string[] = ["manual"]) {
    const entry = {
      time: new Date().toISOString(),
      monotonicTime: performance.now(),
      events,
      scenario: scenario.value,
      raw: readRawBrowser(),
      snapshot: readSnapshot(),
    };
    const next = [...samples.value, entry];

    if (next.length > 1000) {
      next.shift();
      dropped.value++;
    }

    samples.value = next;
  }

  /** Stop monitoring idempotently while keeping the current recording available. */
  function stop() {
    recording.value = false;
    cleanup?.();
    cleanup = undefined;
  }

  /** Begin monitoring and combine event names into one diagnostic sample per RAF. */
  function start() {
    if (recording.value) return;

    recording.value = true;
    sample(["start"]);

    const removers: (() => void)[] = [];
    const pending = new Set<string>();
    let frame: number | undefined;

    function add(target: EventTarget | null | undefined, name: string) {
      if (typeof target?.addEventListener !== "function") return;

      const listener = () => {
        pending.add(name);

        if (frame === undefined)
          frame = requestAnimationFrame(() => {
            frame = undefined;
            if (!recording.value) return;
            sample([...pending]);
            pending.clear();
          });
      };

      target.addEventListener(name, listener);
      removers.push(() => target.removeEventListener(name, listener));
    }

    add(window, "resize");
    add(window, "pageshow");
    add(document, "visibilitychange");
    add(window.visualViewport, "resize");
    add(window.visualViewport, "scroll");
    add(screen.orientation, "change");

    try {
      add((window as RawWindow).navigator.devicePosture, "change");
    } catch {
      /* Logged by raw sampling. */
    }

    cleanup = () => {
      removers.forEach((fn) => fn());
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }

  /** Export the retained samples locally and release the temporary download URL. */
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            schemaVersion: 1,
            folyxVersion: "0.1.0",
            userAgent: navigator.userAgent,
            notes: notes.value,
            pixel10ProFoldVerified: false,
            dropped: dropped.value,
            samples: samples.value,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "foldlab-diagnostics.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  onScopeDispose(stop);

  return { recording, samples, dropped, scenario, notes, start, stop, sample, download };
}
