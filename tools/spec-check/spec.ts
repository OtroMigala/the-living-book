// Keeps the specs honest: every requirement needs at least one acceptance criterion with a way to
// verify it, and every criterion must point to a requirement that still exists.
//
// A traceability table only helps while it is true. Without a check, a requirement added in
// Stage 4 without criteria, or a criterion left behind after a rename, is found at Stage 7 (or
// never). With the check, CI fails on the commit that broke it.
//
// Everything here is pure (strings in, data out); cli.ts does the file I/O.

export interface Row {
  cells: string[];
  /** 1-based line number in the source file, for error messages. */
  line: number;
}

export interface Table {
  header: string[];
  rows: Row[];
}

export interface Requirement {
  id: string;
  priority: string;
  file: string;
  line: number;
}

export interface Criterion {
  req: string;
  ac: string;
  verification: string;
  built: number;
  verified: number;
  status: string;
  line: number;
}

export interface Issue {
  file: string;
  line: number;
  message: string;
}

export const PRIORITIES = ['Must', 'Should', 'Could', "Won't"] as const;
export const STATUSES = ['planned', 'in progress', 'met', 'not met', 'dropped'] as const;
/** Stages of the core loop in workflow-playbook-v0.md, 1 (requirements) to 8 (standardize). */
export const FIRST_STAGE = 1;
export const LAST_STAGE = 8;

const ID_PATTERN = /^[A-Z]\d{2}$/;
const AC_PATTERN = /^AC\d+$/;
const SEPARATOR_CELL = /^:?-{3,}:?$/;

const isRowLine = (line: string) => {
  const t = line.trim();
  return t.length > 1 && t.startsWith('|') && t.endsWith('|');
};

/** Splits `| a | b \| c |` into ['a', 'b | c']. An escaped pipe stays inside its cell. */
export function splitRow(line: string): string[] {
  const t = line.trim();
  const cells: string[] = [];
  let cell = '';
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '\\' && t[i + 1] === '|') {
      cell += '|';
      i++;
    } else if (ch === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  // The leading and trailing pipes produce one empty cell at each end.
  return cells.slice(1, -1);
}

/** Finds GitHub-style tables: a header row, a separator row (`|---|`), then body rows. */
export function parseTables(markdown: string): Table[] {
  const lines = markdown.split(/\r?\n/);
  const tables: Table[] = [];
  let i = 0;
  while (i < lines.length - 1) {
    const head = lines[i] ?? '';
    const separator = lines[i + 1] ?? '';
    const isTableStart =
      isRowLine(head) &&
      isRowLine(separator) &&
      splitRow(separator).every((c) => SEPARATOR_CELL.test(c));
    if (!isTableStart) {
      i++;
      continue;
    }
    const table: Table = { header: splitRow(head), rows: [] };
    i += 2;
    while (i < lines.length && isRowLine(lines[i] ?? '')) {
      table.rows.push({ cells: splitRow(lines[i] ?? ''), line: i + 1 });
      i++;
    }
    tables.push(table);
  }
  return tables;
}

/** Removes Markdown emphasis and code marks, so `**Must**` and `Must` mean the same. */
const plain = (cell: string | undefined) => (cell ?? '').replace(/[*`]/g, '').trim();

const column = (table: Table, name: string) => table.header.findIndex((h) => plain(h) === name);

/** Requirement tables are the ones whose header has both `ID` and `Priority`. */
export function extractRequirements(markdown: string, file: string): Requirement[] {
  const found: Requirement[] = [];
  for (const table of parseTables(markdown)) {
    const id = column(table, 'ID');
    const priority = column(table, 'Priority');
    if (id < 0 || priority < 0) continue;
    for (const row of table.rows) {
      found.push({
        id: plain(row.cells[id]),
        priority: plain(row.cells[priority]),
        file,
        line: row.line,
      });
    }
  }
  return found;
}

const TRACE_COLUMNS = ['Req', 'AC', 'Verification', 'Built', 'Verified', 'Status'] as const;

/** The traceability table is the one whose header has every column in TRACE_COLUMNS. */
export function extractCriteria(markdown: string): Criterion[] | null {
  for (const table of parseTables(markdown)) {
    const index = TRACE_COLUMNS.map((name) => column(table, name));
    if (index.some((i) => i < 0)) continue;
    const [req, ac, verification, built, verified, status] = index;
    return table.rows.map((row) => ({
      req: plain(row.cells[req ?? -1]),
      ac: plain(row.cells[ac ?? -1]),
      verification: plain(row.cells[verification ?? -1]),
      // Number('') is 0 and Number('x') is NaN: both fail the stage range check below.
      built: Number(plain(row.cells[built ?? -1])),
      verified: Number(plain(row.cells[verified ?? -1])),
      status: plain(row.cells[status ?? -1]),
      line: row.line,
    }));
  }
  return null;
}

const isStage = (n: number) => Number.isInteger(n) && n >= FIRST_STAGE && n <= LAST_STAGE;

export function checkTraceability(
  requirements: Requirement[],
  criteria: Criterion[] | null,
  traceFile: string,
): Issue[] {
  const issues: Issue[] = [];
  const known = new Map<string, Requirement>();

  for (const r of requirements) {
    const at = { file: r.file, line: r.line };
    if (!ID_PATTERN.test(r.id)) {
      issues.push({ ...at, message: `"${r.id}" is not a requirement ID (letter + 2 digits)` });
    } else if (known.has(r.id)) {
      const first = known.get(r.id);
      issues.push({ ...at, message: `${r.id} is also defined at ${first?.file}:${first?.line}` });
    } else {
      known.set(r.id, r);
    }
    if (!(PRIORITIES as readonly string[]).includes(r.priority)) {
      issues.push({
        ...at,
        message: `${r.id}: priority "${r.priority}" is not one of ${PRIORITIES.join(', ')}`,
      });
    }
  }

  if (criteria === null) {
    issues.push({
      file: traceFile,
      line: 1,
      message: `no table with columns ${TRACE_COLUMNS.join(', ')}`,
    });
    return issues;
  }

  const covered = new Set<string>();
  const seen = new Set<string>();
  for (const c of criteria) {
    const at = { file: traceFile, line: c.line };
    const key = `${c.req}/${c.ac}`;
    if (!known.has(c.req)) {
      issues.push({ ...at, message: `${key}: requirement ${c.req} is not defined in any spec` });
    }
    if (!AC_PATTERN.test(c.ac)) {
      issues.push({ ...at, message: `${key}: "${c.ac}" is not a criterion ID (AC + number)` });
    }
    if (seen.has(key)) issues.push({ ...at, message: `${key} appears twice` });
    seen.add(key);
    if (c.verification === '') issues.push({ ...at, message: `${key}: no verification method` });
    if (!isStage(c.built) || !isStage(c.verified)) {
      issues.push({
        ...at,
        message: `${key}: Built and Verified must be stages ${FIRST_STAGE}-${LAST_STAGE}`,
      });
    } else if (c.verified < c.built) {
      issues.push({
        ...at,
        message: `${key}: verified (stage ${c.verified}) before it is built (stage ${c.built})`,
      });
    }
    if (!(STATUSES as readonly string[]).includes(c.status)) {
      issues.push({
        ...at,
        message: `${key}: status "${c.status}" is not one of ${STATUSES.join(', ')}`,
      });
    }
    covered.add(c.req);
  }

  for (const r of known.values()) {
    if (r.priority !== "Won't" && !covered.has(r.id)) {
      issues.push({ file: r.file, line: r.line, message: `${r.id} has no acceptance criterion` });
    }
  }
  return issues;
}

/** Counts used in the gate summary and the metrics ledger. */
export function summarize(requirements: Requirement[], criteria: Criterion[]) {
  const byPriority: Record<string, number> = {};
  for (const r of requirements) byPriority[r.priority] = (byPriority[r.priority] ?? 0) + 1;
  const byStatus: Record<string, number> = {};
  for (const c of criteria) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
  return { requirements: requirements.length, criteria: criteria.length, byPriority, byStatus };
}
