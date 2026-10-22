# Credits

The code of this project is under the MIT License ([`LICENSE`](LICENSE)). The assets below keep their own licenses.

## 3D model

- **"Books with magnifier"** by [shuvalov.di](https://sketchfab.com/shuvalov.di), from [Sketchfab](https://sketchfab.com/3d-models/books-with-magnifier-cc153ce6258b4e538d9fc7da5b5d0fe4).
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). ShareAlike: any edited version of the model is published under the same license.
- File: `assets-src/books_with_magnifier.glb`, unmodified. Edits made in later stages will be listed here.

## Text

The frame story of *One Thousand and One Nights* (the anonymous Arabic original is in the public domain), from two public-domain editions that both descend from Antoine Galland's French translation (1704–1717). Chosen in [ADR 0002](docs/adr/0002-book-content.md). Both texts are served from Contentstack; the sources and every edit are in `assets-src/text/`.

- **English:** Andrew Lang (ed.), *The Arabian Nights Entertainments*, 1898, translated from Galland. [Project Gutenberg #128](https://www.gutenberg.org/ebooks/128). Lang already left out the explicit passages; the Stage 2 review removes anything explicit or racist that remains.
- **Spanish:** *Las mil y una noches: cuentos árabes*, from Galland, anonymous translator, Casa Editorial Maucci, Barcelona, 1902. [Wikisource](https://es.wikisource.org/wiki/%C3%8Dndice:Las_mil_y_una_noches_(Antoine_Galland).djvu). **Transcribed and adapted:** cut to Lang's 28 paragraphs, with every explicit or racist passage removed and today's names for the characters (Sherezade, Dinarzada, Shahriar, Shahzamán). Every edit is listed in `assets-src/text/README.md`.

## Typeface

- **Literata**, by TypeTogether for Google (The Literata Project Authors), [github.com/googlefonts/literata](https://github.com/googlefonts/literata), from the npm package `@fontsource/literata` 5.3.0.
- License: [SIL Open Font License 1.1](https://openfontlicense.org), approved by the owner on 2026-10-21 (ADR 0004). The license text is published with the site at `/licenses/literata-OFL.txt`.
- Shipped: regular and italic, Latin subset (two `.woff2` files, 40.6 KB).

## Code that ships to the browser

| Package | What for | License |
| --- | --- | --- |
| three.js | Draws the 3D book (the 3D lab for now) | MIT |

## Tools (development only, not shipped)

The site is static: none of these runs in the reader’s browser. The license of every package, including the transitive ones, is checked on each commit by `npm run check:licenses` against [ADR 0005](docs/adr/0005-license-policy-for-tools.md).

| Package | What for | License |
| --- | --- | --- |
| Astro | Generates the HTML pages at build time | MIT |
| TypeScript | Types | Apache-2.0 |
| Biome | Format and lint | MIT or Apache-2.0 |
| Vitest | Unit tests | MIT |
| Playwright | Browser tests | Apache-2.0 |
| axe-core, @axe-core/playwright | Accessibility tests | MPL-2.0 (approved for testing only, ADR 0005) |

Build tools that come in with Astro and Vite under licenses outside the shipped list (MPL-2.0 `lightningcss`, LGPL-3.0 libvips inside `sharp`, BlueOak-1.0.0 utilities) are listed in ADR 0005.
