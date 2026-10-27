<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref } from "vue";
import { createBrowserProvider, createFolyx, createMockProvider } from "@folyx/core";
import type { Availability, Posture } from "@folyx/core";
import { useFolyx } from "@folyx/vue";
import { presets } from "../presets";
import { useDiagnostics } from "../diagnostics";

const props = defineProps<{ mode: "mock" | "browser" }>();
const mock = createMockProvider(presets[0]!.state);

// One Core per keyed workspace; the composable owns the UI subscription.
const folyx = createFolyx({ provider: props.mode === "mock" ? mock : createBrowserProvider() });
const { snapshot, posture, layout, segments, viewport, gaps } = useFolyx({ folyx });

const diagnostics = useDiagnostics(() => folyx.getSnapshot());
const { recording, samples, scenario, notes } = diagnostics;

const preset = ref("book");
const error = ref("");

/** Editable inputs stay separate from the last successfully applied Mock state. */
const draft = reactive({
  width: 900,
  height: 600,
  known: true,
  mapped: true,
  posture: "folded" as Posture,
  postureAvailability: "available" as Availability,
  segmentsAvailability: "available" as Availability,
  segments: [
    { x: 0, y: 0, width: 440, height: 600 },
    { x: 460, y: 0, width: 440, height: 600 },
  ],
});

/** Resolve preset defaults through Mock validation before copying mutable form values. */
function loadPreset() {
  const selected = presets.find((p) => p.id === preset.value)!;
  const next = createMockProvider(selected.state).getSnapshot();

  Object.assign(draft, {
    width: next.viewport?.width ?? 900,
    height: next.viewport?.height ?? 600,
    known: !!next.viewport,
    mapped: next.segments !== null,
    posture: next.posture,
    postureAvailability: next.availability.posture,
    segmentsAvailability: next.availability.segments,
    segments: next.segments?.map((r) => ({ ...r })) ?? [],
  });

  apply();
}

/** Apply the whole draft atomically; validation errors leave the displayed state intact. */
function apply() {
  try {
    mock.set({
      posture: draft.posture,
      viewport: draft.known ? { width: draft.width, height: draft.height } : null,
      segments: draft.segmentsAvailability === "available" && draft.mapped ? draft.segments : null,
      availability: { posture: draft.postureAvailability, segments: draft.segmentsAvailability },
    });

    error.value = "";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}

/** Expand only SVG display bounds so out-of-viewport experiments remain visible. */
const diagram = computed(() => {
  const v = viewport.value;

  if (!v) return null;

  const minX = Math.min(0, ...segments.value.map((r) => r.x));
  const minY = Math.min(0, ...segments.value.map((r) => r.y));
  const maxX = Math.max(v.width, ...segments.value.map((r) => r.x + r.width));
  const maxY = Math.max(v.height, ...segments.value.map((r) => r.y + r.height));
  const width = maxX - minX;
  const height = maxY - minY;

  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;

  const padding = Math.max(width, height) * 0.055;

  if (!Number.isFinite(width + padding * 2) || !Number.isFinite(height + padding * 2)) return null;

  return {
    box: `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`,
    font: Math.max(width, height) / 35,
  };
});

const widget = ref("resizes-visual");

// Undefined means untouched; null means the original meta had no content attribute.
let originalMeta: string | null | undefined;

onScopeDispose(() => {
  if (originalMeta === undefined) return;

  const meta = document.querySelector('meta[name="viewport"]');

  if (originalMeta === null) meta?.removeAttribute("content");
  else meta?.setAttribute("content", originalMeta);
});

/** Change the keyboard viewport policy temporarily, restoring it on workspace disposal. */
function changeWidget() {
  if (originalMeta === undefined)
    originalMeta = document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? null;

  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute(
      "content",
      `width=device-width, initial-scale=1, interactive-widget=${widget.value}`,
    );
}
</script>

<template>
  <main>
    <header class="page-heading">
      <h1>{{ mode === "mock" ? "Simulator" : "Device inspector" }}</h1>
    </header>

    <div class="workspace-grid">
      <section
        class="canvas-panel panel"
        aria-label="Viewport visualization"
      >
        <div class="panel-heading">
          <h2>Viewport</h2>
          <span class="mono">
            {{
              viewport ? `${viewport.width} × ${viewport.height} CSS px` : "Dimensions unavailable"
            }}
          </span>
        </div>

        <div class="canvas">
          <svg
            v-if="diagram && viewport"
            class="viewport-svg"
            :viewBox="diagram.box"
            role="img"
            aria-label="Viewport segments and gaps"
          >
            <rect
              x="0"
              y="0"
              :width="viewport.width"
              :height="viewport.height"
              class="viewport-outline"
            />

            <rect
              v-for="(gap, i) in gaps ?? []"
              :key="`gap-${i}`"
              :x="gap.x"
              :y="gap.y"
              :width="gap.width"
              :height="gap.height"
              class="gap-rect"
            />

            <g
              v-for="(segment, i) in segments"
              :key="i"
              class="segment"
            >
              <rect
                :x="segment.x"
                :y="segment.y"
                :width="segment.width"
                :height="segment.height"
                rx="5"
              />

              <text
                :x="segment.x + segment.width / 2"
                :y="segment.y + segment.height / 2 - diagram.font * 0.3"
                text-anchor="middle"
                :font-size="diagram.font"
              >
                {{ i + 1 }}
              </text>

              <text
                class="segment-size"
                :x="segment.x + segment.width / 2"
                :y="segment.y + segment.height / 2 + diagram.font * 1.1"
                text-anchor="middle"
                :font-size="diagram.font * 0.46"
              >
                {{ segment.width }} × {{ segment.height }}
              </text>
            </g>
          </svg>

          <div
            v-else
            class="empty-canvas"
          >
            <p>No viewport preview available.</p>
          </div>

          <div class="canvas-legend">
            <span>
              <i class="legend-square" />
              Segment
            </span>

            <span>
              <i class="legend-gap" />
              Gap
            </span>

            <span class="mono">origin (0, 0)</span>
          </div>
        </div>

        <div class="metric-strip">
          <div>
            <span>Posture</span>
            <strong data-testid="posture">{{ posture }}</strong>
          </div>

          <div>
            <span>Layout</span>
            <strong data-testid="layout">{{ layout }}</strong>
          </div>

          <div>
            <span>Segments</span>
            <strong>{{ segments.length }}</strong>
          </div>

          <div>
            <span>Geometry source</span>
            <strong data-testid="geometry-source">{{ snapshot.segments.source }}</strong>
          </div>
        </div>
      </section>

      <section
        class="panel controls"
        :aria-label="mode === 'mock' ? 'Simulation controls' : 'Browser observations'"
      >
        <div class="panel-heading">
          <h2>{{ mode === "mock" ? "Simulation settings" : "API availability" }}</h2>
        </div>

        <template v-if="mode === 'mock'">
          <form @submit.prevent="apply">
            <label>
              Preset
              <select
                v-model="preset"
                aria-label="Scenario preset"
                @change="loadPreset"
              >
                <option
                  v-for="p in presets"
                  :key="p.id"
                  :value="p.id"
                >
                  {{ p.label }}
                </option>
              </select>
            </label>

            <div class="form-pair">
              <label>
                Width
                <input
                  v-model.number="draft.width"
                  type="number"
                  step="any"
                  aria-label="Viewport width"
                />
              </label>

              <label>
                Height
                <input
                  v-model.number="draft.height"
                  type="number"
                  step="any"
                  aria-label="Viewport height"
                />
              </label>
            </div>

            <label class="checkbox-label">
              <input
                v-model="draft.known"
                type="checkbox"
              />
              Known viewport dimensions
            </label>

            <label>
              Posture
              <select
                v-model="draft.posture"
                aria-label="Posture"
              >
                <option>folded</option>
                <option>continuous</option>
                <option>unknown</option>
              </select>
            </label>

            <div class="form-pair">
              <label>
                Posture API
                <select
                  v-model="draft.postureAvailability"
                  aria-label="Posture availability"
                >
                  <option>available</option>
                  <option>unsupported</option>
                  <option>unavailable</option>
                </select>
              </label>

              <label>
                Segments API
                <select
                  v-model="draft.segmentsAvailability"
                  aria-label="Segments availability"
                >
                  <option>available</option>
                  <option>unsupported</option>
                  <option>unavailable</option>
                </select>
              </label>
            </div>

            <label
              v-if="draft.segmentsAvailability === 'available'"
              class="checkbox-label"
            >
              <input
                v-model="draft.mapped"
                type="checkbox"
              />
              Mapped region geometry
            </label>

            <div class="editor-title">
              Regions
              <button
                type="button"
                class="text-button"
                @click="draft.segments.push({ x: 0, y: 0, width: 200, height: 200 })"
              >
                Add region
              </button>
            </div>

            <div class="rect-labels">
              <span>X</span>
              <span>Y</span>
              <span>W</span>
              <span>H</span>
              <span />
            </div>

            <div
              v-for="(r, i) in draft.segments"
              :key="i"
              class="rect-inputs"
            >
              <input
                v-for="field in ['x', 'y', 'width', 'height'] as const"
                :key="field"
                v-model.number="r[field]"
                type="number"
                step="any"
                :aria-label="`Region ${i + 1} ${field}`"
              />
              <button
                type="button"
                :aria-label="`Remove region ${i + 1}`"
                @click="draft.segments.splice(i, 1)"
              >
                ×
              </button>
            </div>

            <p
              v-if="error"
              role="alert"
              class="error"
            >
              {{ error }}
            </p>

            <button
              class="primary-button"
              type="submit"
            >
              Apply changes
            </button>
          </form>
        </template>

        <template v-else>
          <div class="api-row">
            <span>Device Posture</span>
            <span class="availability">{{ snapshot.availability.posture }}</span>
          </div>

          <div class="api-row">
            <span>Viewport Segments</span>
            <span class="availability">{{ snapshot.availability.segments }}</span>
          </div>

          <p
            v-if="
              snapshot.availability.segments === 'available' &&
              snapshot.segments.source === 'fallback'
            "
            class="notice"
          >
            Segment coordinates could not be mapped to the layout viewport. Showing a single
            fallback region.
          </p>
        </template>
      </section>
    </div>

    <section class="panel readings">
      <div class="panel-heading">
        <h2>Region readings</h2>
        <span>Source: {{ snapshot.segments.source }}</span>
      </div>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th>X</th>
              <th>Y</th>
              <th>Width</th>
              <th>Height</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(r, i) in segments"
              :key="i"
            >
              <td>Region {{ i + 1 }}</td>
              <td>{{ r.x }}</td>
              <td>{{ r.y }}</td>
              <td>
                {{ r.width }}
                <small>px</small>
              </td>
              <td>
                {{ r.height }}
                <small>px</small>
              </td>
            </tr>

            <tr v-if="!segments.length">
              <td colspan="5">No known regions.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <details class="panel snapshot-panel">
      <summary>Snapshot</summary>

      <pre>{{ JSON.stringify(snapshot, null, 2) }}</pre>
    </details>

    <section
      v-if="mode === 'browser'"
      class="panel diagnostic-panel"
      aria-label="Device diagnostics"
    >
      <div class="panel-heading">
        <h2>Diagnostics</h2>
      </div>

      <div class="diagnostic-grid">
        <label>
          Scenario
          <select
            v-model="scenario"
            aria-label="Diagnostic scenario"
          >
            <option value="normal">Normal display</option>
            <option value="zoom">Pinch zoom and pan</option>
            <option value="keyboard">Software keyboard</option>
            <option value="rotation">Screen rotation</option>
            <option value="posture">Folding transition</option>
          </select>
        </label>

        <label>
          Keyboard viewport mode
          <select
            v-model="widget"
            aria-label="Keyboard viewport mode"
            @change="changeWidget"
          >
            <option>resizes-visual</option>
            <option>resizes-content</option>
            <option>overlays-content</option>
          </select>
        </label>

        <label>
          Keyboard test
          <input
            placeholder="Tap here to open your keyboard"
            aria-label="Keyboard test"
          />
        </label>

        <label>
          Environment notes
          <input
            v-model="notes"
            placeholder="Device, OS, browser version…"
            aria-label="Environment notes"
          />
        </label>
      </div>

      <div class="diagnostic-actions">
        <button
          class="primary-button"
          @click="recording ? diagnostics.stop() : diagnostics.start()"
        >
          {{ recording ? "Stop recording" : "Start recording" }}
        </button>

        <button
          class="secondary-button"
          @click="diagnostics.sample()"
        >
          Capture sample
        </button>

        <button
          class="secondary-button"
          :disabled="!samples.length"
          @click="diagnostics.download()"
        >
          Export JSON
        </button>

        <span
          class="mono"
          role="status"
        >
          {{ samples.length }} samples{{ recording ? " · recording" : "" }}
        </span>
      </div>

      <p class="help">Recordings stay on your device. The latest 1,000 samples are kept.</p>
    </section>
  </main>
</template>
