# Spike B — Real HTML text on the 3D page

- **Stage:** 4, step 3. **Risk:** R02 (DOM text cannot be kept aligned with the 3D page, or looks soft). **Requirements:** F03 (AC1, AC2), F01 AC1, and F02 through the page turn.
- **Status:** bench built; waiting for the owner's runs on the two reference devices.
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

*Pending:* browser tests, then the owner's runs.
