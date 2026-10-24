# Credits

The code of this project is under the MIT License ([`LICENSE`](LICENSE)). The assets below keep their own licenses.

## 3D model

- **"Books with magnifier"** by [shuvalov.di](https://sketchfab.com/shuvalov.di), from [Sketchfab](https://sketchfab.com/3d-models/books-with-magnifier-cc153ce6258b4e538d9fc7da5b5d0fe4).
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). ShareAlike: any edited version of the model is published under the same license.
- Files: `assets-src/books_with_magnifier.glb`, the original, unmodified; and `assets-src/bookV3.glb`, **edited by Juan Alejandro on 2026-10-22**: two empty nodes (`page_left`, `page_right`) mark the open book's pages, the magnifier now lies on the closed books, and the closed books stand 2 cm further back. The edited model is published under CC BY-SA 4.0, as ShareAlike requires.
- Shipped: `models/book-mobile.glb` and `models/book-desktop.glb`, made from `bookV3.glb` in every build by `npm run model:optimize`: the printed text erased from the open pages (the reader prints its own text on that paper), textures reduced to 512 and 1024 px and re-encoded as WebP, and the glass's transmission removed (it keeps the transparency its author painted). Each file names the author, the source, the license and these changes in its `asset.extras`, and is published under CC BY-SA 4.0 like the edited model.

## The scene around the book

Three models from Sketchfab, each under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), which asks for the title, the author, the source, the license and what was changed. Their original files are in `assets-src/`, unmodified. They are shipped inside `models/book-mobile.glb` and `models/book-desktop.glb`, made in every build by `npm run model:optimize`, placed as the owner composed them in a reference scene (Stage 6, spike D), at their real sizes; each file credits them again in its `asset.extras.furniture`.

- **"Marquetry table"** by [Virtual Museums of Małopolska](https://sketchfab.com/WirtualneMuzeaMalopolski), from [Sketchfab](https://sketchfab.com/3d-models/marquetry-table-689d68be94b24799b588fd0936b5ddc0). File: `assets-src/marquetry_table.glb`. Changed: placed under the book at its real size (0.85 m tall), its geometry simplified, its textures reduced and re-encoded as WebP, and its specular-glossiness material converted to metal-roughness (roughness from the glossiness map).
- **"Persian Malayer Carpet"** by [mfb64](https://sketchfab.com/mfb64), from [Sketchfab](https://sketchfab.com/3d-models/persian-malayer-carpet-1120ca810d0c46289d3b7071103067ac). File: `assets-src/persian_malayer_carpet.glb`. Changed: placed under the table at its real size (1.88 × 1.20 m), the geometry of its fringes simplified, the fringes left out of the phones' file, its texture re-encoded as WebP.
- **"Candle Holder"** by [Vanya Mazalevich](https://sketchfab.com/VanyaMazalevich), from [Sketchfab](https://sketchfab.com/3d-models/candle-holder-38c0f8b4df1b41e092e8cdc623b3b6ff). File: `assets-src/candle_holder.glb`. Changed: placed beside the book, its candle made larger against the holder (as the owner composed it), its textures reduced and re-encoded as WebP.

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
| three.js | Draws the 3D book | MIT |

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
| glTF-Transform (`@gltf-transform/core`, `extensions`, `functions`) | Optimizes the 3D model for each quality tier (`npm run model:optimize`) | MIT |
| sharp | Resizes and re-encodes the model's textures for glTF-Transform | Apache-2.0 (libvips inside it: LGPL-3.0-or-later, ADR 0005) |

Build tools that come in with Astro and Vite under licenses outside the shipped list (MPL-2.0 `lightningcss`, LGPL-3.0 libvips inside `sharp`, BlueOak-1.0.0 utilities) are listed in ADR 0005.
