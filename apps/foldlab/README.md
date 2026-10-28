# FoldLab

FoldLab is a place to explore Folyx: try a screen shape in the simulator, or open Device inspector to see what your browser can report. It uses Vue and @folyx/vue. Start it with `vp run dev` from the workspace root.

The interface is in English. You can edit Mock regions and API availability, inspect live state, compare raw measurements with the public snapshot and CSS values, and export a recording as JSON. Measurements stay on your device. Each recording holds up to 1,000 samples and reports how many older samples were dropped; there is no telemetry or remote storage.

Pixel 10 Pro Fold recordings include the original rounding failure and a 46-sample session from October 28, 2026 confirming the fix on hardware. The follow-up session covers normal display, a `continuous` to `folded` posture change, fallback during zoom and pan, restoration to two regions at scale 1 with zero visual offsets, and a viewport height change. Keyboard behavior, rotation, and coverage of all folding states still need hardware verification.

Device inspector keeps the original browser readings alongside the public snapshot, including any bounded correction of overflowing edges. The repository's [device measurement guide](../../docs/maintainers/device-verification.md) walks through the process and records the results, with a [Japanese version](../../docs/maintainers/ja/device-verification.md) alongside it.
