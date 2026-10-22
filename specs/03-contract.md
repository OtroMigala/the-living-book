# Spec 03 — Contracts at the boundaries

- **Status:** draft, waiting for the Stage 2 gate
- **Stage:** 2
- **Based on:** [`docs/inputs/report.md`](../docs/inputs/report.md)

Invariant 2 of the playbook: code is written against a typed contract; the real dependency must satisfy it; placeholders let work continue. The application never depends on a detail of the model or the CMS that is not written here. If Stage 6 (real model) touches more than bindings and configuration, hypothesis H2 fails, and this document is where to look for why.

## Requirements

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| K01 | The 3D model the app loads satisfies the model contract below, checked by a script | Must | `check:model`, built in Stage 3 next to the asset report |
| K02 | Content reaches the app only through the content contract below, validated at build time | Must | Region, locales, environments, block parity |
| K03 | The placeholder scene used in Stages 3–5 satisfies the same model contract as the real asset | Must | This is what makes Stage 6 a drop-in (H2) |

## Model contract (K01, K03)

| Clause | Rule | Today's model |
| --- | --- | --- |
| Format | glTF 2.0 binary (`.glb`), one scene | ✓ |
| Axes and units | +Y up, metres (the glTF convention). Whole scene 0.41 × 0.19 × 0.45 m, ±10%: catches a ×100 export mistake from Blender | ✓ 0.409 × 0.193 × 0.446 |
| Required nodes | `Open_book`, `Book_1`, `Book_2`, `Book_3`, `Magnifier`, matched by exact name at any depth. The app reads their transforms and never the mesh children's names | ✓ (under Sketchfab wrapper nodes, which the app ignores) |
| Coordinates | Every position and axis in this contract is in **scene coordinates**: what three.js sees after loading, with all parent transforms applied. Never in a node's local frame: the Sketchfab export nests Z-up FBX frames, so `Open_book`'s own Z axis points along the scene's +Y | — |
| Spine | Along the scene's Z axis, at x = 0 | ✓ measured |
| Reader | The reader sits at −Z, looking towards +Z: both pages have their top edge towards +Z. Seen from there, the left page (verso, even numbers) is at +X and the right page (recto) at −X | ✓ measured from the texture coordinates (corrected in Stage 4: Stage 2 had assumed the left page at −X) |
| Clear page area | Nothing may rest on the open pages: a turning page would pass through it | ✗ the magnifier lies across the pages (gap G13) |
| Page anchors | Two empty nodes, `page_left` (the verso, at +X) and `page_right` (the recto, at −X), named from the reader's side (suggested as children of `Open_book`; the app reads their scene transform). Origin at the centre of the page rectangle, on the page surface; their +Y axis points out of the page; their +X axis runs from the spine to the outer edge; `extras.width_m` and `extras.height_m` give the page size | ✗ missing (gap G03). Until they exist, the app uses the fallback values below |
| Credits | `asset.extras` keeps `author`, `license`, `source` and `title` | ✓ |
| Budgets of the delivered file | BB4, BM1 and the model's share of BR4/BR5 in [spec 02](02-budget.md): ≤ 10 draw calls and ≤ 20,000 triangles for the model | ✗ textures (gap G01) |
| Glass | `KHR_materials_transmission` is allowed in the file; the mobile tier replaces it at runtime (BR6) | ✓ |

**Fallback page geometry**, measured in scene coordinates (report §1), used while `page_left` and `page_right` are missing:

| | Centre (x, y, z) in metres | Width × height |
| --- | --- | --- |
| Left page, verso (`page_left`) | (+0.0878, 0.0228, −0.0306) | 0.1756 × 0.2092 m |
| Right page, recto (`page_right`) | (−0.0878, 0.0228, −0.0306) | 0.1756 × 0.2092 m |

Our pages are drawn 0.5 mm above y = 0.0228 so they never fight with the model's page surface for the same depth (z-fighting).

## Page classes (the contract between pagination and 3D)

The text is paginated at build time for two page classes. Both keep the page's aspect ratio of 0.84 (width / height), so a laid-out page fits the 3D page exactly at any zoom. Sizes are the on-screen page size at the default view (report §1), so body text renders at its CSS size, 16 px, without scaling.

| Class | Used for | Logical page (CSS px) | Body text |
| --- | --- | --- | --- |
| Compact | One-page view (narrow screens) | 331 × 395 | 16 px |
| Regular | Two-page spread | 544 × 648 | 16 px |

These sizes come from an estimate with a top-down camera; the Stage 4 spike measures the real projection and may adjust them (risk R03). 2D mode uses the same classes, so 3D and 2D break pages in the same places (F07 AC2).

## Content contract (K02)

| Clause | Rule |
| --- | --- |
| Endpoint | Contentstack AWS Europe: Content Delivery `https://eu-cdn.contentstack.com`. The site never calls the Content Management API (`https://eu-api.contentstack.com`); only seed scripts do |
| When | At build time only. The build writes a snapshot; the site reads the snapshot. If Contentstack is unreachable, the build uses the last committed snapshot and says so (Q07) |
| Tokens | Delivery token and API key from CI secrets (`CONTENTSTACK_API_KEY`, `CONTENTSTACK_DELIVERY_TOKEN`). A management token exists only in the secrets of the seed job (C05) |
| Environment | `production` for the public site, `preview` for preview builds (confirmed at the Stage 2 gate). Live Preview is not available on the Free plan, so editors preview through a build of the `preview` environment (F06) |
| Locales | `en-us` (master, default of the site) and `es-419` (Spanish, Latin America), confirmed at the Stage 2 gate. A missing Spanish entry falls back to English, and the page shows its language honestly |
| Hosting | GitHub Pages, project site at `https://otromigala.github.io/the-living-book/` (base path `/the-living-book/`). Decided at the Stage 2 gate |
| Structure | Defined in Stage 3 (content model). Invariants fixed now: a book has ordered chapters; a chapter has ordered blocks; a block is a heading or a paragraph (images later, each with alt text); inline emphasis only |
| Parity | For every chapter, both locales have the same number of blocks in the same order. This is what lets a language switch keep the reader on the same page (F13). The build fails if parity breaks |
| Limits | Content types, entries, assets and API calls within BC1–BC4 |
