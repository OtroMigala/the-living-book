// Every dependency is pinned to one exact version (constraint C04 in specs/01-vision.md).
//
// With `^1.2.3`, `npm install` on another machine may pick 1.9.0, so two installs of the same
// commit can behave differently. With `1.2.3` the version only changes in a commit that says so.
// (package-lock.json pins transitive versions; this rule covers the direct ones we choose.)

const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

const SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

export interface LooseVersion {
  section: string;
  name: string;
  range: string;
}

export function findLooseVersions(pkg: Record<string, unknown>): LooseVersion[] {
  const loose: LooseVersion[] = [];
  for (const section of SECTIONS) {
    const deps = pkg[section];
    if (typeof deps !== 'object' || deps === null) continue;
    for (const [name, range] of Object.entries(deps)) {
      if (typeof range !== 'string' || !EXACT.test(range)) {
        loose.push({ section, name, range: String(range) });
      }
    }
  }
  return loose;
}
