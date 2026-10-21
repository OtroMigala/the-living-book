import { describe, expect, it } from 'vitest';
import {
  type Criterion,
  checkTraceability,
  extractCriteria,
  extractRequirements,
  parseTables,
  type Requirement,
  splitRow,
} from './spec.ts';

describe('splitRow', () => {
  it('trims cells and drops the empty cells outside the outer pipes', () => {
    expect(splitRow('| a |  b  | c |')).toEqual(['a', 'b', 'c']);
  });

  it('keeps an escaped pipe inside its cell', () => {
    expect(splitRow('| x \\| y | z |')).toEqual(['x | y', 'z']);
  });
});

describe('parseTables', () => {
  it('finds a table only when a separator row follows the header', () => {
    const md = ['| not | a table |', '', '| A | B |', '|---|:---:|', '| 1 | 2 |', 'text'].join(
      '\n',
    );
    const tables = parseTables(md);
    expect(tables).toHaveLength(1);
    expect(tables[0]?.header).toEqual(['A', 'B']);
    expect(tables[0]?.rows).toEqual([{ cells: ['1', '2'], line: 5 }]);
  });

  it('handles Windows line endings', () => {
    expect(parseTables('| A |\r\n|---|\r\n| 1 |\r\n')[0]?.rows[0]?.cells).toEqual(['1']);
  });
});

describe('extractRequirements', () => {
  it('reads only tables with ID and Priority columns and strips emphasis', () => {
    const md = [
      '| ID | Requirement | Priority |',
      '|---|---|---|',
      '| `F01` | Read the book | **Must** |',
      '',
      '| ID | Assumption |',
      '|---|---|',
      '| A1 | ignored |',
    ].join('\n');
    expect(extractRequirements(md, 'v.md')).toEqual([
      { id: 'F01', priority: 'Must', file: 'v.md', line: 3 },
    ]);
  });
});

describe('extractCriteria', () => {
  it('returns null when there is no traceability table', () => {
    expect(extractCriteria('| A | B |\n|---|---|\n')).toBeNull();
  });

  it('maps columns by name, whatever their order', () => {
    const md = [
      '| AC | Req | Acceptance criterion | Status | Verification | Built | Verified |',
      '|---|---|---|---|---|---|---|',
      '| AC1 | F01 | Text is selectable | planned | e2e | 4 | 7 |',
    ].join('\n');
    expect(extractCriteria(md)).toEqual([
      {
        req: 'F01',
        ac: 'AC1',
        verification: 'e2e',
        built: 4,
        verified: 7,
        status: 'planned',
        line: 3,
      },
    ]);
  });
});

describe('checkTraceability', () => {
  const req = (id: string, priority = 'Must'): Requirement => ({
    id,
    priority,
    file: 'v.md',
    line: 1,
  });
  const ac = (over: Partial<Criterion> = {}): Criterion => ({
    req: 'F01',
    ac: 'AC1',
    verification: 'unit',
    built: 3,
    verified: 7,
    status: 'planned',
    line: 10,
    ...over,
  });
  const messages = (r: Requirement[], c: Criterion[] | null) =>
    checkTraceability(r, c, 't.md').map((i) => i.message);

  it('accepts a consistent pair', () => {
    expect(messages([req('F01')], [ac()])).toEqual([]);
  });

  it('reports a requirement without criteria, except Won’t', () => {
    expect(messages([req('F01'), req('F02'), req('F03', "Won't")], [ac()])).toEqual([
      'F02 has no acceptance criterion',
    ]);
  });

  it('reports a criterion whose requirement does not exist', () => {
    expect(messages([req('F01')], [ac(), ac({ req: 'F09' })])).toEqual([
      'F09/AC1: requirement F09 is not defined in any spec',
    ]);
  });

  it('reports duplicate IDs, bad priorities and bad statuses', () => {
    expect(messages([req('F01'), req('F01', 'Maybe')], [ac({ status: 'done' })])).toEqual([
      'F01 is also defined at v.md:1',
      'F01: priority "Maybe" is not one of Must, Should, Could, Won\'t',
      'F01/AC1: status "done" is not one of planned, in progress, met, not met, dropped',
    ]);
  });

  it('reports missing verification, stages out of range and verification before build', () => {
    expect(
      messages(
        [req('F01')],
        [
          ac({ verification: '' }),
          ac({ ac: 'AC2', built: 0 }),
          ac({ ac: 'AC3', built: 7, verified: 5 }),
        ],
      ),
    ).toEqual([
      'F01/AC1: no verification method',
      'F01/AC2: Built and Verified must be stages 1-8',
      'F01/AC3: verified (stage 5) before it is built (stage 7)',
    ]);
  });

  it('reports a missing traceability table', () => {
    expect(messages([req('F01')], null)).toEqual([
      'no table with columns Req, AC, Verification, Built, Verified, Status',
    ]);
  });
});
