# Spike B — Real HTML text on the 3D page

- **Stage:** 4, step 3. **Risk:** R02 (DOM text cannot be kept aligned with the 3D page, or looks soft). **Requirements:** F03 (AC1, AC2), F01 AC1, and F02 through the page turn.
- **Status:** the owner's first look found two bugs, now fixed; waiting for the owner's choice between the options at the end, and for the device numbers.
- **Bench:** `/lab/text/` (code: `src/three/text-lab.ts`, `src/three/page-text.ts`, `src/three/homography.ts`; the turning page from spike A).

## Question

Can the text of a page be real HTML (selectable, read by screen readers, found by the browser's search) that lies exactly on the 3D page, as sharp as ordinary web text and at 16 px or more? And what does the page show while it turns, since HTML cannot bend?

## Two ways to put HTML on a 3D page

| | A. CSS 3D transform | B. Flat overlay |
| --- | --- | --- |
| Camera at rest | Any angle | Straight down on the pages |
| The HTML page | Bent into the page's perspective with a `matrix3d` transform that maps its rectangle onto the four projected corners of the 3D page | A plain rectangle, not transformed, laid over the page |
| Why it could fail | The browser draws transformed text from a resampled image (soft); text far from the camera is smaller than 16 px | The view from above may look less three-dimensional |

Seen from straight above, a flat page projects to a rectangle the same shape as the page (all its points are at the same distance from the camera), which is why B needs no transform at all. With any tilt the rectangle becomes a trapezoid and only a projective transform can match it: A.

**Both need a texture while the page turns.** The bench paints one from the HTML itself: the browser has already placed every word, so `page-text.ts` reads each word's position with the Range API and draws it at the same place, in the same font, into a canvas. The 3D page shows that canvas while it moves; at rest the HTML takes over again. The two must match, or the reader sees the text jump at the start and the end of every turn.

The 3D page draws the paper and the HTML page is transparent, with ink-coloured text: so in both modes the paper is the same pixels, and the hand-off only changes how the letters are drawn.

## Method

- **Page sizes.** The page classes of spec 03: one 331 × 395 px page (compact) on narrow screens, a 544 × 648 px spread (regular) where it fits. The camera is placed so that the 3D page measures exactly the class size on screen: text is then drawn at its CSS size, 16 px, without scaling.
- **Alignment probe (F03 AC2).** The bench renders the two 3D pages in flat colours into an off-screen buffer at the canvas's own resolution, finds their corners in the pixels, and compares them with the HTML page's corners as the browser laid them out (zero-size markers at the corners). This checks the whole chain: projection, canvas size, pixel ratio and CSS. The probe's own resolution is ±0.5 device pixel.
- **Text size (F01 AC1).** B: the scale of the HTML page (1 means 16 px). A: the rendered height of a 16 px line at the top and the bottom of the page, from the transform.
- **Hand-off.** The browser tests take a screenshot of a page with HTML text and another with the texture, and compare where the ink is (its centroid), how much ink there is, and how many pixels differ. On the devices, a *Blink* button swaps the two every half second.
- **Cost.** Time to paint each page's texture and to upload it to the GPU, measured on the main thread.

## Decision criteria (set before the numbers, so they cannot be bent to fit)

1. **Alignment.** An approach qualifies only if, at rest, every visible page's HTML corners are within 2 CSS px of the 3D page's corners (F03 AC2), at three window sizes (360 × 688, 1280 × 720, 1920 × 1080) in the browser tests, and on both reference devices.
2. **Text size.** Body text at the default view is drawn at 16 CSS px or more (F01 AC1). For a tilted view, the smallest line on the page counts.
3. **Hand-off.** The texture's ink lands within 0.5 CSS px of the HTML's ink, and the owner sees no jump with *Blink* on either device.
4. **Sharpness.** The owner judges on both devices: at rest, the page's text looks as sharp as the reading mode's. No number stands in for the eye here.
5. **Cost.** Painting and uploading one page takes ≤ 16.7 ms on the phone, so even painting at the start of a turn costs at most one frame.
6. If both approaches qualify, the owner's rule decides: the one that looks and reads better (fidelity first).

## Results

The criteria above were written before the bench existed; the file's first commit has them without any result.

### In the browser tests (`npm run e2e`, 2026-10-22, on the owner's PC)

Not a measurement of the reference devices: Chromium draws WebGL with SwiftShader here (spike A), and Firefox and WebKit are their Windows builds. What these runs show is geometry and how each engine draws text, which does not depend on the GPU. Two window sizes for the desktop engines (1280 × 720 / 1920 × 1080), one for the phone profile.

| | Chromium | Firefox | WebKit (Playwright, Windows) | Phone profile (Chromium, 360 × 688, ×3) |
| --- | --- | --- | --- | --- |
| B: HTML corners against the 3D page's | 0 / 0 px | 0 / 0 px | 0 / 0 px | 0.33 px |
| B: the same after a turn | 0 / 0 px | 0 / 0 px | 0 / 0 px | 0.33 px |
| A at 20°: HTML corners against the 3D page's | 0.24 / 1.1 px | 0.24 / 0.53 px | **264 / 222 px** | 0.12 px |
| Text size, B | 16 px | 16 px | 16 px | 16 px |
| Text size, A at 20°: top line, bottom line | 12.7, 17.8 px / 13.5, 16.8 px | same | same | 12.7, 16.1 px |
| Hand-off: the texture's ink moved by | 0.10 px | 0.11 px | **0.54 px** | 0.18 px |
| Hand-off: pixels whose ink changes by more than a quarter | 0.03% | 0.00% | 7.84% | 6.29% |
| Hand-off: the texture's sharpness against the HTML (edge energy) | ×0.93 | ×0.84 | ×0.82 | **×0.34** |
| A at 0° against B: sharpness | ×1.00 | ×1.00 | ×1.00 | ×0.86 |
| Paint + upload, one page | 3.4–7.5 + 2.8–8.2 ms | 2–7 + 1–2 ms | 19–345 + 11–49 ms | 1.6–5.0 + 3.7–7.5 ms, on the PC's processor |

Reading them:

- **B lines up everywhere**, to within the probe's own resolution: three engines, three window sizes, before and after a turn.
- **A lines up only where the browser draws perspective.** Chromium and Firefox do (≤ 1.1 px). Playwright's WebKit on Windows draws `matrix3d` without its perspective division: the text becomes a sheared parallelogram that misses the page by 222–264 px. WebKit on Linux, in CI, draws it right (0.24 / 0.12 px, table below), so this is that Windows build, not WebKit as such. Safari on macOS and iOS cannot be checked (no Apple device among the reference devices): A depends on a feature that one build of an engine already gets wrong, which B does not use at all.
- **A cannot keep 16 px.** Tilted 20°, the far lines are drawn at 12.7–13.5 px. At 10° the top line is still 14.4 px (bench, Chromium, 1280 × 720). A page seen at an angle is foreshortened and its far edge is farther away; only a larger page would bring the top line back to 16 px, and it would not fit the screen.
- **On the desktop engines the hand-off cannot be seen in the numbers**: the texture's ink moves 0.1 px and almost no pixel changes. WebKit places its HTML glyphs differently from its canvas (0.54 px sideways), just over criterion 3.
- **On the phone the texture is softer than the HTML** (edge energy ×0.34) although it lands in the same place (0.18 px): the HTML is drawn at the screen's native ×3, the canvas at ×1.5 (BR3). Whether that shows when a turn starts and ends is for the owner's eyes on the Pova 6.
- **A at 0° looks like B on the desktop** (same sharpness); on the phone profile the transformed layer is softer (×0.86), because the browser draws a 3D-transformed element from a separate image of it.
- Painting costs a few milliseconds per page on the PC; the phone's numbers come from the owner's run.

### In CI (GitHub Actions, Linux; deploy run 39730007009)

The same tests on the CI runner. Firefox has no WebGL there, so its text tests are skipped; Chromium uses SwiftShader as on the PC.

| | Chromium | WebKit (Linux) | Phone profile |
| --- | --- | --- | --- |
| B: HTML corners against the 3D page's, also after a turn | 0 / 0 px | 0 / 0 px | 0.33 px |
| A at 20° | 0.24 / 1.1 px | **0.24 / 0.12 px** | 0.12 px |
| Hand-off: ink moved, pixels that differ, sharpness | 0.08 px, 0.00%, ×0.85 | 0.52 px, 7.42%, ×0.83 | 0.33 px, 6.85%, ×0.32 |
| A at 0° against B: pixels that differ, sharpness | 0.00%, ×1.00 | 1.23%, ×1.00 | 1.90%, ×0.83 |

WebKit places its HTML glyphs about half a pixel sideways from where its canvas draws them, on Windows and on Linux alike; criterion 3 is ≤ 0.5 px.

### Found on the way

- **Stale camera.** The tilted HTML was first 465 px off: it was placed before the frame was rendered, with the camera's previous matrices (three.js refreshes them only when it renders). The pixel probe caught it.
- **Half a pixel.** The HTML was rounded to whole pixels and the 3D page was not, which left the texture 0.5 px below the HTML and blurred it (6.7% of the pixels differed, sharpness ×0.60). The camera now moves by a fraction of a pixel so that the page starts exactly on the canvas's pixel grid: the HTML needs no rounding and each texel falls on one pixel. Alignment went from 1 px to 0 px, differing pixels from 6.7% to 0.03%.

### On the reference devices

The owner's first look (2026-10-22, in the chat; which device for each remark and the copied numbers are *pending*):

| Owner's words | Reading | What changed |
| --- | --- | --- |
| "En flat está más nítido, pero me siento mejor con tilted" | B is sharper; the owner prefers how A looks | Decision below |
| "Con textura algunas palabras se desacomodan pasando de una página a la otra" | A bug: a compound word such as *grand-vizir* can wrap after its hyphen even without hyphenation, and the painter drew it whole on the first line. It happened on pages 3 and 4, and the hand-off test compared only page 2 | Each line's part is drawn on its line. The test now compares every page by where the ink is: it fails with the old painter (ink moved 1.76 px) and passes with the new one (≤ 0.11 px) |
| "Turn de page se gira bien cuando avanzas, pero cuando retrocedes, simplemente es el mismo movimiento" | A bug: turning back played the forward turn in reverse, so the free edge led the spine | Turning back is now the mirror image of turning forward: the bend changes sign and the edge trails (`curl.ts`, with a unit test of the symmetry) |
| "B se ve bien, con blink se nota el cambio" | The hand-off shows | On the phone the texture is drawn at ×1.5 and the HTML at ×3 (sharpness ×0.27–0.34); on the PC the remaining differences are the two bugs above. To check on the owner's next run |
| "Creo que estaría bien más texto… no, déjalo así" | The amount of text stays | — |

A third bug came out of these changes: a lens control made the phone profile's toolbar taller, and the stage 521 px tall. At ratio 1.5 the canvas needed 781.5 pixels; the browser made 781 and stretched them, and the texture slid 0.51 px from the HTML. The canvas is now a whole number of its own pixels (0.51 → 0.05 px).

### Tilt and lens

Since the owner prefers the tilted view: how tall is a line of body text on screen, at the page's top and bottom lines, by tilt and lens? A longer lens (smaller field of view) stands farther back, so the near and far edges of the page are at nearly the same distance (`npm run e2e`, "text size by tilt and lens"; Chromium, 1280 × 720; the phone profile is within 0.2 px of it).

| Tilt | Lens 35° (normal) | Lens 20° (long) | Lens 12° (very long) |
| --- | --- | --- | --- |
| 5° | 15.3–16.6 px | 15.6–16.3 px | 15.7–16.2 px |
| 10° | 14.4–17.2 px | 15.0–16.5 px | 15.3–16.2 px |
| 15° | 13.6–17.5 px | 14.4–16.6 px | 14.8–16.1 px |
| 20° | 12.7–17.8 px | 13.7–16.5 px | 14.2–15.9 px |

A longer lens evens the lines out, but no lens gives 16 px at the top: tilting squeezes the page's height by about cos(tilt), and only a page larger than the screen could make up for it. F01 AC1 (≥ 16 px at the default view) holds only at 0°.

### Options for the decision (with the owner)

1. **B for reading, nothing else.** 16 px, the sharpest text, in every engine. The 3D look comes from the scene, the light and the turns.
2. **B for reading, A on request.** The default view is flat, so F01 AC1 holds; a control tilts the book for a reader who wants the 3D look, with smaller and softer text while tilted. Both ways of placing the HTML stay in the code, and the tilted one depends on the browser drawing perspective (Playwright's WebKit on Windows does not).
3. **A as the default, a small tilt with a long lens** (for example 10° with a 20° lens: 15.0–16.5 px). Needs F01 AC1 changed in the spec, accepts the softer 3D-transformed text (×0.86 on the phone profile), and the same browser dependency.

Recommendation: **2**. It keeps the requirement at the default view and the owner's preferred look one tap away. *Pending:* the owner's choice and the device numbers (paint time on the phone, criterion 5).
