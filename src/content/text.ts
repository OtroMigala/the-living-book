// Plain text → paragraphs. Source texts are hard-wrapped at about 70 columns with a blank line
// between paragraphs, and use two spaces after a full stop (typewriter style).

export function paragraphsFromText(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
}
