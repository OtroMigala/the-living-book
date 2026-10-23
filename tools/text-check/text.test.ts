import { describe, expect, it } from 'vitest';
import { findCopies, probesOf } from './text.ts';

describe('probesOf', () => {
  it('takes the opening of each long paragraph, spaces collapsed, once', () => {
    const long = 'In the chronicles of the ancient dynasty of the Sassanidae, who reigned';
    expect(probesOf([long, long, 'Too short to tell.'], 20)).toEqual(['In the chronicles of']);
    expect(probesOf(['In  the\nchronicles   of the ancient'], 20)).toEqual([
      'In the chronicles of',
    ]);
  });
});

describe('findCopies', () => {
  const probes = probesOf(['In the chronicles of the ancient dynasty of the Sassanidae'], 30);

  it('finds a paragraph copied into a source file, even across lines', () => {
    const files = [
      { path: 'src/a.ts', text: "const s = 'In the chronicles of\n  the ancient dynasty';" },
      { path: 'src/b.ts', text: 'export const x = 1;' },
    ];
    expect(probes).toEqual(['In the chronicles of the ancie']);
    expect(findCopies(files, probes)).toEqual([{ path: 'src/a.ts', probe: probes[0] }]);
  });

  it('finds nothing in code that only handles the text', () => {
    expect(
      findCopies([{ path: 'src/c.ts', text: 'for (const b of blocks) b.text;' }], probes),
    ).toEqual([]);
  });
});
