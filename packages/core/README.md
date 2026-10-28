# @folyx/core

Folyx brings posture, viewport regions, and their layout into one TypeScript API. It works with your framework of choice or with plain TypeScript, and ships as ESM with type declarations and no runtime dependencies.

Here's how to read the browser's state and follow changes:

```ts
import { createFolyx } from "@folyx/core";
const folyx = createFolyx();
const stop = folyx.subscribe((state) => {
  console.log(state.posture.value, state.layout, state.segments.items);
  console.log(state.availability, state.segments.source);
});
const current = folyx.getSnapshot();
stop();
```

`createFolyx({ provider? })` uses Browser Provider by default. You can also use `createBrowserProvider()`, try a screen shape with `createMockProvider(initial?)`, or connect a custom Provider. Mock's `set(patch)` lets you update posture, viewport, segments, and API availability while the app runs.

`availability` tells you whether an API is available, unsupported, or temporarily unavailable. `source` tells you where a value came from: browser, mock, provider, fallback, or unknown. Keeping the two separate helps explain cases where the browser responds but Folyx needs to provide fallback geometry.

Snapshots are deeply readonly and frozen. A subscription receives current state immediately and returns a cleanup function that's safe to call more than once. Browser events are gathered into RAF updates, and synchronous reads leave pending subscriber notifications intact. Importing and reading Core during SSR works too: information that isn't known stays unknown, without made-up viewport dimensions.

All public geometry uses layout viewport CSS px. Browser Provider accepts coincident layout and visual frames with zero visual offsets and up to one CSS pixel of rounding in dimensions, outer bounds, and scale drift across the longer layout axis. Overflowing edges are clamped to the viewport, preserving internal boundaries and keeping `segments.source` as `browser`. If a zoom or keyboard state can't be mapped safely, the known viewport becomes a single fallback region while readable API availability stays available. Older segments interfaces, guessed scale corrections, and device-name rules aren't used.

A 46-sample Pixel 10 Pro Fold recording from October 28, 2026 confirms the rounding fix on hardware. Regression tests cover normal display, a `continuous` to `folded` posture change, zoom/pan fallback, restoration to two regions at scale 1 with zero visual offsets, and a viewport height change from 720 to 817 CSS px. Keyboard behavior, rotation, and coverage of all folding states still need hardware verification.

For experiments, Mock keeps overlapping or out-of-bounds regions as complex geometry, while invalid dimensions are rejected. Changing an API to unsupported or unavailable clears its observation. Custom Providers follow the same interface: they report changes and provide layout-coordinate segments, or null when geometry can't be supplied.

The repository's English and Japanese documentation covers coordinates, subscriptions, sharing, and device measurements in more detail. Folyx is MIT licensed.
