/// <reference lib="dom" />
// Paints a laid-out HTML page into a canvas, for the 3D page to show while it turns (spike B):
// HTML cannot bend, a texture can. The browser has already decided where every word goes; this
// reads each word's box with the Range API and draws the word at the same place in the same font,
// so the texture matches the HTML it stands in for, line breaks and spacing included.
//
// Only the ink's coverage is kept (the alpha channel): the 3D page mixes its own paper and ink
// colours with it, so paper and ink are the same in both modes and only the drawing of the letters
// changes when the HTML hands over to the texture.

export interface PaintResult {
  words: number;
  /** Main-thread time to read the layout and draw, in ms. */
  ms: number;
}

/**
 * Paints `source` into `canvas` at `scale` device pixels per CSS px. `source` must be laid out at
 * `width` × `height` CSS px and not transformed, or the word boxes would be transformed too.
 */
export function paintPageText(
  source: HTMLElement,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  scale: number,
): PaintResult {
  const start = performance.now();
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const scaleY = canvas.height / height;
  ctx.setTransform(canvas.width / width, 0, 0, scaleY, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#000';
  // The same shaping as the page's CSS (text-rendering: optimizeLegibility, kerning on).
  ctx.fontKerning = 'normal';
  ctx.textRendering = 'optimizeLegibility';

  const origin = source.getBoundingClientRect();
  const range = document.createRange();
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
  let words = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (!text.parentElement) continue;
    const style = getComputedStyle(text.parentElement);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    // A word's box starts at the top of the font's ascent, so its baseline is that far below.
    const ascent = ctx.measureText(text.data).fontBoundingBoxAscent;
    for (const word of text.data.matchAll(/\S+/g)) {
      range.setStart(text, word.index);
      range.setEnd(text, word.index + word[0].length);
      // One box per word: these pages are not hyphenated, so no word is split across two lines.
      const box = range.getClientRects()[0];
      if (!box) continue;
      // Browsers put a line's baseline on a whole device pixel (glyphs move in fractions of a
      // pixel only sideways); do the same, or the texture's text sits up to half a pixel off.
      const baseline = Math.round((box.top - origin.top + ascent) * scaleY) / scaleY;
      ctx.fillText(word[0], box.left - origin.left, baseline);
      words++;
    }
  }
  return { words, ms: performance.now() - start };
}
