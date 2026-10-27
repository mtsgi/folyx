# FoldLab

FoldLab is a place to explore Folyx: try a screen shape in the simulator, or open Device inspector to see what your browser can report. It uses Vue and @folyx/vue. Start it with `vp run dev` from the workspace root.

The interface is in English. You can edit Mock regions and API availability, inspect live state, compare raw measurements with the public snapshot and CSS values, and export a recording as JSON. Measurements stay on your device. Each recording holds up to 1,000 samples and reports how many older samples were dropped; there is no telemetry or remote storage.

Pixel 10 Pro Fold normal-display measurements are saved as a Core regression fixture for near-unit scale and one-pixel segment overflow. Hardware confirmation of the fix and verification of zoom, pan, keyboard behavior, rotation, and folding transitions remain pending. Device inspector keeps the original browser readings alongside the public snapshot, including any bounded correction of overflowing edges. The repository's [device measurement guide](../../docs/maintainers/device-verification.md) walks through the process, with a [Japanese version](../../docs/maintainers/ja/device-verification.md) alongside it.
