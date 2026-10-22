# Gap list (Stage 2)

Where the inputs do not yet satisfy the [contract](../../specs/03-contract.md) or the [budgets](../../specs/02-budget.md). Each gap has an owner and a stage. "Owner" means Alejo; "agent" means Claude Code.

| ID | Gap | Affects | Fix | Who | Stage |
| --- | --- | --- | --- | --- | --- |
| G01 | Model textures: 149.33 MiB of GPU memory and 24.56 MiB of file, against BM1 (≤ 32 MiB mobile) and BB4 (≤ 2 MiB mobile) | BB4, BM1 | An optimization pipeline producing a mobile and a desktop variant: magnifier maps 2048² → 512², book maps 1024² → 512² (mobile), WebP or KTX2. Which tool does it is a licence decision: gltf-transform (BlueOak-1.0.0, outside C02's list), Blender export settings, or a small script on sharp (Apache-2.0, with an LGPL binary) | agent proposes, owner decides | ADR in Stage 4, pipeline in Stage 6 |
| G02 | The magnifier's glass uses transmission, an extra full-scene pass every frame | BR6, R06 | The mobile tier swaps in a simple lens material; the desktop tier is measured in the Stage 4 spike | agent | 4 |
| G03 | No page anchors (`page_left`, `page_right`) in the model | K01 | Owner adds two empties in Blender, as described in the contract. Until then, the fallback values in the contract | owner (Blender) | before 6 |
| G04 | Object names sit under Sketchfab wrapper nodes and the meshes are named `<name>_<material>_0` | K01 | None needed: the contract matches the parent names at any depth | — | — |
| G05 | Unused vertex data: 2–3 UV sets per mesh where textures only read the first; tangents on `Open_book` | BB4 | Dropped by the optimization pipeline (G01) | agent | 6 |
| G06 | **The Spanish text is not available as text.** The Maucci (1902) edition on Wikisource is only page scans; the few transcribed pages are raw OCR | F13, K02 parity | (a) transcribe the frame story from the scans: the agent reads the page images, the owner proofreads, and the Spanish then has to be matched paragraph by paragraph to Lang's shorter version; or (b) a Spanish translation of Lang's 28 paragraphs made for this project: drafted by the agent, reviewed by the owner, credited as such. (b) gives exact paragraph parity by construction and less owner time. **Recommended: (b).** Either way ADR 0002 gets an amendment | owner decides | gate 2 |
| G07 | Live Preview is not in the stack's settings | F06 (Should) | Owner asks Contentstack support whether it can be enabled on the Free plan. Fallback: preview builds from the `preview` environment | owner | 3 |
| G08 | Two stack details not yet read: the Spanish locale code and the environment names | K02 | Owner reads Settings → Languages and Settings → Environments | owner | before 3 |
| G09 | The phone's CSS viewport and device pixel ratio are unknown | BR3, page classes | Stage 3 ships a small diagnostics page (viewport, pixel ratio, WebGL renderer string); owner opens it on the phone | agent + owner | 3 |
| G10 | Launch's Free-plan limits are not stated per plan in the docs | Hosting (Q4) | Read them when creating the Launch project; fallback GitHub Pages | agent + owner | 3 |
| G11 | Pushes to `main` do not start CI | Q08, R18 | Owner checks the repository's Actions tab for a notice; if none, GitHub Support | owner | 3 |
| G12 | Browsers do not report GPU memory | BM1–BM3 | Accepted: the budgets are estimates computed from texture sizes (asset report) and checked that way | — | — |

## Updates

| Date | Gap | Status |
| --- | --- | --- |
| 2026-10-21 | G06 | **Decided** at the Stage 2 gate: transcribe the Maucci scans (option a). ADR 0002 amended |
| 2026-10-21 | G07 | **Closed**: Live Preview cannot be enabled on the Free plan. F06 uses preview builds of the `preview` environment |
| 2026-10-21 | G08 | **Closed**: Spanish locale `es-419`; environments `production` and `preview` |
| 2026-10-21 | G10 | **Closed**: hosting is GitHub Pages (D2), so Launch's limits do not matter for now |
| 2026-10-21 | G11 | **Cause found** by the owner: the Actions tab says Actions is not enabled on the repository, with an "Enable Actions" button, while the API reported it as enabled. Fix: the owner clicks the button |
| 2026-10-21 | G11 | **Closed**: Actions enabled by the owner; pushes now start CI and Deploy
| 2026-10-21 | G06 | **Transcribed**: frame story at printed pp. 5–13 of the scan; adapted to 28 paragraphs. Waiting for the owner's proofreading |
| 2026-10-22 | G09 | **Closed**: the owner ran `/diagnostics/` on the Tecno Pova 6: viewport 360 × 688 CSS px, pixel ratio 3, WebGL 2 on Mali-G57 MC2, ASTC and ETC2 (input report §4) |
| 2026-10-22 | G06 | **Closed**: the owner accepted the transcription and chose today's names (Sherezade, Dinarzada, Shahriar, Shahzamán) for the adapted text |
| 2026-10-22 | G13 (new) | **Objects in the way of a turning page.** `npm run check:model` on the source model: the magnifier lies across the open pages, and the front edges of Book_2 and Book_3 stand 1.2–1.8 cm inside the half-cylinder a turning page sweeps. Fix in Blender (owner): put the magnifier on top of the closed books and move the closed books 2 cm back (+Z), as the placeholder shows. Stage: before 6 |
| 2026-10-22 | G03 | The placeholder model has both anchors, so the app already reads pages from anchors; the real model still needs them (Blender) |
