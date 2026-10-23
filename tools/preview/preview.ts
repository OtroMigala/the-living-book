// The preview copy of the site (F06, ADR 0011) must stay a preview: never indexed, saying so on
// every page, and never sending the reader to the public site, where the change is not.

export const PREVIEW_BASE = '/the-living-book/preview/';

/** What is wrong with one page of the preview build. */
export function previewProblems(html: string, base = PREVIEW_BASE): string[] {
  const problems: string[] = [];
  if (!/<meta name="robots" content="noindex"/.test(html)) problems.push('not marked noindex');
  if (!/class="preview-flag"/.test(html)) problems.push('no preview flag');
  for (const m of html.matchAll(/\b(?:href|src)="(\/[^"]*)"/g)) {
    const url = m[1] ?? '';
    if (!url.startsWith(base)) problems.push(`links outside the preview: ${url}`);
  }
  return problems;
}
