# Progress

A checklist of build phases, following [`BUILD-PROMPTS.md`](BUILD-PROMPTS.md). Do one phase at a time, in order. Tick a phase when its "Done when" check passes.

- [x] **Phase 0 — Audit**
  - [x] Read token-maker's docs and frame code; recorded discrepancies
  - [x] `docs/TOKEN-MAKER-CONTEXT.md`: file map, how frames are drawn, inventory and classification of all 27 frames
  - [x] Owner decisions: own repo, copied engine, band-relative geometry, JSON + PNG first, a pull request per phase (DESIGN.md §2)

- [x] **Phase 1 — Foundation**
  - [x] Repository set up like token-maker (React 19, Vite, TypeScript, Vitest + @napi-rs/canvas, Playwright, ESLint, the same design tokens)
  - [x] Token-maker's frame engine copied unchanged into `src/engine/legacy/` with `SOURCE.json`, `npm run engine:check` / `engine:sync` and a test against edits
  - [x] `FrameProject` schema version 1 with stage settings and four layer types (Token Maker frame, band fill, line, repeated shapes) plus kept-but-unsupported layers
  - [x] File reading with version checks, a migration hook, field checks with warnings; unknown layers preserved
  - [x] One renderer (`renderProject`) for preview, thumbnails, export and tests; per-layer opacity and blend; Token Maker frames pixel-identical to the original
  - [x] Editor: top bar, layers panel (select, rename, hide, lock, reorder by buttons/keys/drag, duplicate, delete, add), canvas (pick and drag), properties per layer type with Advanced settings, template picker with live thumbnails, project data view
  - [x] Undo/redo on the structured project (one step per drag); autosave to IndexedDB
  - [x] Save/open `.framestudio.json`; Export PNG 256–2048 px with or without the sample picture
  - [x] Tests: 107 unit tests (renderer pixel tests for all frames × shapes, every layer and paint, stack order/visibility/opacity/blend, file format, store, autosave, hit testing, panels) and 14 Playwright runs (7 flows × 2 desktop sizes)
  - [x] `npm run frame-sheet` and `npm run screenshots`
  - **Done when:** load a Token Maker frame, add a ring of shapes, change their count and colour, reorder and hide layers, undo, save, reopen, export a PNG ✔

## Owner answers after Phase 1

- Light direction control, default top left → Phase 2
- Token Maker opens `.framestudio.json` project files → Phase 5
- Shapes and paths adaptable to the band by default (free placement optional) → Phase 2

(Details in DESIGN.md §2 and §9.)

- [x] **Phase 2 — Drawing tools** (including the light-direction control)
  - [x] Shape layer (circle/oval, rectangle with rounded corners, polygon, star) and Path layer (click to add points, drag points and curve handles, double-click for smooth/sharp, Delete removes a point, close by clicking the first point or Enter)
  - [x] Placement adaptable by default (anchored round the band: along + across, sized in band widths, turning with the band); "Place freely" per layer, switching without the layer jumping
  - [x] On-canvas handles: drag to move, square handle to resize, round handle to turn (Shift snaps to 15°); numeric position/size/stretch/rotation in Advanced
  - [x] Mirroring: left/right pair, top/bottom pair, all four sides (copies stay lit from the real light)
  - [x] Groups: nested in the file, fold/unfold, hide/lock/opacity/blend for the whole group, Ctrl/Shift+click to pick several, Group (Ctrl+G) / Ungroup (Ctrl+Shift+G), drag into groups, move out at the edges
  - [x] Clipping per layer: to the band, or to the layer below (clipping mask)
  - [x] Repeat patterns: alternating colours and sizes, gaps beside the bigger ones (Monk), alternate sides (Druid); new elements: chevron, tick mark, gear, eye, music note, claw marks
  - [x] Wavy lines (wave height, waves round the ring, slide)
  - [x] Light dial in the stage bar (default top left, 225°, stored as `stage.light`) driving lit paints, bead and element shading, shapes and paths, raised shadows; Token Maker frames stay top-left lit and say so
  - [x] Schema version 2 with a migration from version 1; version-1 fixture files open and draw pixel for pixel as before
  - [x] New layered template "Jewelled" (a vine, alternating diamonds and a mirrored pair of drawn gems in a group)
  - [x] Tests: 185 unit tests (78 new: shapes, paths, placement on every shape and thickness, free placement, mirroring, transform maths, handles, groups, clipping, wavy lines, patterns, new elements, the light, the migration and v1 fixtures, the store's group actions, panels) and 22 Playwright runs (11 flows × 2 desktop sizes, 4 new: drawing and editing a path, handles, the "done when" flow, the light dial)
  - **Done when:** draw a custom gem shape, mirror it on both sides of the token, group it with a ring of alternating diamonds, switch the token to a hexagon and see it all follow the band, and move the light to the bottom right ✔ (Playwright "done when" test)
- [x] **Phase 3 — Procedural layers**
  - [x] Texture layer with nine kinds: marble, hammered metal, battle wear, wood grain, stone blocks, scatter (stars and haze), rope, scales, glowing cracks; colour, amount, size, strength, seed, start/end across the band, and "where" (everywhere / shaded side / lit side, following the light)
  - [x] Each painter re-implements Token Maker's texture and is pixel for pixel the original at its defaults (checked against the finishes' own texture functions on three shapes); lit textures turn with the light dial
  - [x] "Colours round the ring" paint (stops by angle, optionally turning with the light) for band fills and lines; starts from the metal lighting when switched to
  - [x] Per-layer cache: editing one layer redraws only that layer; opacity, blend, hiding, renaming and locking redraw nothing; clip-to-below masks reuse the cache; exports over 2048 px are not cached and cached/uncached renders are identical
  - [x] Texture library in Add layer → Texture… with live thumbnails (11 presets), optionally with a matching band underneath (one undo step)
  - [x] New layered templates "Battle-worn steel" and "Night sky"
  - [x] Schema version 3 with a migration from version 2; version-2 fixture files saved by Phase 2, which open and draw as before (version-1 ones too)
  - [x] Tests: 299 unit tests (114 new: painters against the originals, every kind on every shape, seeds, sizes, amount/size/strength, the light and "where", the ring paint, the cache, the performance budget, the format, panels and the library) and 28 Playwright runs (14 flows × 2 desktop sizes, 3 new: the library, texture settings and undo, the "done when" flow)
  - **Done when:** a design with marble, hammered metal and stars renders the same in the preview and the export, and editing one layer doesn't redraw the others ✔ (Playwright "done when" test: the exported PNG scaled to the preview differs by about 1/255 on average; after editing the stars the preview drew 1 layer and reused 3)
- [ ] **Phase 4 — Converting Token Maker frames**
- [ ] **Phase 5 — Polish, library and sharing**

## Known limitations after Phase 3

- Token Maker frames are still one layer each, lit from the top left (Phase 4 converts them, now that every texture exists as a layer).
- Old designs draw as before to within rounding: a few nearly transparent edge pixels can differ by a few 255ths, because every layer is now drawn on its own canvas so it can be cached.
- The cache keeps up to about 128 MB of layer pictures; very large designs at a big preview size will redraw some layers.
- "Where" (shaded/lit side) fades textures by the angle from the centre, which is close to, but not exactly, how the band's lighting falls on square and hexagon tokens.
- Scales are always lit from the outer edge, as in Token Maker.
- Picking on the canvas treats a texture like a band fill: clicking anywhere in its part of the band picks it, even between its marks.
- Still from Phase 2: desktop only; no drop indicator line when dragging layers; path points sharp or smooth only; no zoom; small kinks in wavy lines at square and hexagon corners; groups can't be moved as a whole on the canvas.

## Known limitations after Phase 2 (for the record)

- Token Maker frames are one layer each: only their colour and highlights colour can be changed, and they stay lit from the top left when the light is moved (Phase 4 converts them).
- No procedural textures as layers yet (Phase 3).
- Desktop only; touch interaction is not built (Phase 5).
- Every layer is redrawn on every change, and a layer clipped to the one below draws that layer again for its mask. Fine for now; caching comes with the heavier texture layers (Phase 3).
- Layers can be reordered by dragging in the list with a mouse; there is no drop indicator line yet.
- Path points are sharp or smooth (one symmetrical curve handle); there are no separate in/out handles yet.
- There is no zoom, so small shapes on a thin band are fiddly to edit on the canvas; the numeric values in Advanced help.
- Wavy lines have small kinks at the corners of square and hexagon tokens (as Token Maker's own wavy lines do).
- Groups can't be moved or turned as a whole on the canvas; their layers are moved one by one.
