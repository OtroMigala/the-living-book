/// <reference lib="dom" />
// The pagination pass of the build (ADR 0009). The page /paginate/ runs it in Firefox, driven by
// tools/paginate/cli.ts: every chapter, in both languages and both page classes, measured 1 px
// narrower than shown, in Literata. It also checks its own work, so a page that overflows or a
// word that goes missing fails the build instead of reaching a reader.

import type { PageClass } from '../three/contract.ts';
import { domMeasurer, MEASURE_SLACK } from './dom.ts';
import { hashOf, type Page, type PageBlock, paginate, wordsOf, wordsOfPages } from './paginate.ts';

/** The breaks of one chapter, and the hash of the blocks they were measured on. */
export interface ChapterPages {
  /** If the content changes, the hash no longer matches and the reader paginates by itself. */
  hash: string;
  compact: Page[];
  regular: Page[];
}

export interface BuildPass {
  /** The face the pages were measured in; anything but Literata fails the build. */
  font: string;
  slack: number;
  books: Record<string, Record<string, ChapterPages>>;
  problems: string[];
  layouts: number;
  ms: number;
}

declare global {
  interface Window {
    __buildPass?: BuildPass;
  }
}

const CLASSES: PageClass[] = ['compact', 'regular'];

/** Whether a font stack is drawn in its first face or in its fallback. */
function faceOf(stack: string, measure: HTMLElement) {
  const widthIn = (family: string) => {
    const span = document.createElement('span');
    span.style.cssText = `font: 16px ${family}; white-space: nowrap; position: absolute`;
    span.textContent = 'The Arabian Nights, Sheherazade';
    measure.append(span);
    const width = span.getBoundingClientRect().width;
    span.remove();
    return width;
  };
  return Math.abs(widthIn(stack) - widthIn(stack.slice(stack.indexOf(',') + 1))) < 0.5
    ? 'fallback'
    : 'Literata';
}

export async function runBuildPass(
  books: Record<string, Record<string, PageBlock[]>>,
  measure: HTMLElement,
) {
  const start = performance.now();
  await document.fonts.load('16px "Literata Paged"');
  const stack = getComputedStyle(document.documentElement).getPropertyValue('--font-page').trim();
  const pass: BuildPass = {
    font: faceOf(stack, measure),
    slack: MEASURE_SLACK,
    books: {},
    problems: [],
    layouts: 0,
    ms: 0,
  };
  if (pass.font !== 'Literata') pass.problems.push('pages were measured in a fallback font');

  for (const [locale, chapters] of Object.entries(books)) {
    pass.books[locale] = {};
    for (const [chapter, blocks] of Object.entries(chapters)) {
      const pages = {} as Record<PageClass, Page[]>;
      for (const cls of CLASSES) {
        const measurer = domMeasurer(measure, blocks, cls, MEASURE_SLACK);
        const result = paginate(blocks, measurer.fits);
        pass.layouts += result.layouts;
        const name = `${locale} ${chapter} ${cls}`;
        const all = blocks.flatMap((b) => wordsOf(b.text));
        const read = wordsOfPages(blocks, result.pages);
        if (read.length !== all.length || read.some((w, i) => w !== all[i])) {
          pass.problems.push(`${name}: words lost, repeated or out of order`);
        }
        const over = measurer.overflows(result.pages).filter((px) => px > 0).length;
        if (over > 0) pass.problems.push(`${name}: ${over} page(s) overflow as shown`);
        pages[cls] = result.pages;
      }
      pass.books[locale][chapter] = { hash: hashOf(blocks), ...pages };
    }
  }
  measure.replaceChildren();
  pass.ms = Math.round(performance.now() - start);
  window.__buildPass = pass;
}
