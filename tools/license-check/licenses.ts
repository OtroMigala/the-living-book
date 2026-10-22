// License check (C02 AC1). Every package in package-lock.json, including the transitive ones and the
// optional platform builds that only install on other systems, is checked against the policy in
// ADR 0005:
//
//   shipped   packages reachable from `dependencies`: their files reach the reader's browser
//   tools     packages reachable only from `devDependencies`: build and test tools, never shipped
//
// npm records each package's SPDX license expression in the lockfile, so no network is needed.

/** Allowed anywhere, including code and assets that ship (C02; OFL for fonts since 2026-10-21). */
export const SHIPPED_OK = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'Zlib',
  'CC0-1.0',
  'CC-BY-4.0',
  'OFL-1.1',
];

/** Allowed only in tools that never ship, unmodified (ADR 0005). */
export const TOOLS_ONLY = ['MPL-2.0', 'LGPL-3.0-or-later', 'BlueOak-1.0.0', '0BSD'];

export interface LockPackage {
  path: string;
  license: string | undefined;
  dev: boolean;
}

export interface LicenseProblem {
  path: string;
  license: string;
  reason: string;
}

/**
 * Evaluates a simple SPDX expression: `A OR B` is allowed if either side is, `A AND B` only if
 * both are. Parentheses are flattened, which is enough for the expressions npm packages use.
 */
export function isAllowed(expression: string, allowed: readonly string[]): boolean {
  const flat = expression.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  return flat
    .split(/ OR /i)
    .some((alternative) => alternative.split(/ AND /i).every((id) => allowed.includes(id.trim())));
}

export function readLockfile(lock: unknown): LockPackage[] {
  const packages = (lock as { packages?: Record<string, { license?: string; dev?: boolean }> })
    .packages;
  if (!packages) throw new Error('package-lock.json has no "packages" section (lockfile v2 or v3)');
  return Object.entries(packages)
    .filter(([path]) => path !== '')
    .map(([path, meta]) => ({ path, license: meta.license, dev: meta.dev === true }));
}

export function checkLicenses(packages: LockPackage[]): LicenseProblem[] {
  const problems: LicenseProblem[] = [];
  for (const p of packages) {
    const name = p.path.replace(/^.*node_modules\//, '');
    if (!p.license) {
      problems.push({ path: name, license: '(none)', reason: 'no license recorded' });
    } else if (p.dev) {
      if (!isAllowed(p.license, [...SHIPPED_OK, ...TOOLS_ONLY])) {
        problems.push({ path: name, license: p.license, reason: 'not allowed, even for tools' });
      }
    } else if (!isAllowed(p.license, SHIPPED_OK)) {
      problems.push({ path: name, license: p.license, reason: 'ships to the browser' });
    }
  }
  return problems;
}

/** Package counts per license, split into shipped and tools, for the report. */
export function countByLicense(packages: LockPackage[]) {
  const counts: Record<string, { shipped: number; tools: number }> = {};
  for (const p of packages) {
    const key = p.license ?? '(none)';
    counts[key] ??= { shipped: 0, tools: 0 };
    counts[key][p.dev ? 'tools' : 'shipped']++;
  }
  return counts;
}
