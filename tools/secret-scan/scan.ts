// Secret scan (C05 AC1): no token in the repository or in the build output.
//
// Two kinds of check:
//   exact     the real values of the secrets, when the job has them (the deploy job does). This is
//             the strong guarantee: if the build ever embedded a token, it is found byte for byte.
//   patterns  token shapes, for jobs without secrets (CI on pushes and pull requests).
// A finding names the file, the line and the rule, never the value.

export interface Rule {
  rule: string;
  pattern: RegExp;
}

export const PATTERNS: Rule[] = [
  // Contentstack delivery and management tokens start with "cs" followed by hex.
  { rule: 'contentstack-token', pattern: /\bcs[0-9a-f]{24,64}\b/ },
  {
    rule: 'github-token',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/,
  },
  { rule: 'private-key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

export interface KnownSecret {
  name: string;
  value: string;
}

export interface Finding {
  file: string;
  line: number;
  rule: string;
}

/** Secrets shorter than this are not searched for: a short value would match ordinary text. */
export const MIN_SECRET_LENGTH = 12;

export function scanText(text: string, file: string, secrets: KnownSecret[] = []): Finding[] {
  const findings: Finding[] = [];
  const searchable = secrets.filter((s) => s.value.length >= MIN_SECRET_LENGTH);
  text.split('\n').forEach((content, i) => {
    for (const s of searchable) {
      if (content.includes(s.value)) findings.push({ file, line: i + 1, rule: `secret:${s.name}` });
    }
    for (const { rule, pattern } of PATTERNS) {
      if (pattern.test(content)) findings.push({ file, line: i + 1, rule });
    }
  });
  return findings;
}

/** Files worth reading as text; binaries (models, fonts, images) cannot hold a pasted token. */
export const isTextFile = (path: string) =>
  !/\.(glb|gltf\.bin|woff2?|ttf|otf|png|jpe?g|webp|avif|gif|ico|ktx2|zip|gz)$/i.test(path);
