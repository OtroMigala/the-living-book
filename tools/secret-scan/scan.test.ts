import { describe, expect, it } from 'vitest';
import { isTextFile, MIN_SECRET_LENGTH, scanText } from './scan.ts';

// Fake values, built at run time so this file itself never contains a token-shaped string.
const fakeContentstack = `cs${'0123456789abcdef'.repeat(2)}`;
const fakeGithub = `ghp_${'A1b2C3d4'.repeat(5)}`;
const fakeKeyHeader = ['-----BEGIN RSA', 'PRIVATE KEY-----'].join(' ');

describe('scanText', () => {
  it('finds a known secret by value and reports its name, not the value', () => {
    const secret = { name: 'CONTENTSTACK_DELIVERY_TOKEN', value: 'a-real-looking-value-123' };
    const findings = scanText(`line one\nconst t = "${secret.value}";`, 'x.js', [secret]);
    expect(findings).toEqual([
      { file: 'x.js', line: 2, rule: 'secret:CONTENTSTACK_DELIVERY_TOKEN' },
    ]);
    expect(JSON.stringify(findings)).not.toContain(secret.value);
  });

  it('ignores secret values too short to search for safely', () => {
    const short = { name: 'X', value: 'a'.repeat(MIN_SECRET_LENGTH - 1) };
    expect(scanText('a'.repeat(50), 'x.txt', [short])).toEqual([]);
  });

  it('finds token shapes without knowing the values', () => {
    const text = [`token=${fakeContentstack}`, `gh=${fakeGithub}`, fakeKeyHeader].join('\n');
    expect(scanText(text, 'leak.txt').map((f) => f.rule)).toEqual([
      'contentstack-token',
      'github-token',
      'private-key',
    ]);
  });

  it('does not flag ordinary text and hashes', () => {
    const text = 'literata-latin-400-normal.CLtNJ872.woff2 sha512-abc+/= "class": "css"';
    expect(scanText(text, 'ok.html')).toEqual([]);
  });
});

describe('isTextFile', () => {
  it('skips binaries', () => {
    expect(isTextFile('assets-src/books_with_magnifier.glb')).toBe(false);
    expect(isTextFile('dist/_astro/literata.woff2')).toBe(false);
    expect(isTextFile('dist/index.html')).toBe(true);
  });
});
