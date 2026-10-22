// WCAG 2.2 contrast ratio between two colours (success criterion 1.4.3, Q05).
//
// 1. Each sRGB channel is linearized: screens apply a gamma curve, so a value of 128 is not
//    half the light of 255. Below 0.04045 the curve is a straight line, above it a 2.4 power.
// 2. Relative luminance L weights the channels by how sensitive the eye is to each:
//    green most (0.7152), then red (0.2126), then blue (0.0722).
// 3. Ratio = (L_lighter + 0.05) / (L_darker + 0.05). The 0.05 models ambient light on the screen,
//    and keeps the ratio finite for pure black. It goes from 1:1 to 21:1.

const linear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = Number.parseInt(match[1], 16);
  return 0.2126 * linear(n >> 16) + 0.7152 * linear((n >> 8) & 0xff) + 0.0722 * linear(n & 0xff);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/** Reads `--name: #rrggbb;` declarations from a block of CSS. */
export function readColorTokens(css: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const m of css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)) {
    if (m[1] && m[2]) tokens[m[1]] = m[2];
  }
  return tokens;
}
