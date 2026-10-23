import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio, readColorTokens } from './contrast.ts';

describe('contrastRatio', () => {
  it('is 21:1 for black on white and 1:1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1);
  });

  it('does not depend on the order of the colours', () => {
    expect(contrastRatio('#2b2118', '#f7f1e3')).toBeCloseTo(contrastRatio('#f7f1e3', '#2b2118'));
  });
});

// The colour tokens must keep text readable in both colour schemes (WCAG 2.2 AA: 4.5:1 for
// body text). This reads the real stylesheet, so a token change that breaks contrast fails CI.
describe('design tokens in src/styles/tokens.css', () => {
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
  const schemes = {
    light: readColorTokens(css.slice(0, darkStart)),
    dark: readColorTokens(css.slice(darkStart)),
  };
  const textPairs = [
    ['ink', 'paper'],
    ['ink-muted', 'paper'],
    ['accent', 'paper'],
    ['ink', 'notice-bg'],
    ['accent', 'notice-bg'],
  ] as const;

  for (const [scheme, tokens] of Object.entries(schemes)) {
    for (const [fg, bg] of textPairs) {
      it(`${scheme}: --${fg} on --${bg} is at least 4.5:1`, () => {
        const a = tokens[fg];
        const b = tokens[bg];
        expect(a && b).toBeTruthy();
        expect(contrastRatio(a ?? '', b ?? '')).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  // The desk does not change with the colour scheme: its tokens are set once.
  for (const fg of ['desk-ink', 'desk-ink-muted', 'desk-accent'] as const) {
    it(`--${fg} on --desk is at least 4.5:1`, () => {
      const a = schemes.light[fg];
      const b = schemes.light.desk;
      expect(a && b).toBeTruthy();
      expect(contrastRatio(a ?? '', b ?? '')).toBeGreaterThanOrEqual(4.5);
    });
  }
});
