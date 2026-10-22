# Guide: adding the page anchors in Blender

The model contract (spec 03) asks for two empty nodes that say where each page of the open book is. This is how to add them in Blender and export them so the app can read them. Written for gap G03, Stage 4.

## Why empties and not planes

An *empty* is an invisible point with a position and an orientation: the app reads where it is and which way it points, and draws nothing. A plane would be a visible mesh and an extra draw call. The page size travels as two custom properties of the empty.

## Steps (Object Mode)

1. `Shift + A` → **Empty → Plain Axes**. Rename it (`F2`) exactly **`page_left`**.
2. Sidebar (`N`) → **Item**: Location X `0.0878`, Y `0.0306`, Z `0.0228`; Rotation `0, 0, 0`.
3. **Object Properties → Custom Properties → New**, two **Float** properties: `width_m` = `0.1756`, `height_m` = `0.2092`.
4. Repeat for **`page_right`**: Location X `-0.0878`, Y `0.0306`, Z `0.0228`; **Rotation Z `180°`**; the same two properties.
5. Optional: parent both to `Open_book` (select the empty, `Shift`-click `Open_book`, `Ctrl + P` → **Object (Keep Transform)**), so they follow the book if it moves.

## Why these numbers

The contract's values are in glTF scene coordinates, which are **Y-up**: `page_left` at (0.0878, 0.0228, −0.0306). Blender is **Z-up**, and its glTF exporter turns Blender's (x, y, z) into glTF's (x, z, −y). So glTF (x, y, z) is Blender (x, −z, y): (0.0878, 0.0306, 0.0228). This assumes the open book is where the original model had it, with its spine on the line x = 0.

The rotations follow the contract: each anchor's +X axis runs from the spine to the page's outer edge, and its up axis (Blender's +Z, glTF's +Y) points out of the page. `page_left` (the verso) is at +X, so it needs no rotation; `page_right` (the recto) is at −X, so it is turned half a turn about the vertical axis.

## Export (File → Export → glTF 2.0)

| Setting | Value | Why |
| --- | --- | --- |
| Format | glTF Binary (`.glb`) | One file, as the app loads it |
| Include → Custom Properties | ✓ | Carries `width_m` and `height_m` as node extras |
| Transform → +Y Up | ✓ (default) | The contract's coordinates |
| Compression | off | Optimization is Stage 6, with its own pipeline |

Save over `assets-src/books_with_magnifier.glb` (git keeps the original), then run `npm run check:model assets-src/books_with_magnifier.glb`: the *Page anchors* clause should pass.

Note: Blender does not keep the source's `asset.extras` (the Sketchfab credits), so the *Credits* clause will fail until the Stage 6 pipeline writes them back. The credit itself stays in `CREDITS.md`, and the edited model is published under CC BY-SA 4.0, as ShareAlike requires.
