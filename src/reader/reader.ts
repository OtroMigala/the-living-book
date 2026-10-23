/// <reference lib="dom" />
// The reader (Stage 4, step 5): the book as pages, a spread or one page depending on the window,
// with the breaks the build measured (ADR 0009). It starts from the article in the page, which is
// the reading mode's HTML (F10, F15): without JavaScript that article is what one reads.
//
// It keeps the address on the page being read (F08), turns with the buttons and the keyboard
// (F02 AC1, Q05 AC2), announces each page, and checks every page it shows: if one overflows in
// this browser, it paginates the book itself, in steps, and keeps the reader's place. How the
// pages are shown is a view's job: flat pages (view2d.ts) or the 3D desk (view3d.ts).

import type { ChapterPages } from '../pagination/build-pass.ts';
import { domMeasurer, MEASURE_SLACK, overflowOf, renderPage } from '../pagination/dom.ts';
import {
  hashOf,
  type Page,
  type PageBlock,
  paginateInSteps,
  wordsOf,
} from '../pagination/paginate.ts';
import type { PageClass } from '../three/contract.ts';
import {
  addressOf,
  type BookPage,
  bookPages,
  type Chapter,
  lengthsFromPages,
  lengthsOf,
  type Position,
  pageAt,
  parseAddress,
  positionOf,
  type ReaderLayout,
  translatePosition,
  turnFrom,
  viewOf,
} from './book.ts';
import { completes, isTap, progressOf, type Step, TAP_PX } from './gesture.ts';

/** How the pages are shown. The reader builds the page elements; the view lays them out. */
export interface ReaderView {
  mode: '2d' | '3d';
  /** The element whose size the layout follows. */
  element: HTMLElement;
  /** The page class and pages per view that fit the space the view has now. */
  chooseLayout(): ReaderLayout;
  /** Shows a view's pages at rest, left to right; a blank page has the class "blank". */
  show(pages: HTMLElement[], layout: ReaderLayout): void;
  /** Animates a turn from the pages on screen to the next view's; show() follows it. */
  turn?(from: HTMLElement[], to: HTMLElement[], step: 1 | -1, layout: ReaderLayout): Promise<void>;
  /** Starts a turn that a drag moves; show() follows end(). Without it, a drag has no feedback. */
  beginTurn?(
    from: HTMLElement[],
    to: HTMLElement[],
    step: 1 | -1,
    layout: ReaderLayout,
  ): TurnControl;
  /** Stops or resumes the view's own input and drawing when another view takes its place. */
  setActive?(active: boolean): void;
}

/** A turn in a reader's hands: set() follows the pointer, end() completes or falls back. */
export interface TurnControl {
  set(progress: number): void;
  end(complete: boolean): Promise<void>;
}

export interface ReaderState {
  ready: boolean;
  mode: '2d' | '3d';
  /** Where the pages came from: the build's breaks, or this browser's own pagination. */
  source: 'build' | 'browser';
  pageClass: PageClass;
  pagesPerView: 1 | 2;
  scale: number;
  /** The first page of the view on screen. */
  page: number;
  total: number;
  /** Pages on screen whose text runs past their text area. */
  overflowing: number;
  /** The place an address asked for, when it named another page class or language. */
  target: Position | null;
  targetOnScreen: boolean | null;
  /** The text on screen: from its first word to its last. */
  span: { first: Position; last: Position } | null;
  /** A signature of the page breaks in use: the same text, page class and breaks sign the same. */
  breaks: string;
}

declare global {
  interface Window {
    __reader?: ReaderState;
  }
}

interface Breaks {
  engine: string;
  slack: number;
  books: Record<string, Record<string, ChapterPages>>;
}

/** A chapter of the article, with the id of each block's element there (title first). */
export interface ArticleChapter extends Chapter {
  anchors: string[];
}

/** The chapters of the article in the page, as the build paginated them: title, then blocks. */
export function chaptersFrom(article: HTMLElement): ArticleChapter[] {
  return [...article.querySelectorAll<HTMLElement>('section[aria-labelledby]')].map((section) => {
    const title = section.querySelector('h2');
    const blocks: PageBlock[] = [{ type: 'heading', text: title?.textContent ?? '', level: 2 }];
    const anchors = [title?.id ?? ''];
    for (const el of section.querySelectorAll<HTMLElement>('[data-block]')) {
      // Same shape as the content model's blocks, so the hash matches the build's.
      blocks.push({
        type: el.tagName === 'H3' ? 'heading' : 'paragraph',
        text: el.textContent ?? '',
      });
      anchors.push(el.id);
    }
    return { id: title?.id.replace(/^chapter-/, '') ?? '', blocks, anchors };
  });
}

export interface ReaderElements {
  root: HTMLElement;
  view: ReaderView;
  /** Invisible: pages are measured here. */
  measure: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
  /** "Page 3 of 16", read out by screen readers when it changes. */
  where: HTMLElement;
  /** The link to the same place in the other language. */
  switchLink: HTMLAnchorElement | null;
  /** The link to the same place in the reading mode, the article (F09). */
  articleLink: HTMLAnchorElement | null;
  article: HTMLElement;
}

/** What the page can do with a started reader. */
export interface Reader {
  state: ReaderState;
  /** Shows the book in another view (F09), at the same place in the text. */
  useView(view: ReaderView): Promise<void>;
}

export interface ReaderText {
  /** With {n} and {total}. */
  pageOf: string;
  /** With {a}, {b} and {total}. */
  pagesOf: string;
  /** With {n}. */
  pageLabel: string;
}

export interface ReaderOptions {
  locale: string;
  otherLocale: string;
  /** The other language's book page, without an address. */
  otherHref: string;
  base: string;
  text: ReaderText;
}

const fill = (template: string, values: Record<string, number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

export async function startReader(el: ReaderElements, options: ReaderOptions): Promise<Reader> {
  const chapters = chaptersFrom(el.article);
  let view = el.view;
  const words = chapters.map((c) => c.blocks.map((b) => wordsOf(b.text)));
  // Pages are laid out in Literata only (spec 03): wait for the pages' face before anything.
  await document.fonts.load('16px "Literata Paged"');

  const params = new URLSearchParams(location.search);
  const breaks: Breaks | null =
    params.get('paginate') === 'browser'
      ? null
      : await fetch(`${options.base}pages/breaks.json`)
          .then((r) => (r.ok ? (r.json() as Promise<Breaks>) : null))
          .catch(() => null);

  /** The build's pages for a locale and class, or null if they were measured on other text. */
  const built = (locale: string, cls: PageClass, check: Chapter[] | null): Page[][] | null => {
    const book = breaks?.books[locale];
    if (!book) return null;
    const entries = Object.entries(book);
    // The same chapters, in the same order, with the same text (hash) as the article here.
    const stale =
      check !== null &&
      (entries.length !== check.length ||
        entries.some(
          ([id, chapter], i) => id !== check[i]?.id || chapter.hash !== hashOf(check[i]?.blocks),
        ));
    return stale ? null : entries.map(([, chapter]) => chapter[cls]);
  };

  const state: ReaderState = {
    ready: false,
    mode: view.mode,
    source: 'build',
    pageClass: 'regular',
    pagesPerView: 2,
    scale: 1,
    page: 1,
    total: 0,
    overflowing: 0,
    target: null,
    targetOnScreen: null,
    span: null,
    breaks: '',
  };
  window.__reader = state;

  // This book's pages per class, from the build when they match the text, else measured here.
  const cache = new Map<PageClass, { pages: BookPage[]; source: 'build' | 'browser' }>();
  const paginateHere = async (cls: PageClass) => {
    const result: Page[][] = [];
    for (const chapter of chapters) {
      const measurer = domMeasurer(el.measure, chapter.blocks, cls, MEASURE_SLACK);
      result.push((await paginateInSteps(chapter.blocks, measurer.fits)).pages);
    }
    el.measure.replaceChildren();
    const entry = { pages: bookPages(result), source: 'browser' as const };
    cache.set(cls, entry);
    return entry;
  };
  const pagesFor = async (cls: PageClass) => {
    const cached = cache.get(cls);
    if (cached) return cached;
    const fromBuild = built(options.locale, cls, chapters);
    if (!fromBuild) return paginateHere(cls);
    const entry = { pages: bookPages(fromBuild), source: 'build' as const };
    cache.set(cls, entry);
    return entry;
  };

  const blankPage = (cls: PageClass) => {
    const section = renderPage([], [], [], cls);
    section.setAttribute('aria-hidden', 'true');
    section.classList.add('blank');
    return section;
  };

  let layout: ReaderLayout = view.chooseLayout();
  let pages: BookPage[] = [];
  let shownPages: HTMLElement[] = [];

  /** Where the address of the other language points: the same place, in its own pages. */
  const updateSwitch = (at: Position) => {
    if (!el.switchLink) return;
    const otherPages = built(options.otherLocale, layout.pageClass, null);
    const ownPages = built(options.locale, layout.pageClass, null);
    if (!otherPages || !ownPages) {
      el.switchLink.href = options.otherHref;
      return;
    }
    const there = translatePosition(at, lengthsOf(chapters), lengthsFromPages(otherPages));
    const n = pageAt(bookPages(otherPages), there);
    el.switchLink.href = `${options.otherHref}${addressOf(n, layout.pageClass)}`;
  };

  /** The page elements of a spread: page numbers, 0 for a blank page. */
  const elementsOf = (spread: number[]) =>
    spread.map((n) => {
      if (n === 0) return blankPage(layout.pageClass);
      const bookPage = pages[n - 1] as BookPage;
      const chapter = chapters[bookPage.chapter] as Chapter;
      const section = renderPage(
        chapter.blocks,
        words[bookPage.chapter] ?? [],
        bookPage.page,
        layout.pageClass,
      );
      section.setAttribute('aria-label', fill(options.text.pageLabel, { n }));
      // Grips on the outer edges, in the margin where there is no text, so dragging over the text
      // still selects it (F03 AC1). Right pages turn forward, left pages back; a single page both.
      const steps: Step[] = layout.pagesPerView === 1 ? [1, -1] : n % 2 === 1 ? [1] : [-1];
      for (const step of steps) {
        const grip = document.createElement('div');
        grip.className = 'grip';
        grip.dataset.step = String(step);
        grip.setAttribute('aria-hidden', 'true'); // the buttons and keys do the same for everyone
        section.append(grip);
      }
      return section;
    });

  const render = async () => {
    const entry = await pagesFor(layout.pageClass);
    pages = entry.pages;
    state.source = entry.source;
    state.breaks = hashOf(pages);
    state.total = pages.length;
    const spread = viewOf(state.page, layout.pagesPerView, state.total);
    state.page = Math.min(...spread.filter((n) => n > 0));
    const shown = elementsOf(spread);
    view.show(shown, layout);
    shownPages = shown;

    // The check of ADR 0009: a page the build measured must fit here too. If one does not, this
    // browser measures text differently (Chromium on Linux, a larger text setting, a missing font):
    // paginate here and show the same place again.
    state.overflowing = shown.filter(
      (s) => !s.classList.contains('blank') && overflowOf(s) > 0,
    ).length;
    if (state.overflowing > 0 && entry.source === 'build') {
      const at = positionOf(pages, state.page);
      await paginateHere(layout.pageClass);
      state.page = pageAt((cache.get(layout.pageClass) as { pages: BookPage[] }).pages, at);
      return render();
    }

    const visible = spread.filter((n) => n > 0);
    const first = visible[0] ?? 1;
    const last = visible.at(-1) ?? first;
    el.where.textContent =
      first === last
        ? fill(options.text.pageOf, { n: first, total: state.total })
        : fill(options.text.pagesOf, { a: first, b: last, total: state.total });
    el.prev.disabled = turnFrom(state.page, -1, layout.pagesPerView, state.total) === null;
    el.next.disabled = turnFrom(state.page, 1, layout.pagesPerView, state.total) === null;
    if (state.target) {
      state.targetOnScreen = visible.includes(pageAt(pages, state.target));
    }
    const end = pages[last - 1];
    const lastPiece = end?.page.at(-1);
    state.span = {
      first: positionOf(pages, first),
      last: {
        chapter: end?.chapter ?? 0,
        block: lastPiece?.block ?? 0,
        word: (lastPiece?.to ?? 1) - 1,
      },
    };
    state.pageClass = layout.pageClass;
    state.pagesPerView = layout.pagesPerView;
    state.scale = Math.round(layout.scale * 1000) / 1000;
    // Replace, not push: turning a page is not a new place in the browser's history, so Back
    // leaves the book instead of stepping back through it page by page.
    history.replaceState(null, '', addressOf(state.page, layout.pageClass));
    const at = positionOf(pages, state.page);
    updateSwitch(at);
    const anchor = chapters[at.chapter]?.anchors[at.block];
    if (el.articleLink && anchor) {
      el.articleLink.href = `${el.articleLink.href.split('#')[0]}#${anchor}`;
    }
  };

  /** Opens the page an address names; an address from another page class goes by position. */
  const openAddress = async (hash: string) => {
    const address = parseAddress(hash);
    if (!address) return;
    if (address.pageClass === layout.pageClass) {
      state.target = null;
      state.page = address.page;
      return;
    }
    const theirs = built(options.locale, address.pageClass, chapters);
    if (!theirs) return;
    state.target = positionOf(bookPages(theirs), address.page);
    state.page = pageAt((await pagesFor(layout.pageClass)).pages, state.target);
  };

  let turning = false;
  const turn = async (step: 1 | -1) => {
    if (turning) return;
    const next = turnFrom(state.page, step, layout.pagesPerView, state.total);
    if (next === null) return;
    turning = true;
    // A view that can animate the turn does it first, from the pages on screen to the next ones.
    if (view.turn) {
      const to = elementsOf(viewOf(next, layout.pagesPerView, state.total));
      await view.turn(shownPages, to, step, layout);
    }
    state.page = next;
    state.target = null;
    state.targetOnScreen = null;
    await render();
    turning = false;
  };
  const go = async (n: number) => {
    state.page = n;
    state.target = null;
    state.targetOnScreen = null;
    await render();
  };

  // F02: a tap on a page's edge turns it; a drag carries the sheet, and on release the turn
  // completes past halfway or falls back before it (gesture.ts).
  el.root.addEventListener('pointerdown', (down) => {
    const grip = (down.target as HTMLElement).closest<HTMLElement>('.grip');
    if (!grip || turning || down.button !== 0) return;
    const step = Number(grip.dataset.step) as Step;
    const next = turnFrom(state.page, step, layout.pagesPerView, state.total);
    if (next === null) return;
    down.preventDefault();
    grip.setPointerCapture(down.pointerId);
    const width = grip.closest('.page')?.getBoundingClientRect().width ?? 0;
    let control: TurnControl | null = null;
    let progress = 0;
    const move = (event: PointerEvent) => {
      const distance = Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY);
      if (!control && distance >= TAP_PX) {
        turning = true;
        const to = elementsOf(viewOf(next, layout.pagesPerView, state.total));
        control = view.beginTurn?.(shownPages, to, step, layout) ?? {
          set() {},
          end: async () => {},
        };
      }
      if (!control) return;
      progress = progressOf(step, down.clientX, event.clientX, width, layout.pagesPerView);
      control.set(progress);
    };
    const up = async (event: PointerEvent) => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      if (!control) {
        const distance = Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY);
        if (isTap(distance, event.timeStamp - down.timeStamp)) await turn(step);
        return;
      }
      const complete = event.type === 'pointerup' && completes(progress);
      await control.end(complete);
      if (complete) {
        state.page = next;
        state.target = null;
        state.targetOnScreen = null;
        await render();
      } else {
        view.show(shownPages, layout);
      }
      turning = false;
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  });
  el.prev.addEventListener('click', () => void turn(-1));
  el.next.addEventListener('click', () => void turn(1));
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if ((event.target as HTMLElement).closest('input, select, textarea')) return;
    const action: Record<string, () => Promise<void>> = {
      ArrowRight: () => turn(1),
      PageDown: () => turn(1),
      ArrowLeft: () => turn(-1),
      PageUp: () => turn(-1),
      Home: () => go(1),
      End: () => go(state.total),
    };
    const run = action[event.key];
    if (!run) return;
    event.preventDefault();
    void run();
  });
  window.addEventListener('hashchange', async () => {
    await openAddress(location.hash);
    await render();
  });
  // A new window size can need the other page class: keep the place, not the page number.
  let resizing = false;
  const resize = new ResizeObserver(async () => {
    if (resizing || !state.ready) return;
    const next = view.chooseLayout();
    if (next.pageClass === layout.pageClass && next.scale === layout.scale) {
      // Same pages; the view may still need to lay them out again for its new size.
      view.show([...shownPages], layout);
      return;
    }
    resizing = true;
    const at = positionOf(pages, state.page);
    layout = next;
    state.page = pageAt((await pagesFor(layout.pageClass)).pages, at);
    await render();
    resizing = false;
  });
  resize.observe(view.element);

  /** F09: another view takes over at the same place; a turn under way lands first. */
  const useView = async (next: ReaderView) => {
    if (next === view) return;
    while (turning) await new Promise((resolve) => requestAnimationFrame(resolve));
    const at = positionOf(pages, state.page);
    view.setActive?.(false);
    resize.unobserve(view.element);
    view = next;
    state.mode = view.mode;
    el.root.dataset.mode = view.mode;
    view.setActive?.(true);
    resize.observe(view.element);
    layout = view.chooseLayout();
    state.page = pageAt((await pagesFor(layout.pageClass)).pages, at);
    await render();
  };

  // The view's size is known only once it is shown: show it, then choose the layout and the page.
  el.article.hidden = true;
  el.root.hidden = false;
  layout = view.chooseLayout();
  await openAddress(location.hash);
  await render();
  state.ready = true;
  return { state, useView };
}
