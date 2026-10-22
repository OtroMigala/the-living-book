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
      for (const piece of linePieces(text, word.index, word[0].length, range)) {
        // Browsers put a line's baseline on a whole device pixel (glyphs move in fractions of a
        // pixel only sideways); do the same, or the texture's text sits up to half a pixel off.
        const baseline = Math.round((piece.top - origin.top + ascent) * scaleY) / scaleY;
        ctx.fillText(piece.text, piece.left - origin.left, baseline);
      }
      words++;
    }
  }
  return { words, ms: performance.now() - start };
}

interface Piece {
  text: string;
  left: number;
  top: number;
}

/**
 * The part of a word on each line it occupies. Usually the whole word on one line; but a compound
 * word ("grand-vizir") or a dash can be broken across two lines even without hyphenation, and then
 * each part must be drawn on its own line, where its first letter is.
 */
function linePieces(text: Text, start: number, length: number, range: Range): Piece[] {
  const end = start + length;
  range.setStart(text, start);
  range.setEnd(text, end);
  const boxes = range.getClientRects();
  const first = boxes[0];
  if (!first) return [];
  if (boxes.length === 1)
    return [{ text: text.data.slice(start, end), left: first.left, top: first.top }];
  const pieces: Piece[] = [];
  let pieceStart = start;
  let pieceBox: DOMRect | undefined;
  for (let i = start; i < end; i++) {
    range.setStart(text, i);
    range.setEnd(text, i + 1);
    const letter = range.getClientRects()[0];
    if (!letter) continue;
    if (pieceBox && Math.abs(letter.top - pieceBox.top) < letter.height / 2) continue;
    if (pieceBox)
      pieces.push({ text: text.data.slice(pieceStart, i), left: pieceBox.left, top: pieceBox.top });
    pieceStart = i;
    pieceBox = letter;
  }
  if (pieceBox)
    pieces.push({ text: text.data.slice(pieceStart, end), left: pieceBox.left, top: pieceBox.top });
  return pieces;
}
