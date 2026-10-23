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

/**
 * A workflow that runs in Playwright's container image (ADR 0010) must use the image of the
 * @playwright/test version in package.json, pinned by digest: the image carries the browsers that
 * version drives, and a tag alone could be pushed again with other contents.
 */
export interface ImageProblem {
  file: string;
  image: string;
  problem: string;
}

const PLAYWRIGHT_IMAGE = /mcr\.microsoft\.com\/playwright:([^\s'"]+)/g;
const DIGEST = /@sha256:[0-9a-f]{64}$/;

export function checkPlaywrightImages(
  workflows: { file: string; text: string }[],
  playwright: string | undefined,
): ImageProblem[] {
  const problems: ImageProblem[] = [];
  for (const { file, text } of workflows) {
    for (const match of text.matchAll(PLAYWRIGHT_IMAGE)) {
      const image = match[1] ?? '';
      const version = /^v(\d+\.\d+\.\d+)-/.exec(image)?.[1];
      if (version !== playwright) {
        problems.push({ file, image, problem: `@playwright/test is ${playwright ?? 'missing'}` });
      }
      if (!DIGEST.test(image)) problems.push({ file, image, problem: 'not pinned by digest' });
    }
  }
  return problems;
}
