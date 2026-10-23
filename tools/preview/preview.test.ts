import { describe, expect, it } from 'vitest';
import { previewProblems } from './preview.ts';

const page = (body: string, head = '<meta name="robots" content="noindex" />') =>
  `<html><head>${head}</head><body><p class="preview-flag" role="note">Preview</p>${body}</body></html>`;

describe('previewProblems', () => {
  it('accepts a page that is noindex, flagged, and links inside the preview', () => {
    const html = page(
      '<a href="/the-living-book/preview/book/">Book</a><script src="/the-living-book/preview/_astro/a.js"></script>',
    );
    expect(previewProblems(html)).toEqual([]);
  });

  it('reports a link to the public site, where the change is not', () => {
    expect(previewProblems(page('<a href="/the-living-book/credits/">Credits</a>'))).toEqual([
      'links outside the preview: /the-living-book/credits/',
    ]);
  });

  it('reports a page that could be indexed, or does not say it is a preview', () => {
    const bare = '<html><head></head><body></body></html>';
    expect(previewProblems(bare)).toEqual(['not marked noindex', 'no preview flag']);
  });

  it('ignores links to other sites', () => {
    expect(
      previewProblems(page('<a href="https://www.gutenberg.org/ebooks/128">Text</a>')),
    ).toEqual([]);
  });
});
