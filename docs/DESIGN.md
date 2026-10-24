# Frame Studio — Design Document

> **Purpose of this file:** the single source of truth for Frame Studio. Anyone (person or AI) building it reads this whole file first, follows it, and updates it when a decision changes. Read `docs/TOKEN-MAKER-CONTEXT.md` for how the existing Token Maker frames work, and `docs/PROJECT-STARTER.md` for the owner's original brief.

---

## 1. What we are building

A visual editor for **code-drawn artwork**, starting with token frames for D&D and other TTRPGs. It should feel like a much simpler Photoshop or vector editor: a canvas in the middle, a layer list, and a properties panel with sliders, colour pickers and dropdowns. The owner does not code, so nothing in normal use needs code; technical controls live in **Advanced**.

Behind the visual editing, a design is **structured data** (a `FrameProject`), never source code. The renderer reads the data and draws it. That separation (data ↔ editor ↔ renderer) is the foundation everything else rests on.

**Goals**

- Start from any of Token Maker's 27 frames, or from scratch.
- Build designs from layers that adapt to every token shape and thickness.
- Save, reopen and share designs as files; export pictures.
- Later: turn Token Maker's frames into fully editable layers, and use Frame Studio designs inside Token Maker.

**Non-goals for now:** phone/touch layout (the code is structured so it can come later), accounts, running user-supplied code.

## 2. Owner decisions (October 2026)

| Question | Decision |
|---|---|
| Where does it live? | Its own repository, **GroudonMcL/Frame-Studio**. |
| How is Token Maker's drawing code reused? | **Copied** into `src/engine/legacy/`, byte for byte, with a manifest of hashes, a check script and a test (§3). |
| How does a design relate to the token's shape? | **Adapts to the shape**: layers are placed relative to the frame band, so one design works on circle, rounded, square and both hexagons at any thickness (§4.2). |
| What does it produce first? | Project files (`.framestudio.json`) and PNG pictures. Using designs inside Token Maker is a later phase. |
| How is work delivered? | A pull request per phase. |
| Light direction? *(after Phase 1)* | Add a **light-direction control**, defaulting to the **top left** (225°, Token Maker's light). Built in Phase 2 (§5.1). |
| How do designs reach Token Maker? *(after Phase 1)* | Token Maker **opens `.framestudio.json` project files** directly, so designs stay editable and scale cleanly. Planned for Phase 5 (§8). |
| Free shapes and paths: tied to the band or placed freely? *(after Phase 1)* | **Adaptable by default**: placed at a point round the band (angle + across), so they still fit every shape and thickness. Placing freely stays available as an option. Built in Phase 2 (§4.4). |

## 3. Tech stack

Same as Token Maker, so code and habits carry over: TypeScript, React 19 + Vite, Canvas 2D, Zustand (with token-maker's `history.ts` for undo), `idb-keyval` for autosave, Vitest (+ `@napi-rs/canvas` for pixel tests), Playwright, ESLint. Same visual identity ("Lamplit Workbench", `src/styles/tokens.css` copied from Token Maker). No new dependencies beyond Token Maker's.

**The engine copy.** `src/engine/legacy/` holds unchanged copies of token-maker's `src/render/{catalog,color,frameKit,frames,finishes,shapes,sampleArt}.ts` (plus a 9-line `render.ts` stand-in for one type). `SOURCE.json` records the token-maker commit and each file's SHA-256.

- Never edit those files here. Change Token Maker, then `npm run engine:sync -- ../token-maker` (copies changed files, records the new commit and hashes) and run the tests.
- `npm run engine:check -- ../token-maker` reports differences without copying.
- `src/engine/legacy/engine.test.ts` fails if a copied file was edited here.

## 4. The project format

### 4.1 FrameProject (schema version 2)

Defined in `src/project/types.ts`; defaults in `src/project/defaults.ts`; reading and checking in `src/project/migrate.ts`; finding layers anywhere in the tree in `src/project/tree.ts`.

```ts
interface FrameProject {
  format: 'frame-studio-project';
  schemaVersion: 2;
  name: string;
  stage: { shape; thickness; outerSpacing; showArt; backingColor;     // how it's previewed, not the look
           light };                                                   // where the light comes from (§5.1)
  layers: Layer[];                                                    // bottom first
}
// Every layer: id (stable, unique in the whole tree), name, visible, locked, opacity 0–1, blend,
//              clip: 'none' | 'band' | 'below'                        (§5.2)
type Layer =
  | { type: 'legacyFrame'; presetId; style; color; accent | null }     // a Token Maker frame, one composite layer
  | { type: 'bandFill'; from; to; paint }                              // colours part of the band
  | { type: 'line'; at; width; paint; dash; glow | null;               // a line round the band…
      waveAmplitude; waves; wavePhase }                                // …optionally wavy (vines, knotwork)
  | { type: 'repeat'; element; mode; count; spacing; snapToCorners;    // one shape repeated round the band
      at; size; stretch; rotation; offset; fill; outline | null; outlineWidth;
      raised; glow | null; accentEvery; accentScale; accentColor | null; seed;
      altColors; altSizes; skipAroundAccent; alternateSides }          // patterns (Phase 2)
  | { type: 'shape'; ...Placement; ...PlacedStyle;                     // one circle / rectangle / polygon / star
      shape; sides; innerRatio; corner }
  | { type: 'path'; ...Placement; ...PlacedStyle; points; closed }     // a drawn shape (§4.5)
  | { type: 'group'; children: Layer[]; collapsed }                    // layers kept together (§5.2)
  | { type: 'unsupported'; originalType; data; reason };               // kept, never drawn (see 4.3)
type Placement = { place: 'band' | 'free'; along; across; x; y;       // §4.4
                   size; stretch; rotation; mirror: 'none' | 'leftRight' | 'topBottom' | 'four' };
type PlacedStyle = { fill | null; shaded; outline | null; outlineWidth; raised; glow | null };
type Paint =
  | { kind: 'solid'; color }
  | { kind: 'lit'; color; light; dark; pressed }    // token-maker's metal lighting (litTables), turned to stage.light
  | { kind: 'linear'; angle; stops }                // across the token
  | { kind: 'acrossBand'; stops }                   // outer edge → inner edge
```

Elements for `repeat`: bead (shaded sphere), circle, diamond, square, triangle, star, cross, rune, leaf, spike, and (Phase 2) chevron, tick mark, gear, eye (iris in the element's colour), music note (single or paired, varied by the seed) and claw marks.

Repeat patterns (Phase 2), all off by default:

- `altColors`: colours taken in turn after `fill` (light, dark, light, dark…; Harlequin, Ranger).
- `altSizes`: sizes taken in turn, as multiples of `size` (big, small…; Cleric's rays).
- `skipAroundAccent`: leave out this many elements either side of each bigger one (Monk's jade beads).
- `alternateSides`: every other element moves inwards by this many band widths, the rest outwards, and points the other way (Druid's leaves).

### 4.2 Units: measured against the band

So a design fits every shape and thickness, nothing is in pixels:

- **Across** positions (`from`, `to`, `at`): 0 = the band's outer edge, 1 = its inner edge. −0.5 … 1.5 is allowed, to reach past the band.
- **Sizes** (`width`, `size`): fractions of the band's width.
- **Along** (`offset`): fractions of one gap between repeated elements.
- **Stage** thickness and outer spacing: fractions of the token's half-size, the same numbers Token Maker uses on a Medium token (0.14 and 0.1 by default).

These are the conventions of token-maker's `frameKit.ts` (`alongBand(g, count, at)`, sizes as multiples of `w`), so converted frames will keep their numbers.

### 4.3 Reading files safely

- A file must say `format: 'frame-studio-project'` and a `schemaVersion` ≤ the one this version knows; otherwise it is refused with a plain-English reason. Future versions add a migration (`MIGRATIONS[n]` turns version n into n + 1).
- Every field is checked; a bad value falls back to its default and a warning is shown. Numbers are clamped to their ranges.
- A layer kind this version doesn't know becomes an `unsupported` layer: kept exactly, saved back exactly, shown with a warning, not drawn. Nothing is silently dropped. This works inside groups too.
- Duplicate layer ids (anywhere in the tree) get fresh ones. Groups can nest up to 8 deep.
- **Version 1 → 2** (`MIGRATIONS[1]`): adds `stage.light = 225` and, on every layer, `clip: 'none'`; lines get no wave, repeats get no patterns. A test (`src/project/fixtures.test.ts`) opens real version-1 files saved by Phase 1 (`src/project/fixtures/v1/`) and checks that they draw pixel for pixel as Phase 1 drew them.
- Nothing in a file is ever run as code.

### 4.4 Shapes and paths: placed on the band or freely (owner's answer 3)

A shape or path has one anchor point and is drawn in its own little frame around it:

- **On the band** (`place: 'band'`, the default): the anchor is `along` the way round (0–1, clockwise from the top, measured along the outline at its across position) and `across` the band (as in §4.2). Its height is `size` band widths, and it turns with the band: "up" points outwards, so a shape on the right-hand side lies on its side, exactly like the repeated elements. The same design therefore fits every token shape and thickness.
- **Placed freely** (`place: 'free'`): the anchor is at `x`, `y` (fractions of the half-size from the centre, +y down) and the height is `size` half-sizes. It ignores the band. Switching between the two keeps the layer where it is on screen (`switchPlace` in `render/hitTest.ts`); a free layer far inside the opening moves to the nearest allowed place on the band (across −50 % … 150 %).
- `stretch` is width ÷ height, `rotation` degrees clockwise on top of following the band.
- **Mirror** adds copies: a left/right pair, a top/bottom pair or all four. Every token shape is symmetric about both axes, so a mirrored copy lands at the matching place on the band. Copies are flipped, but their shading still comes from the stage's light (not a mirrored light).

The transforms are in `render/placed.ts` (`placement`, `placements`, `toCanvas`, `toLocal`) and are shared by drawing, picking and the on-canvas handles, so they always agree.

### 4.5 Path points

A path's points are in its own units: x along (right), y in (down), where 1 is half the layer's height. A point has an optional `handle`: the curve's control point leaving it, relative to it; the one arriving is its mirror image, so a point is either **sharp** (no handle) or **smooth** (a symmetrical curve). That covers gems, leaves, blades and flourishes while staying easy to edit; separate in/out handles can be added later without breaking files (a second optional field). A path is filled only when `closed`; open paths show their outline.

## 5. The renderer

`renderProject(ctx, project, size, { art })` in `src/render/renderProject.ts` draws the preview, the template thumbnails, the PNG export and the test images. One renderer, so the export always matches the preview.

1. Clip to the square; origin at the centre.
2. If `stage.showArt`: the backing colour and the sample picture inside the band's middle (where token-maker's art runs to).
3. Layers, bottom first (`drawStack`). A layer with opacity < 100 %, a blend mode other than Normal or a clip to the layer below is drawn on its own canvas first and then composited, so its opacity is even where its parts overlap. A group draws its own layers as a stack in the same way.

Painters per type are in `src/render/layers.ts` (shapes and paths in `src/render/placed.ts`). The legacy layer calls token-maker's `drawFrame` with exactly the geometry token-maker would use; a test checks every frame is pixel-identical to a direct `drawFrame` call.

Editor-only drawing (selection outlines, handles, path points) is on a separate overlay canvas and never reaches the export.

### 5.1 The light direction

`stage.light` is where the light comes from, in degrees (0 right, 90 below, 225 top left). `src/render/light.ts` turns everything Frame Studio lights itself:

- the `lit` paint: token-maker's 360-entry colour tables are turned round so their lit side faces the light (`turnTable`); on lines, the stand-in gradient turns with it;
- beads (`sphere`) and the shading of elements, shapes and paths (`lightAt`, `shadedFill`);
- raised shadows fall away from the light (`raisedFrom`).

At 225° every one of these returns exactly the engine's own values, so version-1 designs draw the same. **Token Maker frames** (legacy layers) are lit inside the copied engine, which must not be edited; they stay lit from the top left until they are converted into editable layers (Phase 4), and their Properties say so when the light is moved.

### 5.2 Groups and clipping

- A **group** holds its own bottom-first list of layers. Hiding it hides them; locking it locks them (they can't be picked or edited); its opacity and blend mode apply to them together. A group at full opacity and Normal blend draws its layers straight into the picture ("pass through").
- **Clip to the band** draws the layer (or group) only between the band's outer and inner edges.
- **Clip to the layer below** works like a clipping mask: the layer shows only where the nearest layer below it that isn't itself clipped has paint. If that layer is hidden, so is the clipped one; with nothing below, nothing shows.

**Later:** cache each layer's canvas by its settings and size (as token-maker caches frames) when designs get heavy (Phase 3). Clipping to the layer below currently draws that layer a second time for the mask.

## 6. The editor

`src/App.tsx` + `src/ui/`. Desktop layout (min 960 px wide):

- **Top bar:** name (click to rename), New (template picker), Open, Save (`.framestudio.json`), Export PNG (256–2048 px, with or without the sample picture), Undo/Redo, **Basic / Advanced** switch.
- **Layers panel (left):** top of the stack first; a group's layers sit indented under it and the group folds open and shut. Click to select; **Ctrl+click** adds a layer to the selection and **Shift+click** selects a run; eye = show/hide; padlock = lock; double-click or F2 to rename; drag, Alt+↑/↓ or the arrow buttons to reorder (at the top or bottom of a group, moving steps out of it; dropping on the lower half of a group's row puts the layer in it); **Group** (Ctrl+G) puts the selected layers in a new group where the top-most of them was; **Ungroup** (Ctrl+Shift+G); Duplicate (Ctrl+D, a group with everything in it); Delete (Del). **Add layer** offers Band fill, Line, Repeated shapes, Shape, Path, Group and Token Maker frame….
- **Canvas (middle):** live preview on a checkerboard. Click picks the top-most layer under the pointer (inside groups too). Dragging a line, band fill or repeat moves it across the band; dragging a repeat round the token slides its elements along. Dragging a shape or path moves it (round the band, or anywhere when placed freely). A selected shape or path shows its box, a **square resize handle** (bottom right) and a **round turn handle** beyond the box (Shift snaps to 15°); the turn handle moves to the inner side when the outer side would be off the picture. A drag is one undo step. Below it: token shape, band thickness, the **light dial**, show sample picture (Advanced: outer spacing, backing colour).
- **Drawing a path:** Add layer → Path starts drawing. Each click adds a point (the first click places the path on the band); click the first point or press Enter to finish (the path is then closed), Escape to stop without closing. When drawing ends the path's anchor moves to the middle of what was drawn, so it turns and resizes about its centre. **Edit points** (Properties) shows the points (squares) and curve handles (circles): drag them; double-click a point to make it smooth or sharp; Delete removes the chosen point; **Add points** carries on drawing.
- **Light dial:** drag the sun round, or focus it and use the arrow keys (Shift = 15° steps); the reset button returns it to the top left.
- **Properties panel (right):** controls for the selected layer's type. Basic shows the common ones (for repeats, a **Patterns** section: alternate colours and sizes, alternate sides; for lines, **Wavy**; for shapes and paths: fill, shading, outline, mirror, raised, **Place freely**). Advanced adds opacity, blend mode, **clip**, outline, glow, "bigger one every…" and "leave gaps beside the bigger ones", rune/note pattern, gradient stop positions, highlight/shade amounts, the **numeric position, size, stretch and rotation** of shapes and paths, and **Project data** (the JSON, editable and checked like an opened file).
- **Template picker:** Blank, designs built from editable layers ("Brass & beads", "Glowing runes", "Jewelled"), and the 27 Token Maker frames with live thumbnails. Also used to add a Token Maker frame as a layer.

Undo/redo works on the structured project (token-maker's `history.ts`): every edit is one step; a slider, colour-picker, handle or point drag is one step. Loading a project starts a fresh history.

Autosave: the project's JSON is written to IndexedDB (`frame-studio:project`) 0.4 s after each change and restored on the next visit. First visit opens Token Maker's Stamped frame.

## 7. Quality rules

- Read this file first; update it, `PROGRESS.md` and `README.md` at the end of every phase.
- Never edit `src/engine/legacy/`; sync from Token Maker instead.
- One renderer for preview and export. Keep it pure and pixel-tested.
- Don't present a Token Maker frame as editable parts until it really is converted.
- Every new layer type: type + defaults + checker in `migrate.ts` + painter + properties + hit test + tests.
- Every new schema version: a migration, and version-1 (and later) fixture files that must still open and draw the same.
- Don't claim tests passed without running them. Run `npm test`, `npm run e2e`, `npm run typecheck`, `npm run lint`, `npm run build` before a PR.
- Plain-English summaries and Windows PowerShell commands for the owner.
- Progress screenshots: `npm run screenshots` (with `npm run dev` running) writes `docs/screenshots/`.

## 8. Roadmap

See `docs/BUILD-PROMPTS.md` for the full prompt of each phase and `docs/PROGRESS.md` for the checklist.

| Phase | Goal |
|---|---|
| 1 | Foundation: templates, the format, the first layer types, layers panel, properties, undo, save/open, PNG, autosave **(done)** |
| 2 | Drawing tools: shapes and editable paths (adaptable by default, free placement optional), groups, clipping, transforms, mirroring, more elements, alternating patterns, wavy lines, direct handles on the canvas; the light-direction control **(done)** |
| 3 | Procedural layers: marble, hammered metal, battle wear, wood grain, stone blocks, scatter (stars), rope, scales; the colour-around-the-ring paint; per-layer caching |
| 4 | Converting Token Maker frames into editable layers, starting with Polished (simple) and Paladin or Arcane (intricate), with visual comparison tests |
| 5 | Polish and sharing: a personal layer library, copy/paste between projects, touch support, Token Maker opening `.framestudio.json` files |

## 9. Owner answers and open questions

**Answered after Phase 1** (recorded in §2):

1. **Light direction:** add a light-direction control; the default is the top left, as in Token Maker.
   - It is a project setting (`stage.light`, degrees the light comes from: 0 right, 90 below, 225 top left), added in schema version 2 with a migration that gives older projects 225°.
   - It drives everything Frame Studio's own code lights: the `lit` paint, shaded beads and element gradients, and the direction of raised shadows.
   - Token Maker frames (legacy layers) are lit from the top left inside the copied engine, which must not be edited. They stay top-left lit until converted into editable layers (Phase 4); the Properties panel says so when the light is moved.
2. **Using designs in Token Maker:** Token Maker opens `.framestudio.json` project files.
   - Token Maker needs Frame Studio's project reader and renderer (`src/project/`, `src/render/`). Phase 5 decides how they are shared (copied with a manifest like the engine, or a shared package), keeping one renderer so the frame looks the same in both.
   - In Token Maker the design becomes a third frame kind beside "drawn" and "picture", with its band following Token Maker's thickness and spacing.
3. **Free shapes and paths:** adaptable by default.
   - A new shape or path is anchored at a point round the band (an angle round the token and an across position) and sized in band widths, so it follows every shape and thickness.
   - "Place freely" (token units, ignoring the band) is an option per layer, for artwork that should not move with the band.

**Decided while building Phase 2** (sensible defaults within the owner's answers; say if any should change):

1. **Groups are nested in the file** (a group layer holds its `children`), not a flat list with parent ids, so a saved group reads like the layer list looks.
2. **Clipping** is per layer: to the band, or to the layer below (like a Photoshop clipping mask).
3. **Path points are sharp or smooth** (one symmetrical handle). Separate in/out handles can come later without breaking files.
4. **Free placement** measures position and size in fractions of the token's half-size (the same unit as the stage's thickness).

**Still open**, with the default used until answered:

1. **Phone support.** *Default: desktop first; touch in Phase 5.*
