import { describe, expect, it } from 'vitest';
import { checkPlaywrightImages, findLooseVersions } from './deps.ts';

describe('findLooseVersions', () => {
  it('accepts exact versions, including prereleases', () => {
    expect(
      findLooseVersions({ dependencies: { a: '1.2.3' }, devDependencies: { b: '2.0.0-rc.1' } }),
    ).toEqual([]);
  });

  it('reports ranges, tags, URLs and non-string values', () => {
    const pkg = {
      dependencies: { a: '^1.2.3', b: '~1.2.3', c: 'latest' },
      devDependencies: { d: 'github:user/repo', e: 1 },
    };
    expect(findLooseVersions(pkg).map((d) => d.name)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('ignores sections that are missing', () => {
    expect(findLooseVersions({ name: 'x' })).toEqual([]);
  });
});

describe('checkPlaywrightImages', () => {
  const digest = `@sha256:${'a'.repeat(64)}`;
  const workflow = (image: string) => ({
    file: 'ci.yml',
    text: `container:
  image: ${image}
`,
  });

  it('accepts the image of the installed version, pinned by digest', () => {
    const image = `mcr.microsoft.com/playwright:v1.64.0-noble${digest}`;
    expect(checkPlaywrightImages([workflow(image)], '1.64.0')).toEqual([]);
  });

  it('reports an image of another version: its browsers would not be the ones expected', () => {
    const image = `mcr.microsoft.com/playwright:v1.63.0-noble${digest}`;
    expect(checkPlaywrightImages([workflow(image)], '1.64.0')).toEqual([
      { file: 'ci.yml', image: `v1.63.0-noble${digest}`, problem: '@playwright/test is 1.64.0' },
    ]);
  });

  it('reports an image pinned by tag only', () => {
    const problems = checkPlaywrightImages(
      [workflow('mcr.microsoft.com/playwright:v1.64.0-noble')],
      '1.64.0',
    );
    expect(problems.map((p) => p.problem)).toEqual(['not pinned by digest']);
  });

  it('ignores workflows without the image', () => {
    expect(
      checkPlaywrightImages([{ file: 'seed.yml', text: 'runs-on: ubuntu-latest' }], '1.64.0'),
    ).toEqual([]);
  });
});
