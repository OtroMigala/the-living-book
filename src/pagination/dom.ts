/// <reference lib="dom" />
// The browser side of pagination (spike C): builds a page of a page class from its pieces, and
// measures whether it fits by laying it out in an invisible, untransformed box. The rules that
// decide the result are in page.css, shared with the pages the reader sees.

import type { PageClass } from '../three/contract.ts';
import { type Page, type PageBlock, wordsOf } from './paginate.ts';

/**
 * A page element with its text: what the 3D and 2D modes show, and what the measurer measures.
 * `slack` narrows the text area by that many CSS px (page.css), for measuring only.
 */
export function renderPage(
  blocks: PageBlock[],
  words: string[][],
  page: Page,
  cls: PageClass,
  slack = 0,
) {
  const section = document.createElement('section');
  section.className = 'page';
  section.dataset.class = cls;
  if (slack > 0) section.style.setProperty('--measure-slack', `${slack}px`);
  const box = document.createElement('div');
  box.className = 'page-text';
  for (const piece of page) {
    const block = blocks[piece.block];
    if (!block) continue;
    const element = document.createElement(block.type === 'heading' ? `h${block.level ?? 3}` : 'p');
    element.textContent = (words[piece.block] ?? []).slice(piece.from, piece.to).join(' ');
    // The rest of a paragraph begun on an earlier page: no first-line indent.
    if (piece.from > 0) element.classList.add('cont');
    box.append(element);
  }
  section.append(box);
  return section;
}

/** How far a laid-out page's text runs past its text area, in CSS px (0 when it fits). */
export function overflowOf(section: HTMLElement): number {
  const box = section.firstElementChild as HTMLElement;
  return Math.max(0, box.scrollHeight - box.clientHeight);
}

/**
 * A measurer for paginate(): lays each candidate page out inside `container`, `slack` px narrower
 * than it will be shown, and checks it.
 */
export function domMeasurer(
  container: HTMLElement,
  blocks: PageBlock[],
  cls: PageClass,
  slack = 0,
) {
  const words = blocks.map((b) => wordsOf(b.text));
  return {
    words,
    fits(page: Page) {
      const section = renderPage(blocks, words, page, cls, slack);
      container.replaceChildren(section);
      return overflowOf(section) === 0;
    },
    /** Lays out given pages as they are shown (no slack) and returns each one's overflow. */
    overflows(pages: Page[]) {
      return pages.map((page) => {
        const section = renderPage(blocks, words, page, cls);
        container.replaceChildren(section);
        return overflowOf(section);
      });
    },
  };
}
