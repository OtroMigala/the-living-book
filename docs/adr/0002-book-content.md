# ADR 0002 — Book content: the frame story of the *Nights*

- **Status:** proposed. The owner chose the text (2026-10-21); the edition and how much to abridge are still the owner's decision.
- **Date:** 2026-10-21
- **Stage:** 1 (gate)

## Context

The owner chose the introduction of *One Thousand and One Nights*: the frame story of King Shahryar and his brother, up to the moment Shahrazad starts her first tale. The owner's reason: it should be free of copyright.

The original anonymous Arabic text is in the public domain. **Every translation, however, is a separate work with its own copyright**, so the question is which translation, in each language, is also public domain. Two more requirements weigh on the choice:

- **F13 (two languages):** the language switch keeps the reader's position. That is far simpler if both texts have the same structure, which means both translations come from the same source.
- **The audience:** this is a portfolio piece. The most literal translations of the frame story include explicit sex, racist descriptions of Black characters, a scene of sexual coercion and a fable that presents beating one's wife as good advice. A reviewer will not read any of it as the author's view, but it is still not what we want them to find on page 3.

## Options

| | A. Burton + Blasco Ibáñez | B. Galland line: Lang + Maucci (recommended) |
| --- | --- | --- |
| English | Richard F. Burton, *The Book of the Thousand Nights and a Night*, vol. 1, 1885 ([Gutenberg #3435](https://www.gutenberg.org/ebooks/3435)) | Andrew Lang (ed.), *The Arabian Nights Entertainments*, 1898, translated from Galland's French ([Gutenberg #128](https://www.gutenberg.org/ebooks/128)) |
| Spanish | *El libro de las mil noches y una noche*, vol. 1, from J. C. Mardrus's French, Spanish version by Vicente Blasco Ibáñez, Prometeo, Valencia ([Gutenberg #47287](https://www.gutenberg.org/ebooks/47287)) | *Las mil y una noches: cuentos árabes*, from Antoine Galland, anonymous translator, Maucci, Barcelona, 1902 ([Wikisource](https://es.wikisource.org/wiki/%C3%8Dndice:Las_mil_y_una_noches_(Antoine_Galland).djvu)) |
| Rights | Burton (died 1890): public domain everywhere. The Spanish text is a translation of Mardrus's translation. Mardrus died in 1949: public domain where the term is life + 70 (France, the US for works published before 1931), but where it is life + 80 (Colombia; Spain for authors who died before 1987) his rights may last until the end of 2029 | Galland (died 1715) and Lang (died 1912): public domain everywhere. Maucci edition: anonymous translator, published 1902, past the usual 70–80 year term for anonymous works; public domain in the US (published before 1931) |
| Content | Complete and literary. Explicit sex, racist descriptions ("hideous blackamoor"; "un robusto esclavo negro"), the coercion scene and the wife-beating fable are all there | Lang removed the explicit passages and, per the fetched summary, the coercion scene and the fable. Galland's Spanish is more discreet than Mardrus but fuller than Lang, so it would be abridged to match Lang |
| Same structure in both languages | No: Burton and Mardrus split and word things differently | Yes, after abridging the Spanish to Lang's cuts |
| Length of the frame story (rough estimates from a summary of the pages, to be counted in Stage 2) | ~5,000 words (Spanish); Burton's English is of a similar order, plus about 39 footnotes | ~1,300–1,500 words (Lang): about 6 pages, 3 spreads |

Not chosen: Rafael Cansinos Assens (1954) and Juan Vernet (1964) translated from Arabic into Spanish, but both are still under copyright.

## Recommendation

**B.** Its rights are clear in every country involved; one source in both languages makes F13 straightforward; and the text can be read by any reviewer. The Spanish is abridged to follow Lang's cuts and credited as "adapted". The abridging is editorial work done in Contentstack, by the editor, which also shows off the CMS (F04).

If B is too short, the first tale (*The Merchant and the Genius*) can be added as a second chapter: it is in the same two editions.

## Consequences

- **Stage 2** treats the text as an input, like the model: exact word counts, the structure of both editions, and a list of every cut made to the Spanish.
- **F14 / `CREDITS.md`** name the editions, translators and links, and say "adapted" if anything is cut.
- **Risks** R16 (sensitive content) and R17 (translation rights) are retired once the owner decides.
