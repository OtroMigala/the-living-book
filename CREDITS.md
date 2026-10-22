# Credits

The code of this project is under the MIT License ([`LICENSE`](LICENSE)). The assets below keep their own licenses.

## 3D model

- **"Books with magnifier"** by [shuvalov.di](https://sketchfab.com/shuvalov.di), from [Sketchfab](https://sketchfab.com/3d-models/books-with-magnifier-cc153ce6258b4e538d9fc7da5b5d0fe4).
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). ShareAlike: any edited version of the model is published under the same license.
- File: `assets-src/books_with_magnifier.glb`, unmodified. Edits made in later stages will be listed here.

## Text

The frame story of *One Thousand and One Nights* (the anonymous Arabic original is in the public domain), from two public-domain editions that both descend from Antoine Galland's French translation (1704–1717). Chosen in [ADR 0002](docs/adr/0002-book-content.md). Not loaded yet: it enters through Contentstack in a later stage.

- **English:** Andrew Lang (ed.), *The Arabian Nights Entertainments*, 1898, translated from Galland. [Project Gutenberg #128](https://www.gutenberg.org/ebooks/128). Lang already left out the explicit passages; the Stage 2 review removes anything explicit or racist that remains.
- **Spanish:** *Las mil y una noches: cuentos árabes*, from Galland, anonymous translator, Casa Editorial Maucci, Barcelona, 1902. [Wikisource](https://es.wikisource.org/wiki/%C3%8Dndice:Las_mil_y_una_noches_(Antoine_Galland).djvu). **Adapted:** abridged to follow Lang's cuts, with every explicit or racist passage removed. Each cut will be listed in the Stage 2 input report.

## Typeface

- **Literata**, by TypeTogether for Google (The Literata Project Authors), [github.com/googlefonts/literata](https://github.com/googlefonts/literata), from the npm package `@fontsource/literata` 5.3.0.
- License: [SIL Open Font License 1.1](https://openfontlicense.org), approved by the owner on 2026-10-21 (ADR 0004). The license text is published with the site at `/licenses/literata-OFL.txt`.
- Shipped: regular and italic, Latin subset (two `.woff2` files, 40.6 KB).

## Site framework (shipped as generated HTML)

| Package | License |
| --- | --- |
| Astro | MIT |

## Tools (development only, not shipped)

| Package | License |
| --- | --- |
| TypeScript | Apache-2.0 |
| Biome | MIT or Apache-2.0 |
| Vitest | MIT |
