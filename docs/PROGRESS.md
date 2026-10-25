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
- [x] **Phase 4 — Converting Token Maker frames**
  - [x] A converter per frame (`src/project/convert.ts`) writing the shared build (band, pressed-in step, crease, lit and shadow rims) plus each frame's textures and ornaments as editable layers, with Token Maker's own numbers
  - [x] 18 frames converted: Polished and Paladin first, then Arcane, Infernal, Wizard, Double line, Harlequin, Cleric, Gilded, Fighter, Engraved, Oak, Cobblestone, Magma, Starfield, Monk, Rogue, Sorcerer
  - [x] Not converted, with the reason recorded (DESIGN.md §4.7): Stamped, Ranger, Bard, Warlock, Barbarian, Artificer, Druid, Knotwork (each needs a new element or option to look right)
  - [x] Small additions to the format, all off by default: a metal paint's own highlight colour, see-through gradient colours, gradients that turn with the light, repeats in one flat colour, and an on/off pattern of which repeated shapes are drawn
  - [x] Schema version 4 with a migration from version 3; version-3 fixture files saved by Phase 3 open and draw as before (versions 1 and 2 too)
  - [x] Template picker: "Token Maker frames, as editable layers" (marked Editable, with any small difference in the tooltip) above all 27 originals; "Add a Token Maker frame" adds an editable one as a group
  - [x] Properties: **Turn into editable layers** on a Token Maker frame layer (a group in its place, keeping its name, opacity, blend and clip; one undo step)
  - [x] Converted frames follow the light dial (the originals can't)
  - [x] Visual comparison tests: each conversion drawn beside the original on every shape (Polished and Paladin also at three sizes and two thicknesses), with a limit per frame on the mean difference and the share of visibly different pixels; `npm run compare-conversions` draws them side by side
  - [x] Tests: 427 unit tests (128 new: the conversions and their limits, colours, ids, groups, the light, the new paints and repeat options, the migration and v3 fixtures, the panels) and 34 Playwright runs (17 flows × 2 desktop sizes, 3 new: the "done when" flow, converting from Properties with the light and undo, the template picker)
  - **Done when:** Polished and Paladin open as editable layer stacks that match the originals within the agreed limit ✔ (Playwright "done when" test, measured on the real preview; Polished is the same picture to within rounding, Paladin looks the same with its crosses shaded a little differently, see DESIGN.md §4.7)
  - **Owner's answer (before Phase 5):** "looks the same" is good enough for converted frames.
- [x] **Phase 5 — Polish, library and sharing**
  - [x] Personal layer library: Add to library (any layer, group or several), Your library with live thumbnails, add to any design (new ids, one undo step), rename, remove, export one or all as a library file, import library, layers or project files; kept in IndexedDB and migrated like project files
  - [x] Copy, cut and paste layers (Ctrl+C/X/V, Copy button, Add layer → Paste layers) within a project, between projects and between tabs: the system clipboard as text, plus a shared copy in localStorage
  - [x] Phone and touch layout: canvas on top, panels in a bottom sheet with Layers / Properties tabs, 44 px targets on touch screens, finger-friendly handles, no page scrolling while dragging
  - [x] Keyboard access: the layer list is a tree (arrows, Home/End, Shift, →/← to fold, Space/Enter, F2, Alt+arrows), menus and radio groups move with the arrows and close with Escape, the canvas moves the selected layer with the arrow keys
  - [x] axe accessibility checks (WCAG 2.1 A/AA and best practice) on the editor, menus, dialogs and the welcome card, on desktop and on a phone; fixed what they found (the layer list's roles, template tile names)
  - [x] Export: transparent PNG at any size (16–4096 px), a sheet of the design on every shape, and the project file with a preview picture embedded
  - [x] A help tip for every control (one plain sentence, shown by a "?" and read as the control's description), checked by a test; a first-time welcome card, and Help to see it again
  - [x] Token Maker sharing, Frame Studio side: `src/share/frameDesign.ts` (`readFrameDesign`, `drawFrameDesign` on Token Maker's band, `previewOf`), the renderer's `band` and `clear` options, `npm run share:export` / `share:check` (copy with a manifest into token-maker's `src/frameStudio/`), tests that the copy stands on its own and that a design draws the same picture on Token Maker's band as in Frame Studio
  - [x] Token Maker side (in token-maker): the copy with its guard test, Frame type → Frame Studio with Open a Frame Studio design…, designs kept in IndexedDB and carried by the token and shared presets, drawn on Token Maker's band by its renderer, and a test that a design looks the same in both apps, pixel for pixel (DESIGN.md §10)
  - [x] Tests: 478 unit tests (51 new: the layers and library formats, the library store, copy/cut/paste, help tips on every control, the welcome card, keyboard access, the library dialog, the share module and the bundle) and 50 Playwright runs (27 flows: 23 × 2 desktop sizes and 4 on a phone; new: the "done when" flow, copy and paste between tabs, exports, the keyboard, axe, the welcome card, and on a phone the layout and target sizes, a finger drag, library and paste, axe)
  - **Done when:** a design made in Frame Studio can be saved to the library, reused in another design, and opened as a frame in Token Maker from its .framestudio.json file. Library and reuse ✔ (Playwright "done when" test). Opening in Token Maker ✔ (token-maker's Playwright test opens `.framestudio.json` files saved by Frame Studio as frames, on desktop, tablet and phone; its unit test shows they draw exactly as Frame Studio draws them).

## The owner's brief after Phase 5

"Expanding Frame Studio": move from an editor to a procedural art studio, where borders emerge from combining reusable systems, easy to use, D&D tokens first. The plan and its order are in [`ROADMAP.md`](ROADMAP.md) (Phases 6–10).

- [x] **Phase 6 — Surfaces and effects**
  - [x] Effects on every layer and group, applied in order, non-destructive, each with an on/off switch: **bevel and surface** (a height map from the shape through a profile — rounded, chiselled, cove, rim, steps — raised or sunk in, plus a surface — hammered, grain, brushed, cracked plates, scales — turned into normals and lit by the light dial, with shine), **shadow** (outside or inside), **glow** (outside or inside), **material colour** (a gradient map, 14 materials), **colour adjust** and **wear and grime**
  - [x] Sizes in band widths (the same look at every size, shape and thickness); plain pixel arithmetic, so preview, export and node draw the same picture
  - [x] Effects on groups see their layers as one shape; band clipping clips effects; clip-to-below masks ignore the base's effects; pictures with and without effects cached separately
  - [x] Faceted shapes and paths (flat top or a point, steepness), with face normals worked out in 3D and lit by the light; cut gem, hexagonal plate and crystal shard elements
  - [x] Ten more blend modes and a knockout ("Cut a hole in the layers below"), kept apart from colour blending
  - [x] The style library: 26 styles in six groups, each tile your own design in that style; applies to every picked layer, replacing or adding, one undo step
  - [x] Copy effects / Paste effects onto every picked layer
  - [x] Four templates made with effects: Dwarven bronze and Eldritch crystal (the brief's two examples), Radiant gold, Hellforged iron
  - [x] A sharp preview without lag: designs with effects are drawn at screen size first and sharpened when editing pauses
  - [x] Schema version 5 with a migration from version 4; version-4 fixture files saved by Phase 5 open and draw as before (versions 1–3 too)
  - [x] `npm run effects-sheet` draws every style and effects template
  - [x] Tests: 565 unit tests (87 new: every effect and its lighting, size independence, shadows, glows, materials, adjust, wear, groups, clipping, caching, shapes, a time budget, the helpers, facets and elements, every blend mode and the knockout, the migration and v4 fixtures, the Effects panel, the style library, copy and paste, facets and knockout controls, help tips on every new control) and 58 Playwright runs (31 flows: 27 × 2 desktop sizes and 4 on a phone; 4 new: the "done when" flow, the templates and pasting effects, adding effects and facets, axe on the Effects section and the style library)
  - **Done when:** a band given a style from the library becomes hammered bronze, follows the light dial, can be adjusted and undone, and its exported picture is the picture the renderer draws from the saved file ✔ (Playwright "done when" test)
- [x] **Phase 7 — Ornaments anywhere**
  - [x] Repeats follow a path or line layer (open or closed, mirrored copies included, hidden or not) instead of the band: count or spacing along it, facing along it or upright, alternate sides, size along the way, seeded random variation of size, angle and gaps (`render/track.ts`)
  - [x] Radial arrays on shapes and paths: copies round the anchor, distance, start angle, every other one mirrored; works on the band and placed freely, with mirroring
  - [x] Gem cuts: brilliant, rose, emerald (step cut), cabochon, rough crystal; facets, table, crown height, sparkle, all lit by the light; bezel and four- or six-claw settings round any element, with their own metal style (effects drawn on the setting alone)
  - [x] Text layers on the band or along a path: runes (an Elder Futhark alphabet drawn from strokes), Grenze, Atkinson; size, spacing, centred or starting, read the other way, outline; effects (engraved, glowing)
  - [x] Contours layer: several lines at once, spacing, taper, alternate colour, dashes
  - [x] References between layers survive copy, paste, duplicate and the library (`cloneAllWithNewIds`); a followed layer's changes redraw only what follows it
  - [x] Template: Royal inscription
  - [x] Schema version 6 with a migration from version 5; version-5 fixture files saved by Phase 6 open and draw as before (versions 1–4 too); `npm run make-fixtures` writes a version's fixtures
  - [x] A hidden layer's row is readable (axe colour contrast)
  - [x] Tests: Phase 7 unit tests (tracks, spacing on open and closed paths, wavy lines, mirrored paths, facing, size along the way, variation, cache dependencies, copying references, picking, radial arrays, every gem cut and setting, text placement, fonts and runes, contours, the template on every shape, the migration and v5 fixtures, help tips) and Playwright runs for the "done when" flow (draw a path, gems in claws along it, an engraved inscription, every shape, export matches the renderer) and radial arrays, contours and the template with axe
  - **Done when:** a ring of gems in claw settings follows a drawn wavy path, and an engraved inscription runs round the band, both with effects, on every token shape ✔ (Playwright "done when" test)
- [x] **Phase 8 — Generators**
  - [x] Growth layer: vine, roots, thorny stem, curling tendrils, antlers; wavy and gnarled stems, branches that curl, taper and fork (up to 3 levels), leaves, thorns or berries; along the band or a path
  - [x] Cracks (forking, jagged, staying in their part of the band) and lightning (bolts running round it) as geometry
  - [x] Plates and cells: irregular (Voronoi), honeycomb, bricks, tiles, scales; gap, rounding, missing pieces, colour variation; each plate bevelled on its own by a style
  - [x] Knotwork with real over/under crossings; gears (teeth, spokes, hub, domed boss, meshing); interlocking chains
  - [x] Distortion effect (noise displacement) and scratches on wear; lines whose waves fit the band; gear-tooth and claw-gash elements
  - [x] Converted Druid, Knotwork, Artificer and Barbarian, with comparison limits (22 frames convert)
  - [x] Template: Overgrown ruin, made only from generators and styles
  - [x] Schema version 7 with a migration from version 6; version-6 fixture files saved by Phase 7 open and draw as before (versions 1–5 too)
  - [x] Tests: every generator repeatable, seeded, on every shape, growing with the band, pickable and with effects; growth (waves, leaves, branches from the stem, taper, depth, antlers, following a path), cracks staying in their part, lightning running round, cells inside their part, missing and varied, bevelled plates, knotwork arcs and swapping, gears' sizes and meshing, chains' even links, distortion, scratches, fitted waves, the template, the migration and v6 fixtures, help tips, the four conversions' limits; Playwright: the "done when" flow (template, changes, every shape, export matches the renderer) and adding every generator, the four conversions and axe
  - **Done when:** an "Overgrown ruin" template (cracked stone plates with missing fragments, roots growing through, a knotwork band) is built only from generators and styles ✔ (Playwright "done when" test)
- [x] **Phase 9 — Precise control**
  - [x] Masks from any layer: its shape or its brightness, inverted or not; the mask layer can be hidden
  - [x] Shared height map: layers raise or carve into their group's surface, lit by the group's bevel as one surface; height and normal map views (Advanced → Show); extruded sides
  - [x] Combining a group's shapes (union, subtract, intersect, exclude), grow and shrink, paths stroked into tapered shapes, shapes turned into paths
  - [x] Separate in/out handles (a button, or Alt while dragging); moving a group by dragging any of its layers; turning a group round the token; zoom (to 800 %) and pan
  - [x] Template: Rune-carved plates
  - [x] Schema version 8 with a migration from version 7; version-7 fixture files saved by Phase 8 open and draw as before (versions 1–6 too)
  - [x] Tests: masks (shape, brightness, inverted, missing), carving and raising in a shared height map, height-only layers, no bevel no change, the views, the template on every shape, sides, grow and shrink, every combine mode and a bevel on it, strokes and tapers, separate and joined handles, a shape as a path, turning layers, the migration and v7 fixtures, help tips; Playwright: the "done when" flow (height-map view with and without the carving, normal map, export matches the renderer and shows the carving) and a mask, combining, turning and dragging a group, zoom
  - **Done when:** runes cut through a raised plate share one height map with it (the plate's bevel follows the cut edges), seen in the height-map view and in the export ✔ (Playwright "done when" test)
- [ ] **Phase 10 — Workflow** (randomise, your own styles, a theme colour, a lighting rig, batch export, more shapes with Token Maker)

## Known limitations after Phase 6

- **Token Maker can't open version-5 designs yet:** its copy of the reader and renderer is from Phase 5. Run `npm run share:export -- ..\token-maker` (then Token Maker's tests) to give it effects; until then, keep version-4 copies of designs meant for Token Maker.
- Effects are work on every pixel: a design with many effects takes a second or two to open at a large preview, and very large exports (4096 px) take a while and need a lot of memory.
- Height doesn't combine between separate layers yet (a bevel sees only its own layer, or its group as one shape); overlapping layers are lit one by one (Phase 9 adds a group's shared height map).
- One light: its height is set per bevel; no coloured or second lights, bloom or light bleeding onto neighbouring layers (Phase 10).
- Facets are drawn from the centre of the shape's corners, so a very uneven drawn path can get odd faces.
- Styles can't be saved as your own yet (copy and paste effects in the meantime; a layer with effects can go in your library).
- Still from Phase 5: the library and paste copy are per browser; no zoom; reordering on a phone uses the arrow buttons; eight Token Maker frames can't be converted.

## Known limitations after Phase 5

- In Token Maker a design's colours come from the design; Token Maker's Frame colour and highlights colour don't recolour it (change it in Frame Studio and open it again).
- The library and the shared copy for pasting live in this browser only (move the library with Export all / Import).
- On a phone, layers are reordered with the arrow buttons (dragging rows in the list needs a mouse), and there is still no zoom, so small shapes on a thin band are fiddly; the numeric values in Advanced help.
- Pasting with the Paste layers menu item asks the browser for the clipboard; if it says no, the layers last copied in a Frame Studio tab are used.
- Still from Phase 4: eight Token Maker frames can't be converted; converted frames' colours don't follow a later change of the band's colour.

## Known limitations after Phase 4 (for the record)

- Eight Token Maker frames can't be converted yet (Stamped, Ranger, Bard, Warlock, Barbarian, Artificer, Druid, Knotwork); they stay one layer, lit from the top left.
- Converted frames look like the originals but aren't identical in fine detail, mostly their ornaments (DESIGN.md §4.7 lists each). Paladin's crosses are lit from the stage's light; Cleric's rays can be one or two more or fewer.
- A converted frame's colours are worked out when it is converted: changing the band's colour afterwards doesn't recolour the textures, grooves and rims to match (each layer has its own colour).
- Arcane, Infernal and Wizard's marbling (and every marble texture keeping to the shaded side) judges "shaded" from its own colour lit the usual way, not from the band underneath.
- Hexagon corners: a repeated shape exactly on a corner faces along one of its two sides, which can differ from Token Maker's choice.
- Still from Phase 3: very large designs at a big preview size redraw some layers (128 MB cache); "Where" for textures follows the angle from the centre; scales are always lit from the outer edge; picking a texture picks anywhere in its part of the band.
- Still from Phase 2: desktop only; no drop indicator line when dragging layers; path points sharp or smooth only; no zoom; small kinks in wavy lines at square and hexagon corners; groups can't be moved as a whole on the canvas.

## Known limitations after Phase 3 (for the record)

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
