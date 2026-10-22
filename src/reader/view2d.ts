/// <reference lib="dom" />
// The 2D view of the book (Stage 4, step 5b): flat pages, side by side in a spread or alone. The
// 2D mode of F09, and what the reader falls back to without WebGL.

import { chooseLayout } from './book.ts';
import type { ReaderView } from './reader.ts';

export function createView2d(element: HTMLElement): ReaderView {
  return {
    mode: '2d',
    element,
    chooseLayout: () => chooseLayout(element.clientWidth, element.clientHeight),
    show(pages, layout) {
      element.replaceChildren(...pages);
      element.dataset.pages = String(layout.pagesPerView);
      element.style.setProperty('--scale', String(layout.scale));
    },
  };
}
