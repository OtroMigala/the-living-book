# ADR 0008 — HTML text on the 3D page: flat for reading, tilted by the mouse wheel

- **Status:** accepted by the owner, 2026-10-22: option 2 of spike B, with the tilt on the mouse wheel instead of a button ("es técnicamente la 2, pero […] que sea la rueda del ratón la que controle la inclinación con un movimiento suave"). The touch and keyboard equivalents below, proposed by the agent, were confirmed by the owner the same day ("me parece bien los equivalentes táctil y demás").
- **Stage:** 4, step 3
- **Evidence:** [spike B report](../spikes/B-page-text.md): browser tests in three engines and three window sizes, and the owner's runs on both reference devices

## Context

F03 asks for page text that is real HTML (selectable, read by screen readers, found by the browser's search) lying on the 3D page; F01 AC1 asks for body text of at least 16 CSS px at the default view. Risk R02 (score 9) was that the HTML could not be kept on the page, or would look soft. Spike B compared two ways, with criteria set before measuring:

- **B, flat:** the camera looks straight down, so the page projects to a rectangle and the HTML is a plain, untransformed rectangle over it.
- **A, tilted:** the camera looks at an angle and the HTML is mapped onto the projected page with a CSS `matrix3d` (a homography from the page's four corners).

Both need a texture painted from the HTML while a page turns, because HTML cannot bend.

## Measurements

| Criterion | B (flat) | A (tilted) |
| --- | --- | --- |
| 1. HTML corners against the 3D page, ≤ 2 CSS px | 0–0.47 px everywhere: three engines, three sizes, after turns; 0.47 px on the Pova 6 | 0.12–1.1 px in Chromium, Firefox and WebKit on Linux; 0.93 px in Edge on the PC at 40°; 222–264 px in Playwright's WebKit on Windows, which draws `matrix3d` without perspective |
| 2. Body text ≥ 16 px | 16 px | Below 16 px at the top line at every tilt: 15.3 px at 5°, 12.7 px at 20°, 9.6 px at 40° (35° lens); a long lens evens the lines, but tilting squeezes the page's height by about cos(tilt) |
| 3. Texture lands within 0.5 px of the HTML; no jump with *Blink* | ≤ 0.11 px (Chromium, Firefox), ≤ 0.13 px (phone profile in CI), 0.46–0.54 px (WebKit). Owner: "se ve bien en ambos" once two painter bugs were fixed | Same textures |
| 4. Sharpness, by the owner's eye | "En flat está más nítido" | Softer: the browser draws a 3D-transformed element from a separate image of it |
| 5. Paint + upload ≤ 16.7 ms per page on the phone | 3.9–9.5 ms on the Pova 6; 2.3–5.9 ms on the PC | Same |

A page turn with four textured faces ran at the display's rate on both devices: frame p95 11.2 ms on the Pova 6 (90 Hz), 5.1 ms on the PC (200 Hz).

## Decision

1. **The reading view is flat (B).** At rest the camera looks straight down; each HTML page is an untransformed rectangle laid exactly over its 3D page. The camera moves by a fraction of a pixel so the page starts on the canvas's pixel grid, and the canvas is a whole number of its own pixels: then the HTML needs no rounding and each texel of a page texture falls on one pixel. This is the default view, so F01 AC1 holds.
2. **The reader can tilt the book (A) with the mouse wheel** (a trackpad's scroll is the same event), easing smoothly to the new angle, up to 40° (the angle the owner tried). No button: the interface stays minimal. While tilted, the HTML pages carry the homography as a `matrix3d`; back at 0° they return to plain rectangles. Equivalents (confirmed by the owner): on touch screens a vertical drag on the desk outside the pages; on the keyboard ↑ and ↓ while the book has focus (Q05 AC2 asks every action to work by keyboard). With reduced motion the angle changes without easing (Q05 AC3).
3. **While a page turns, every visible face is a texture** painted from the HTML (`page-text.ts`): each word drawn where the browser put it, each line's part of a word broken across lines on its own line. Turning back is the mirror image of turning forward (ADR 0007's bend with its sign flipped).
4. **Fail-soft for tilting.** A browser that draws `matrix3d` without its perspective (seen in Playwright's WebKit on Windows) reports its corners wrongly in the same way; the reader reads back one corner of a tilted page, and if it is more than 2 px from where the 3D page is, shows the page's texture while tilted instead of misplaced HTML (Q07).

**Rejected:** A as the default view (no tilt keeps 16 px at the top line); B alone (the owner prefers how the tilted book looks, and option 2 keeps that one gesture away).

## Consequences

- R02 is retired with this evidence.
- Both ways of placing the HTML stay in the code, and the tilt adds an input (new requirement F16 in spec 01).
- Tilted text is smaller (down to 9.6 px at the top line at 40°): the reader's choice, never the default.
- **The HTML and the textures must use the same font.** On the owner's PC the HTML was drawn in the fallback font (`fontInHtml: "fallback"`): with `font-display: optional` a font that arrives late is skipped for the whole page view, and the page breaks changed with it (209, 253, 222, 239 words on the four pages against 205, 244, 206, 204 with Literata). This is risk R03's early signal; spike C (pagination) must make the book's pages wait for Literata.
- The phone's run was in Chrome's "desktop site" mode (a 980 px wide viewport): the canvas filled 4.0 million pixels at ratio 1.5, about seven times what a 360 px viewport would, and still turned pages at 90 frames per second. Evidence for the BR3 review at the Stage 4 gate, not a change here.
