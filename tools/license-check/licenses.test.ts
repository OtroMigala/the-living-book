import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkLicenses, isAllowed, type LockPackage, readLockfile } from './licenses.ts';

describe('isAllowed', () => {
  it('accepts an OR expression when one alternative is allowed', () => {
    expect(isAllowed('MIT OR Apache-2.0', ['Apache-2.0'])).toBe(true);
    expect(isAllowed('(MIT OR CC0-1.0)', ['CC0-1.0'])).toBe(true);
  });

  it('requires every part of an AND expression', () => {
    expect(isAllowed('Apache-2.0 AND LGPL-3.0-or-later', ['Apache-2.0'])).toBe(false);
    expect(isAllowed('Apache-2.0 AND LGPL-3.0-or-later', ['Apache-2.0', 'LGPL-3.0-or-later'])).toBe(
      true,
    );
  });
});

describe('checkLicenses', () => {
  const pkg = (path: string, license: string | undefined, dev: boolean): LockPackage => ({
    path: `node_modules/${path}`,
    license,
    dev,
  });

  it('allows tool-only licenses in tools but not in shipped code', () => {
    const problems = checkLicenses([
      pkg('lightningcss', 'MPL-2.0', true),
      pkg('some-runtime', 'MPL-2.0', false),
    ]);
    expect(problems).toEqual([
      { path: 'some-runtime', license: 'MPL-2.0', reason: 'ships to the browser' },
    ]);
  });

  it('rejects strong copyleft everywhere and packages with no license', () => {
    const problems = checkLicenses([
      pkg('gpl-tool', 'GPL-3.0-only', true),
      pkg('mystery', undefined, true),
    ]);
    expect(problems.map((p) => p.path)).toEqual(['gpl-tool', 'mystery']);
  });
});

// The real lockfile must pass: this is what CI enforces.
describe('package-lock.json', () => {
  it('follows the license policy', () => {
    const packages = readLockfile(JSON.parse(readFileSync('package-lock.json', 'utf8')));
    expect(checkLicenses(packages)).toEqual([]);
  });
});
