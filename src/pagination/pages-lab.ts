/// <reference lib="dom" />
// Spike C bench (Stage 4, step 4): paginates the first chapter in both languages and both page
// classes in this browser, checks every page, and measures the time. The signature of the breaks
// lets two browsers or devices be compared at a glance. Results go to window.__pages;
// window.__pagesLab lets the browser tests lay out another browser's breaks here.

import { PAGE_CLASSES, type PageClass } from '../three/contract.ts';
import { domMeasurer, renderPage } from './dom.ts';
import {
  type Page,
  type PageBlock,
  paginate,
  signature,
  wordsOf,
  wordsOfPages,
} from './paginate.ts';

export type Lang = 'en-us' | 'es-419';
export const LANGS: Lang[] = ['en-us', 'es-419'];
export const CLASSES = Object.keys(PAGE_CLASSES) as PageClass[];

/** Measuring slack in CSS px: 0 measures pages as shown; 1 measures them 1 px narrower (page.css). */
export const SLACKS = [0, 1] as const;

export interface PagesResult {
  lang: Lang;
  pageClass: PageClass;
  slack: number;
  pages: number;
  /** Layouts the paginator asked for. */
  layouts: number;
  /** Main-thread time of the first run (cold) and of a second run (warm), ms. */
  ms: number;
  msWarm: number;
  signature: string;
  /** Every word of the chapter appears once, in order. */
  complete: boolean;
  /** Pages whose text runs past their text area, laid out again as shown (no slack). */
  overflowing: number;
  breaks: Page[];
}

export interface PagesState {
  ready: boolean;
  device: Record<string, unknown>;
  results: PagesResult[];
}

export interface PagesLab {
  /** Lays out given pages here and returns each page's overflow in CSS px. */
  overflows(lang: Lang, pageClass: PageClass, pages: Page[]): number[];
  show(lang: Lang, pageClass: PageClass): void;
}

declare global {
  interface Window {
    __pages?: PagesState;
    __pagesLab?: PagesLab;
  }
}

const round = (n: number) => Math.round(n * 100) / 100;

export async function startPagesLab(
  chapters: Record<Lang, PageBlock[]>,
  measure: HTMLElement,
  shelf: HTMLElement,
): Promise<PagesLab> {
  const state: PagesState = { ready: false, device: {}, results: [] };
  window.__pages = state;

  // The paginator must measure in Literata: wait for the pages' face (font-display: block).
  const fontStart = performance.now();
  await document.fonts.load('16px "Literata Paged"');
  const fontWait = performance.now() - fontStart;

  // Which face each style really draws with: a stack is in its fallback when it measures the same
  // as itself without its first family.
  const sample = 'The Arabian Nights, Sheherazade';
  const widthIn = (family: string) => {
    const span = document.createElement('span');
    span.style.cssText = `font: 16px ${family}; white-space: nowrap; position: absolute`;
    span.textContent = sample;
    measure.append(span);
    const width = span.getBoundingClientRect().width;
    span.remove();
    return width;
  };
  const faceOf = (variable: string) => {
    const stack = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    const fallback = stack.slice(stack.indexOf(',') + 1);
    return Math.abs(widthIn(stack) - widthIn(fallback)) < 0.5 ? 'fallback' : 'Literata';
  };

  const run = (lang: Lang, pageClass: PageClass, slack: number) => {
    const blocks = chapters[lang];
    const measurer = domMeasurer(measure, blocks, pageClass, slack);
    const start = performance.now();
    const { pages, layouts } = paginate(blocks, measurer.fits);
    const ms = performance.now() - start;
    const again = performance.now();
    paginate(blocks, measurer.fits);
    const msWarm = performance.now() - again;
    const all = blocks.flatMap((b) => wordsOf(b.text));
    const read = wordsOfPages(blocks, pages);
    const result: PagesResult = {
      lang,
      pageClass,
      slack,
      pages: pages.length,
      layouts,
      ms: round(ms),
      msWarm: round(msWarm),
      signature: signature(pages),
      complete: read.length === all.length && read.every((w, i) => w === all[i]),
      overflowing: measurer.overflows(pages).filter((px) => px > 0).length,
      breaks: pages,
    };
    measure.replaceChildren();
    return result;
  };

  for (const slack of SLACKS)
    for (const lang of LANGS)
      for (const pageClass of CLASSES) state.results.push(run(lang, pageClass, slack));

  const lab: PagesLab = {
    overflows(lang, pageClass, pages) {
      const result = domMeasurer(measure, chapters[lang], pageClass).overflows(pages);
      measure.replaceChildren();
      return result;
    },
    show(lang, pageClass) {
      const blocks = chapters[lang];
      const words = blocks.map((b) => wordsOf(b.text));
      const result = state.results.find(
        (r) => r.lang === lang && r.pageClass === pageClass && r.slack === 0,
      );
      shelf.replaceChildren(
        ...(result?.breaks ?? []).map((page, i) => {
          const figure = document.createElement('figure');
          figure.append(renderPage(blocks, words, page, pageClass));
          const caption = document.createElement('figcaption');
          caption.textContent = String(i + 1);
          figure.append(caption);
          return figure;
        }),
      );
    },
  };
  window.__pagesLab = lab;
  state.device = {
    fontInPages: faceOf('--font-page'),
    fontInReading: faceOf('--font-body'),
    fontWaitMs: round(fontWait),
    devicePixelRatio: window.devicePixelRatio,
    userAgent: navigator.userAgent,
  };
  state.ready = true;
  return lab;
}
