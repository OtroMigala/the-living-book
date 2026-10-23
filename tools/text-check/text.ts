// No reading text in the code (F04 AC1): the book's words come from Contentstack, so no passage of
// the content may be written into a source file. Each paragraph gives a probe, its first 40
// characters; a source file that contains a probe has copied the content.

export const PROBE_LENGTH = 40;

/** The opening of every paragraph long enough to be unmistakable, with its spaces collapsed. */
export function probesOf(paragraphs: string[], length = PROBE_LENGTH): string[] {
  const probes = paragraphs
    .map((text) => text.replace(/\s+/g, ' ').trim())
    .filter((text) => text.length >= length)
    .map((text) => text.slice(0, length));
  return [...new Set(probes)];
}

export interface Copied {
  path: string;
  probe: string;
}

/** Every source file that contains a probe, with the first probe found in it. */
export function findCopies(files: { path: string; text: string }[], probes: string[]): Copied[] {
  const copies: Copied[] = [];
  for (const { path, text } of files) {
    const flat = text.replace(/\s+/g, ' ');
    const probe = probes.find((p) => flat.includes(p));
    if (probe) copies.push({ path, probe });
  }
  return copies;
}
