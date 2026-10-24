# Spike D — A fuller scene: the table, the carpet, the candle, and an old room's air

- **Stage:** 6, at the owner's request (2026-10-24): "añadir más elementos a la escena… y un efecto de polvo que haga ver a la sala vieja". **Requirements:** F01, F14 (credits), Q03 (BR4–BR6), Q04 (BM1), BB4, BB5.
- **Status:** **done and decided** (owner, 2026-10-24): real size, the sources in the repository, the fringes left out on phones, the credits, the air without the grain and without dust while reading. Made real in `tools/model/scene.ts` and `src/three/dust.ts` (ledger, Stage 6).
- **Sources:** three models the owner added to `assets-src/` (not committed yet), and a reference scene that shows where each goes (`EscenaConTodoMalEscalada.glb`, its scales not in metres).

## The models

| Model | Author | License | Source size | Triangles | Images |
| --- | --- | --- | --- | --- | --- |
| Marquetry table | Virtual Museums of Małopolska | CC BY 4.0 | 28.29 MiB | 262,384 | 2 × 4096² (specular-glossiness) |
| Persian Malayer carpet | mfb64 | CC BY 4.0 | 18.56 MiB | 612,600 (the fringes 609,388) | 1 × 1024² |
| Candle holder | Vanya Mazalevich | CC BY 4.0 | 4.35 MiB | 1,295 | 10, up to 1024² |

All three are CC BY 4.0, in the license policy; each needs a credit that says what was changed.

## Placing them

The reference scene holds the same book subtree as `bookV3.glb` (the same nodes and local transforms), under a root of its own scale and turn. One matrix maps that root onto ours, `W = M_ours(root) · M_ref(root)⁻¹`, and each mesh goes where `W · M_ref(mesh)` says. The table's three meshes all gave the same placement (scale 0.694 of real size against the book, turned −62°), and so did the carpet's seven (scale 0.550, −14°). The candle holder's parts did not: in the reference the candle is larger than the holder it stands in (0.00156 against 0.00121), so each part keeps its own placement.

With the book at its real size, the table is 0.59 m tall (0.85 m in reality) and the carpet 1.03 × 0.66 m (1.88 × 1.20 m).

## Fitting the budgets

Each new object: its meshes placed; the table's specular-glossiness turned into metal-roughness (the diffuse map as base colour, roughness 1 − glossiness at half the colour's size); primitives of one material joined; geometry simplified with meshoptimizer (MIT, already installed as a dependency of a dependency); textures resized and re-encoded as WebP; all merged into the book's file.

| | Mobile | Budget | Desktop | Budget |
| --- | --- | --- | --- | --- |
| Model file | 1.94 MiB | BB4 ≤ 2 MiB | 4.35 MiB | ≤ 6 MiB |
| Model draw calls (+ the pages at run time) | 11 (at most 13–15 drawn) | BR4 ≤ 20 | 11 (at most 15 drawn) | ≤ 30 |
| Triangles | **52,759** | BR5 ≤ 50,000 | 74,781 (78,849 drawn) | ≤ 150,000 |
| Textures in GPU memory | 25.33 MiB | BM1 ≤ 32 MiB | 94.33 MiB | ≤ 96 MiB |

Mobile is 2,759 triangles over BR5. The simplifier stops short of the ratio asked: the table's scan has many texture seams it keeps (17,364 triangles at 3.5% asked), and the carpet's fringes are hundreds of separate threads it cannot close below their minimum (25,456 triangles).

The orbit's floor (F17) took the table for an obstacle, since its box, grown by 2 cm, holds the point the camera circles: what the book rests on is now left out (anything whose top is below the book's top).

## The air of an old room

Three layers, none an extra pass (BR6) and none drawing at rest (BR2):

- **Motes**: 500 (desktop) or 250 (mobile) soft points, warm, over the table up to half a metre above the book, drawn in the scene's pass; they drift only in frames drawn for something else (the opening, the orbit, a turn).
- **Vignette and grain**: a CSS layer over the canvas and under the pages' text: the edges in shadow, a film's grain from an inline SVG noise. The browser composites it; no WebGL.
- Left out: **depth-of-field blur**, a post-processing pass, not allowed on mobile (BR6 = 0) and allowed once on desktop.

Seen in Edge on the PC's GPU: the opening shows the whole table on its carpet, the candle lit; the orbit passes over the candle; the reading view now has the table's marquetry around the book. The motes show against the dark around the table and over the table; in the reading view a few sit over the pages.

## Decisions for the owner

1. The scale: the reference's (table 0.59 m tall against the book) or real sizes (0.85 m; the books then look smaller on it).
2. The sources in the repository: about 52 MiB more (the build makes the tiers from them, as it does from `bookV3.glb`).
3. Mobile's triangles: simplify the fringes further (meshoptimizer can drop small separate pieces), leave the fringes out on mobile, or measure on the Pova 6 and change BR5.
4. The credits: three entries in Contentstack (the Seed workflow writes the stack), `CREDITS.md` and the file's `asset.extras`.
5. The air: stronger or as it is; the motes kept off the pages while reading; a warm candle light (a light in the PBR shader) or a light shaft; depth of field on desktop only.
