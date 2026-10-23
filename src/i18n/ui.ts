// Interface text and addresses for each locale (F13). The book's own text comes from the CMS;
// this is only the frame around it (navigation, notices), which belongs to the code.

import type { Locale } from '../content/model.ts';

export type PageKey = 'home' | 'credits' | 'book';

/** Path of each page after the site's base path, per locale. */
export const ROUTES: Record<Locale, Record<PageKey, string>> = {
  'en-us': { home: '', credits: 'credits/', book: 'book/' },
  'es-419': { home: 'es/', credits: 'es/creditos/', book: 'es/libro/' },
};

export const UI = {
  'en-us': {
    siteTitle: 'The Living Book',
    previewFlag: 'Preview: content not published yet',
    skipLink: 'Skip to the text',
    navLabel: 'Site',
    read: 'Read',
    bookLink: 'Book',
    credits: 'Credits',
    switchTo: 'Español',
    switchToLabel: 'Leer en español',
    notice:
      'Work in progress. This is the plain reading version of the book. The 3D book you can leaf through is under “Book”, still being built.',
    footer: 'A pilot project, built in stages. Code under the MIT License;',
    footerLink: 'credits and licenses',
    footerEnd: 'of the text, the model and the typeface.',
    creditsTitle: 'Credits',
    creditsDescription:
      'Credits and licenses of the text, the 3D model and the typeface used in The Living Book.',
    license: 'License',
    by: 'by',
    codeTitle: 'Code',
    codeText: 'The code of this site is under the',
    bookTitle: 'The book',
    pagesNav: 'Pages',
    previous: 'Previous page',
    next: 'Next page',
    pageOf: 'Page {n} of {total}',
    pagesOf: 'Pages {a}–{b} of {total}',
    pageLabel: 'Page {n}',
    readAsArticle: 'Read as an article',
    flatPages: 'Flat pages',
    book3d: '3D book',
    contextLost: 'The 3D view stopped; the book goes on as flat pages.',
    slow3d: 'The 3D book runs slowly on this device.',
    toFlat: 'Switch to flat pages',
    keep3d: 'Keep 3D',
    deskLabel: 'The open book on a desk, with closed books and a magnifier',
  },
  'es-419': {
    siteTitle: 'The Living Book',
    previewFlag: 'Vista previa: contenido aún sin publicar',
    skipLink: 'Saltar al texto',
    navLabel: 'Sitio',
    read: 'Leer',
    bookLink: 'Libro',
    credits: 'Créditos',
    switchTo: 'English',
    switchToLabel: 'Read in English',
    notice:
      'Obra en construcción. Esta es la versión de lectura del libro. El libro en 3D, que puedes hojear, está en «Libro» y aún se construye.',
    footer: 'Un proyecto piloto, construido por etapas. Código bajo la licencia MIT;',
    footerLink: 'créditos y licencias',
    footerEnd: 'del texto, el modelo y la tipografía.',
    creditsTitle: 'Créditos',
    creditsDescription:
      'Créditos y licencias del texto, el modelo 3D y la tipografía de The Living Book.',
    license: 'Licencia',
    by: 'de',
    codeTitle: 'Código',
    codeText: 'El código de este sitio está bajo la',
    bookTitle: 'El libro',
    pagesNav: 'Páginas',
    previous: 'Página anterior',
    next: 'Página siguiente',
    pageOf: 'Página {n} de {total}',
    pagesOf: 'Páginas {a}–{b} de {total}',
    pageLabel: 'Página {n}',
    readAsArticle: 'Leer como artículo',
    flatPages: 'Páginas planas',
    book3d: 'Libro en 3D',
    contextLost: 'La vista 3D se detuvo; el libro sigue en páginas planas.',
    slow3d: 'El libro en 3D va lento en este dispositivo.',
    toFlat: 'Cambiar a páginas planas',
    keep3d: 'Seguir en 3D',
    deskLabel: 'El libro abierto sobre un escritorio, con libros cerrados y una lupa',
  },
} as const satisfies Record<Locale, Record<string, string>>;

/** The other locale: with two languages, the switch always points to the one not shown. */
export const otherLocale = (locale: Locale): Locale => (locale === 'en-us' ? 'es-419' : 'en-us');

/** A block's anchor id; the same in both languages because their blocks match (K02 parity). */
export const blockId = (chapterId: string, index: number) => `${chapterId}-${index + 1}`;
