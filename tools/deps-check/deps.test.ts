import { describe, expect, it } from 'vitest';
import { findLooseVersions } from './deps.ts';

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
