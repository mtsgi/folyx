# Device verification

Use FoldLab to collect measurements and explore how a real device behaves. These are contributor notes, kept outside the public documentation site.

Pixel 10 Pro Fold measurements are still to come. Mock and desktop Device Mode are useful for developing and testing an interface; measurements on the device will help confirm how its browser behaves during everyday interactions. A provisional npm release can be published before that device verification is complete.

## Recording a device session

Start in FoldLab's Device inspector. In Environment notes, include the device model, Android version, full browser version, date, and any browser settings relevant to the session. These details make a recording much easier to revisit later.

Choose a scenario, start recording, and perform the operation. Capture a sample once the display has settled as well, then stop the recording and export the JSON file.

| Scenario           | Useful measurements                                                                  |
| ------------------ | ------------------------------------------------------------------------------------ |
| Normal display     | Layout and visual dimensions, segment origins, and boundaries                        |
| Pinch zoom and pan | Several zoom levels, nonzero offsets, and a return to scale 1                        |
| Software keyboard  | Before, during, and after display; focused input position and viewport policy        |
| Rotation           | Portrait to landscape and back, with region order and gaps                           |
| Folding transition | Open, partially folded, and closed states, recording posture and geometry separately |

For the keyboard, try `resizes-visual`, `resizes-content`, and `overlays-content` as separate conditions. FoldLab lets you change the viewport meta setting; the recording should also note whether the browser honors it. Keep zoom enabled and include both the transition and the settled state.

When comparing boundaries, allow for the usual browser rounding of up to 1 CSS px. Keep the original measurements unchanged so the same recording can be checked again with another comparison.

The export includes the schema and library versions, user agent, notes, event timestamps, raw layout/visual/segment measurements, CSS comparisons from a bounded 4×4 probe, and the public snapshot. An available API paired with a fallback snapshot is useful information: the browser supplied a reading, but its coordinate mapping wasn't verified.

Recordings stay on the device. FoldLab retains up to 1,000 samples in memory and reports how many older samples were dropped.

## Bringing measurements into tests

Before enabling a new coordinate transform, add sanitized device recordings as test fixtures and describe the mapping and the conditions where it applies. That gives future changes a concrete reference to check against. If measurements disagree, the next step is to understand their coordinate relationship rather than choose a scale from their size ratio.

The project's checks are available with:

```sh
vp check
vp test
vp run -r build
vp run docs#validate
vp run test:package
```

They cover availability, fallback, arrangements, input isolation, synchronous reads before RAF, notification coalescing, cancellation, resubscription, SSR, hydration, and shared ownership. For the complete set, use `vp run ready`.
