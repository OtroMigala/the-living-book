# Stage 2 input report

What we do not control, measured before any application code. Four inputs: the 3D model, the text, the Contentstack stack and the reference devices. Every number has its source next to it; estimates are labelled as such.

Date: 2026-10-21. Gaps found here are listed in [`gaps.md`](gaps.md); the resulting budgets are in [`specs/02-budget.md`](../../specs/02-budget.md) and the contract in [`specs/03-contract.md`](../../specs/03-contract.md).

## 1. 3D model: `assets-src/books_with_magnifier.glb`

Full numbers: [`model-report.generated.md`](model-report.generated.md), produced by `npm run report:model` (`tools/asset-report/`).

| Measure | Value | What it means |
| --- | --- | --- |
| File | 24.85 MiB | 98.8% of it is images (24.56 MiB) |
| Geometry | 5 meshes, 5 draw calls, 5,432 triangles, 3,481 vertices, 0.27 MiB | Tiny. Geometry is not a cost here |
| Textures | 16 images: 4 at 2048² (magnifier), 12 at 1024² (books) | The whole cost |
| GPU memory for textures (estimate) | 149.33 MiB | Each texture is stored decoded (RGBA8, 4 bytes per pixel) plus a third for mipmaps, whatever its PNG or JPEG size on disk. The magnifier alone is 85.33 MiB |
| Extensions | `KHR_materials_transmission` (magnifier glass) | three.js renders the opaque scene to an extra target every frame for transmission (risk R06) |
| Units and axes | Metres, +Y up (glTF standard). Whole scene 0.409 × 0.193 × 0.446 m | Real-world scale: a desk vignette about 40 cm across |
| Extra vertex data | Every mesh carries 2 or 3 UV sets; `Open_book` also has tangents | Every texture reads the first UV set (`texCoord` 0), so the others can be dropped |
| Names | Each object is a parent node (`Open_book`, `Book_1`, `Book_2`, `Book_3`, `Magnifier`) with a mesh child named `<name>_<material>_0`, under Sketchfab wrapper nodes (`Sketchfab_model`, a hashed `.fbx` node, `RootNode`) | The contract uses the parent names |
| Credits | Author, license and source in `asset.extras` | Must survive optimization (CC BY-SA attribution) |

### The open book's geometry

Measured from the `Open_book` vertices in scene coordinates, with every parent transform applied (scratch analysis with the same GLB reader; vertices whose normal points up, n·y > 0.8). Note that the node's own frame is different: its world matrix maps its local Z axis to the scene's +Y, a leftover of the Z-up FBX source.

- **Spine** along the Z axis at x = 0. The book spans x −0.1756 to +0.1756 m and z −0.1352 to +0.0740 m.
- **Each page** is therefore about **0.176 m wide (spine to edge) × 0.209 m tall**, an aspect ratio of 0.84.
- **Page surface height**: y = 0.019 to 0.023 m over most of the page, rising 1 mm next to the spine and falling to 0.003 m at the outer edges, where the page block curves down.
- The page surface has only 84 up-facing vertices, nearly flat. There are no separate page objects: the pages that turn must be our own geometry laid on this surface (risk R08).

### Legibility estimate (F01, risk R10)

An estimate, assuming a top-down view that frames the content with a 5–8% margin (perspective will change it a little; Stage 4 measures it):

| Viewport (CSS px) | Framed | Page on screen (CSS px) | Body text at 16 px: words per page (estimate) |
| --- | --- | --- | --- |
| Desktop 1280 × 720 | Two-page spread, limited by height | ≈ 544 × 648 | ≈ 200–220 |
| Phone 360 × 740 | One page, limited by width | ≈ 331 × 395 | ≈ 80–90 |

On the phone a page is only about 331 px wide, so a page laid out once at desktop size and scaled down would put body text near 10 px, which fails F01 AC1 (≥ 16 px). This is why the contract defines two page classes, each paginated on its own.

## 2. Text

### English: Lang (1898), frame story

Saved with its provenance in [`assets-src/text/`](../../assets-src/text/README.md).

| Measure | Value |
| --- | --- |
| Words | 1,336 |
| Paragraphs | 28, of which 19 contain dialogue (a double quote) |
| Structure | One heading ("The Arabian Nights"), then plain paragraphs. No verse, no footnotes, no images |
| Pages (estimate from §1) | Regular class ≈ 7 pages (4 spreads); compact class ≈ 15–17 pages |
| Content review (owner's rule: nothing explicit or racist) | Read in full: nothing explicit, no racial descriptions. It keeps the premise: the queen's betrayal stated without detail ("she had deceived him completely"), the nightly executions ("had her strangled"), and the Sultan's claim that all women are wicked, which the story itself refutes |

### Spanish: Maucci (1902)

**Not available as text.** On Spanish Wikisource the edition exists only as page scans: the index is in the categories "Índices no corregidos" and "Índices sin obra asociada", only file pages 1–17, 41 and 48 have a transcription page, and the transcribed ones that were sampled are raw OCR (proofreading level 1, with garbled words). The frame story could not be located or measured. This is gap G06; options are in the gaps list.

Also logged: the agent's first attempt sent 30 API requests without pauses and was rate-limited by Wikimedia (AI usage log).

## 3. Contentstack stack

Created by the owner at the Stage 1 gate; observed in the web app and from screenshots.

| Item | Value | Source |
| --- | --- | --- |
| Plan | Free: 3 users, 100K API calls/month, 100 GB bandwidth, 10 content types, 1K entries, 1K assets, 1 production stack | contentstack.com/pricing |
| Region | **AWS Europe**: web app `eu-app.contentstack.com`, Content Delivery `https://eu-cdn.contentstack.com`, Content Management `https://eu-api.contentstack.com` | Address bar; Contentstack "API Endpoints" docs |
| Stack | *The Living Book*, branch `main` | Screenshot |
| Languages | English (United States) master, cannot be changed; Spanish added | Owner; "Set the Master Language" docs. The exact Spanish locale code is still to be read from Settings → Languages (gap G08) |
| Environments | Two created (expected `production` and `preview`; names to be confirmed, gap G08) | Owner |
| Webhooks | Available (none created) | Owner |
| Live Preview | Not found in Settings | Owner; the docs say support enables it (gap G07) |
| Tokens | Delivery and management tokens available; none created yet | Owner |
| Launch (hosting) | Dashboard open on the Free plan: new project from GitHub, Bitbucket or a zip upload. Docs list 10 projects per organization and 50 build hours per month, without naming a plan | Screenshot; "Launch Limitations" docs |

## 4. Reference devices

| | Phone | Desktop |
| --- | --- | --- |
| Device | Tecno Pova 6 | Owner's PC |
| GPU | Mali-G57 MC2 (2 cores, entry level) on MediaTek Helio G99 Ultimate | AMD Radeon RX 9060 XT |
| Screen | 6.78", 1080 × 2460 physical pixels, 120 Hz | Not reported |
| CSS viewport and device pixel ratio | **Measured 2026-10-22** with `/diagnostics/` in Chrome 155 (Android 10): viewport 360 × 688 CSS px (screen 360 × 820), device pixel ratio **3**. The Stage 2 guess (2.6–2.75) was wrong | Not measured |
| WebGL | WebGL 2; renderer "ANGLE (ARM, Mali-G57 MC2, OpenGL ES 3.2)"; maximum texture size 8192; compressed formats ASTC and ETC2 (no S3TC, no BPTC) | Not measured |
| What it implies | Fill rate is the limit: a full-resolution canvas fills 1080 × 2064 ≈ 2.23 million pixels per frame. With the mobile tier's pixel ratio of 1.5 (BR3) it is 540 × 1032 ≈ 0.56 million, a quarter, because pixel count grows with the square of the ratio. ASTC and ETC2 support makes KTX2 textures (transcoded to ASTC on this GPU, 1 byte per pixel instead of 4) a real option for gap G01. The phone viewport assumed in the specs (360 px wide) matches | Plenty of headroom; the desktop budget is not the binding one |

Sources for the phone: GSMArena and 91mobiles spec pages (see the Stage 1 conversation sources), then the owner's diagnostics run, which settles the screen at 1080 × 2460 physical pixels (360 × 820 CSS px × 3).
