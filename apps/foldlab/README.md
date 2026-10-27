# FoldLab

FoldLab is a place to explore Folyx: try a screen shape in the simulator, or open Device inspector to see what your browser can report. It uses Vue and @folyx/vue. Start it with `vp run dev` from the workspace root.

The interface is in English. You can edit Mock regions and API availability, inspect live state, compare raw measurements with the public snapshot and CSS values, and export a recording as JSON. Measurements stay on your device. Each recording holds up to 1,000 samples and reports how many older samples were dropped; there is no telemetry or remote storage.

Pixel 10 Pro Fold measurements are still pending. If you have a device to try, Device inspector can record normal display, zoom and pan, keyboard, rotation, and folding transitions. The repository's [device measurement guide](../../docs/maintainers/device-verification.md) walks through the process, with a [Japanese version](../../docs/maintainers/ja/device-verification.md) alongside it.
