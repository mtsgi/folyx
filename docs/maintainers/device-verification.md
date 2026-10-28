# Device verification

Use FoldLab to collect measurements and explore how a real device behaves. These are contributor notes, kept outside the public documentation site.

## Pixel 10 Pro Fold results

Normal-display measurements from October 27, 2026 exposed a rounding-related fallback in 0.1.0. Both samples are preserved in the [original regression fixture](../../packages/core/tests/fixtures/pixel-10-pro-fold-normal.json), including the fallback snapshots.

That recording has an 851 × 817 layout viewport, a visual scale of `1.0001797676086426`, and two 426 × 817 native segments extending to x = 852. Browser Provider now accepts a finite positive scale when `abs(scale - 1) * max(viewport.width, viewport.height) <= 1`, while requiring zero visual offsets and at most one CSS pixel of dimension and outer-bound discrepancy. Only overflowing edges are clamped, producing two touching regions of width 426 and 425 with `segments.source: "browser"`, `layout: "horizontal"`, and no gaps.

The [follow-up recording from October 28, 2026](../../packages/core/tests/fixtures/pixel-10-pro-fold-2026-10-28.json) confirms the fix on hardware. All 46 recorded snapshots match the snapshots returned by the current implementation using Browser Provider. The recording covers these results:

| Recorded state                            | Result                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `continuous`, scale 1, zero offsets       | The native 852 × 721 region becomes 851 × 720, with `layout: "single"` and `segments.source: "browser"`.                         |
| Change to `folded`, scale 1, zero offsets | Two native 426 × 721 regions become 426 × 720 and 425 × 720, with `layout: "horizontal"` and `segments.source: "browser"`.       |
| Zoom and pan                              | `segments.source` becomes `fallback`; `availability.segments` stays `available`.                                                 |
| Return to scale 1 and zero offsets        | The two browser regions return.                                                                                                  |
| Final scale of about 1.00667              | Scale drift exceeds the rounding budget, so fallback is expected. The layout height changes from 720 to 817 CSS px near the end. |

Regression tests replay each sample and the session in order, covering subscriber notifications, unchanged public fallback states, and the viewport height change. Raw measurements and metadata, including `scenario: "normal"` and `pixel10ProFoldVerified: false`, are preserved as exported.

Keyboard behavior, rotation, and coverage of all folding states still need hardware verification. A provisional npm release can be published before those checks are complete.

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
