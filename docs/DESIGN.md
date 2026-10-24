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

**Non-goals for now:** accounts, sharing online (designs travel as files), running user-supplied code. *(Phones and touch came in Phase 5, §6.3.)*

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
| Procedural textures? *(Phase 3 prompt)* | Nine **texture layers** re-implementing Token Maker's textures, each identical to the original at its default settings; a colour-round-the-ring paint; per-layer caching. Built in Phase 3 (§4.6, §5.3). |
| Phase 5: layer library, sharing with Token Maker, phones *(Phase 5 prompt)* | A **personal layer library** in IndexedDB with library files; **copy and paste** through the system clipboard and a shared copy for other tabs; a **phone layout** (canvas over a bottom sheet, 44 px targets) with keyboard access and axe checks; **Token Maker gets Frame Studio's reader and renderer by copy with a manifest** (the engine's own pattern, in the other direction), one renderer in both apps (§10). Built in Phase 5; the Token Maker side waits for access to its repository (§9). |
| Converting Token Maker frames? *(Phase 4 prompt)* | A **converter per frame** writes its parts as editable layers with Token Maker's own numbers; each conversion is measured against the original and held to a limit. 18 frames (17 drawing styles) are converted; the originals all stay available. Where a conversion can't be exact, "looks the same" is enough (the owner's answer before Phase 5, §9). Built in Phase 4. |

## 3. Tech stack

Same as Token Maker, so code and habits carry over: TypeScript, React 19 + Vite, Canvas 2D, Zustand (with token-maker's `history.ts` for undo), `idb-keyval` for autosave and the layer library, Vitest (+ `@napi-rs/canvas` for pixel tests), Playwright, ESLint. Same visual identity ("Lamplit Workbench", `src/styles/tokens.css` copied from Token Maker). No new dependencies beyond Token Maker's, except `@axe-core/playwright` (a test-only tool, added in Phase 5 for the accessibility checks the brief asks for).

**The engine copy.** `src/engine/legacy/` holds unchanged copies of token-maker's `src/render/{catalog,color,frameKit,frames,finishes,shapes,sampleArt}.ts` (plus a 9-line `render.ts` stand-in for one type). `SOURCE.json` records the token-maker commit and each file's SHA-256.

- Never edit those files here. Change Token Maker, then `npm run engine:sync -- ../token-maker` (copies changed files, records the new commit and hashes) and run the tests.
- `npm run engine:check -- ../token-maker` reports differences without copying.
- `src/engine/legacy/engine.test.ts` fails if a copied file was edited here.

## 4. The project format

### 4.1 FrameProject (schema version 4)

Defined in `src/project/types.ts`; defaults in `src/project/defaults.ts`; reading and checking in `src/project/migrate.ts`; finding layers anywhere in the tree in `src/project/tree.ts`.

```ts
interface FrameProject {
  format: 'frame-studio-project';
  schemaVersion: 4;
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
      altColors; altSizes; skipAroundAccent; alternateSides;          // patterns (Phase 2)
      shaded; show }                                                   // flat colour, on/off pattern (Phase 4)
  | { type: 'texture'; kind; from; to; color; color2 | null;           // a procedural surface (§4.6, Phase 3)
      amount; scale; strength; where; seed }
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
  | { kind: 'lit'; color; light; dark; pressed;     // token-maker's metal lighting (litTables), turned to stage.light
      highlight | null }                            // the lit side's colour; null = the engine's default (Phase 4)
  | { kind: 'linear'; angle; stops; followLight }   // across the token; optionally turning with the light (Phase 4)
  | { kind: 'acrossBand'; stops }                   // outer edge → inner edge
  | { kind: 'ring'; stops: { angle; color }[]; followLight }  // colours round the ring (Phase 3)
// Gradient stops (linear, acrossBand): { at; color; opacity }  — opacity added in Phase 4
```

Phase 4 added only what the converted frames needed, each useful on its own and off by default:

- `lit.highlight`: the colour the lit side goes towards (Paladin's white, Gilded's pale gold, Arcane's grey…), passed to the engine's `litTables`.
- Gradient stop `opacity`: see-through colours (Token Maker's lit outer rim fades from 90 % to nothing).
- `linear.followLight`: the gradient's angle is for a light at the top left and turns with `stage.light`, so a converted frame's lit rim follows the light dial.
- Repeat `shaded` (off = one flat colour, as Harlequin's diamonds and Cleric's rays) and `show`, an on/off pattern of which elements are drawn (`[true, false]` = every other one). Two repeats with opposite patterns alternate any style, not only colours: Harlequin's light and dark diamonds have different opacities; pairs alternate with `[true, true, false, false]`. Elements left out keep their number, so alternate colours, sizes and rune patterns don't shift.

The **ring paint** blends between colour stops at angles round the token (0° right, 90° below), one colour per degree, drawn as thin wedges like the lit paint (`ringTable`, `angularFill` in `render/paint.ts`). It is how Stamped's hand-sampled colour tables can be expressed. With `followLight` (the default) the colours are for a light at the top left and turn with `stage.light`. On lines, the line is stroked on its own canvas and recoloured (`recolourRound`).

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
- **Version 2 → 3** (`MIGRATIONS[2]`): only adds things (texture layers, the ring paint), so nothing changes. Version-2 files saved by Phase 2 are in `src/project/fixtures/v2/`.
- **Version 3 → 4** (`MIGRATIONS[3]`): lit paints get `highlight: null`, linear paints `followLight: false`, gradient stops `opacity: 1` and repeats `shaded: true, show: []`, in groups too, so nothing changes. Version-3 files saved by Phase 3 (a lit/pressed/across/linear paint mix on a rounded token lit from 135°, and both texture templates) are in `src/project/fixtures/v3/`.
- Fixture files must draw as their version drew them (their `.png` beside them). Since Phase 3 every layer is drawn on its own canvas and composited (§5.3), which changes the rounding of a few nearly transparent edge pixels by a few 255ths; the test allows at most 8/255 in any premultiplied channel and a mean under 0.5/255, which is invisible. A single layer on its own (for example a Token Maker frame against `drawFrame`) is still pixel for pixel.
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

### 4.6 Texture layers (Phase 3)

A texture layer draws a procedural surface over the band between `from` and `to` (across positions, as a band fill), clipped to that part of the band. It is drawn over the layers below it, like token-maker's textures over the band colour. Kinds (`render/textures.ts`), each a re-implementation of the token-maker code it is named after:

| Kind | Token Maker original | Lit by the stage light |
|---|---|---|
| `marble` | `marble` (Stamped-like marbling and flecks; 9 frames) | which side it keeps to |
| `hammered` | `hammerTexture` (Fighter, Magma, Cobblestone, Barbarian, Rogue) | bright flecks on the lit side |
| `wear` | `battleWear` (Fighter, Barbarian) | dents and scratch edges |
| `wood` | Oak's grain and knots (Oak, Druid) | – |
| `stone` | Cobblestone's blocks, mortar and pitting | the pitting |
| `scatter` | Starfield's haze and stars | – |
| `rope` | `ropeStrands` (Monk) | the strands' shading |
| `scales` | `drawScales` (Sorcerer) | – (lit from the outer edge, as the original) |
| `cracks` | Magma's glowing cracks | – |

- `color` is the colour the marks are made from (lighter and darker shades of it), so it should match the band underneath; for `scatter` it is the stars' colour and `color2` the haze (or none); for `cracks` it is the glow.
- `amount` (how many), `scale` (how big) and `strength` (how strongly they show) are all relative: **1 is what Token Maker draws**. `seed` picks the variation (`seededRandom`, so preview and export match).
- `where`: everywhere, mostly on the shaded side, or mostly on the lit side, following `stage.light`. Marble does it as the original does (marbling is left out where the band, lit the usual way in the texture's colour, is light); the others are faded towards that side.
- Every painter, at its default numbers and the original's seed, is **pixel for pixel** the original: `render/textures.test.ts` calls the finishes' own texture functions (`FINISHES.gilded.texture` etc.) and compares, on three shapes. The engine is not edited and its unexported functions are not imported.
- The **texture library** (`TEXTURES` in `project/defaults.ts`; Add layer → Texture…) offers 11 presets with live thumbnails, optionally with a matching band fill under them.

### 4.7 Converted Token Maker frames (Phase 4)

`src/project/convert.ts` turns a Token Maker frame into editable layers. Every drawn frame shares one build (TOKEN-MAKER-CONTEXT.md §2.2), so a converter is a few lines on top of shared pieces, written with the numbers in the frame's finish:

| Token Maker part | Layers |
|---|---|
| Band (`litTables` with the finish's lighting) | Band fill, `lit` paint with the finish's light, dark and highlight |
| Pressed-in step | Band fill from `1 − step` to 1, the same paint `pressed` |
| Texture (clipped to the band) | Texture layers, grooves (a group of two lines), patterns; each clipped to the band |
| Crease | Line at `1 − step`, 3 % wide, `#190500` at 55 % opacity |
| Rims | "Outer rim (lit)": line at 2 %, 4 % wide, a see-through gradient from the top left that turns with the light; "Inner rim (shadow)": line at 98.8 %, 2.4 % wide, `#0a0200` at 60 % |
| Ornaments | Repeats (crosses, gems, beads, runes, diamonds…) and lines (Arcane's glowing line) |

Token Maker's see-through colours (`rgba(…, 0.55)`) become a solid colour and the layer's opacity, which draws the same because a line or a repeat doesn't overlap itself. Colours come from the frame's colour and highlights colour at conversion time; after that every layer is independent.

- **In the editor:** New offers "Token Maker frames, as editable layers" (marked *Editable*) above the 27 originals; in "Add a Token Maker frame" the editable ones are added as a group. A Token Maker frame layer whose style has a converter shows **Turn into editable layers** in Properties: a group with the layer's name, visibility, opacity, blend and clip takes its place, as one undo step.
- **Converted frames follow the light** (§5.1), which the originals can't. At the top-left light they are drawn to match the originals.
- **How close each is** (`src/project/convert.test.ts`): the original (a legacy layer, itself pixel for pixel `drawFrame`) and the conversion are drawn on every shape and compared, premultiplied: the mean difference per channel (0–255) and the share of pixels that differ visibly (by more than 24/255). Polished and Paladin are checked at 96, 200 and 320 px and thicknesses 0.14 and 0.25; the others at 200 px on every shape and thick on a circle. Each has a limit a little above what it measures; `npm run compare-conversions` draws them side by side with the difference.

| Frame | Worst mean | Worst visibly different | Limit (mean / %) | What differs |
|---|---|---|---|---|
| Polished | 0.10 | 0 % | 0.15 / 0.01 | Nothing (rounding at the band's edges) |
| Oak, Cobblestone, Starfield, Fighter, Sorcerer, Gilded, Magma | 0.18–0.40 | ≤ 0.16 % | 0.25–0.5 / ≤ 0.25 | Gilded's bead shadows a little stronger; Fighter's and Magma's bright flecks (the texture layer ties their strength to the dents) |
| Double line, Harlequin, Monk | 0.53–0.82 | ≤ 1.2 % | 0.7–1.1 / ≤ 1.5 | Double line's diamonds lit by the light, more softly; Harlequin's outlines fainter on the light diamonds; Monk leaves one more small bead out beside the big one where the count doesn't divide by 9 |
| Engraved, Rogue | ~1.1 | ~1.2 % | 1.4 / 1.6 | Tick marks and stitches are flat bars with square ends (not round-capped strokes) |
| Arcane, Infernal, Wizard | 1.8–2.1 | ≤ 0.65 % | 2.4–2.6 / 0.8–0.9 | Runes and glow match; the marbling is judged by its colour lit the usual way rather than by the band's own lighting, so a few patches move |
| Paladin | 2.0 | 4.1 % | 2.5 / 5 | Frame Studio's crosses: lit from the stage's light (the original lights each one from its own top left, so the bottom crosses look lit from below), with a softer gradient; slightly thinner upright; a single shadow; at hexagon corners a cross can face along the next side |
| Cleric | 4.2 | 9.3 % | 5.5 / 12 | The rays are counted along their own line rather than the band's middle, so there can be one or two more or fewer and they drift out of step; long and short rays share one position across |

  (Worst over every shape, size and thickness tested. A mean of 1/255 is invisible; the differences above are in fine detail, which is why the default is "looks the same", §9.)
- **Not converted yet** (they stay one Token Maker layer, and say so): **Stamped** (its veins and dark-side marbling need a texture judged by its ring colours), **Ranger** (its fletching is thin stroked chevrons; the chevron element is a filled arrowhead), **Bard** (notes with Token Maker's own random placement and shapes), **Warlock** (the detailed eyes), **Barbarian** (claw gashes as paired strokes), **Artificer** (gear teeth on the inner edge and its gears), **Druid** and **Knotwork** (their waves are counted to fit the band, where a wavy line has a fixed number of waves). Each needs a new element or option; until then the original is the better choice.

### 4.8 Layers on the move: copied, saved and in library files (Phase 5)

`src/project/transfer.ts`. Layers that leave a project travel as a small project-shaped object, so they are read by `parseProject` with every check and migration of §4.3 (an old copy is migrated, a layer from a newer version stays `unsupported` and is written back as it came):

```ts
{ format: 'frame-studio-layers', schemaVersion, name, stage, layers }   // copied layers, or one library item
{ format: 'frame-studio-library', schemaVersion, items: [ …the above… ] } // a library file (.framestudio-library.json)
```

- `stage` is the stage they were made on; it is only used to draw the item's thumbnail. Put into a design, the layers follow that design's band (§4.2).
- A project file is accepted anywhere layers are (its layers become one item, named after it). A library file's items that can't be read are left out, each with a warning.
- When layers are put into a design every id is renewed (`cloneWithNewIds`), so the same item can be added any number of times.

**Project files can carry a preview** (Export → Project file with a preview): a 256 px see-through PNG as a data URL in a top-level `preview` field, after the layers, for apps that list designs (Token Maker's frame tiles). Reading a file ignores it; it changes nothing else in the format, so the schema version stays 4.

## 5. The renderer

`renderProject(ctx, project, size, { art })` in `src/render/renderProject.ts` draws the preview, the template thumbnails, the PNG export and the test images. One renderer, so the export always matches the preview.

1. Clip to the square; origin at the centre.
2. If `stage.showArt`: the backing colour and the sample picture inside the band's middle (where token-maker's art runs to).
3. Layers, bottom first (`drawStack`). Every layer is drawn on its own canvas (its *picture*, kept in the cache, §5.3) and then composited with its opacity and blend mode, so its opacity is even where its parts overlap. A group at full opacity and Normal blend passes its layers straight through; otherwise it is drawn on its own canvas from its layers' pictures and composited the same way.

Two options exist for Token Maker (§10): `band` draws on a given band (shape and edges in pixels) instead of the one the stage makes, and `clear: false` draws over what is already there. The cache key (§5.3) is the band's edges, not the stage's numbers, so both give the same pictures.

Painters per type are in `src/render/layers.ts` (shapes and paths in `src/render/placed.ts`). The legacy layer calls token-maker's `drawFrame` with exactly the geometry token-maker would use; a test checks every frame is pixel-identical to a direct `drawFrame` call.

Editor-only drawing (selection outlines, handles, path points) is on a separate overlay canvas and never reaches the export.

The stage bar keeps a fixed layout (the light's caption has a fixed width and its reset button's room is kept), so moving the light never resizes the canvas.

### 5.1 The light direction

`stage.light` is where the light comes from, in degrees (0 right, 90 below, 225 top left). `src/render/light.ts` turns everything Frame Studio lights itself:

- the `lit` paint: token-maker's 360-entry colour tables are turned round so their lit side faces the light (`turnTable`); on lines, the stand-in gradient turns with it;
- beads (`sphere`) and the shading of elements, shapes and paths (`lightAt`, `shadedFill`);
- raised shadows fall away from the light (`raisedFrom`);
- gradients with `followLight`, such as a converted frame's lit outer rim, turn their angle with it.

At 225° every one of these returns exactly the engine's own values, so version-1 designs draw the same. **Token Maker frames** (legacy layers) are lit inside the copied engine, which must not be edited; they stay lit from the top left, and their Properties say so when the light is moved. Converted frames (§4.7) are made of Frame Studio's own layers, so they follow the light.

### 5.2 Groups and clipping

- A **group** holds its own bottom-first list of layers. Hiding it hides them; locking it locks them (they can't be picked or edited); its opacity and blend mode apply to them together. A group at full opacity and Normal blend draws its layers straight into the picture ("pass through").
- **Clip to the band** draws the layer (or group) only between the band's outer and inner edges.
- **Clip to the layer below** works like a clipping mask: the layer shows only where the nearest layer below it that isn't itself clipped has paint. If that layer is hidden, so is the clipped one; with nothing below, nothing shows.

### 5.3 The layer cache (Phase 3)

`render/layerCache.ts` keeps each layer's picture between renders, keyed by everything that changes how it looks: its settings (not its id, name, visibility, lock, opacity or blend mode), the stage's shape, thickness, spacing and light, and the size. So:

- editing one layer redraws only that layer; changing opacity, blend, name, visibility or lock redraws nothing; changing the stage or the size redraws everything once;
- a layer clipped to the one below uses that layer's cached picture as its mask (it used to draw it a second time);
- one picture is kept per layer and size (a replaced picture is let go at once), with a budget of 32 million pixels (about 128 MB), least recently used first;
- renders over 2048 px are never cached (as token-maker); they still draw each layer on its own canvas, so a cached and an uncached render are **exactly** the same (tested);
- `renderStats` says how many layers the last render drew and reused; the preview canvas shows them as `data-drawn` / `data-reused` (used by the end-to-end tests).

Budget (tested): a 10-layer textured design draws at 512 px in about 140 ms from scratch and about 20 ms after editing one layer, on the test machine.

## 6. The editor

`src/App.tsx` + `src/ui/`. Desktop layout from 960 px wide (narrower screens: §6.3):

- **Top bar:** name (click to rename), New (template picker), Open, Save (`.framestudio.json`), **Export** (below), Undo/Redo, **Basic / Advanced** switch, **Help** (the welcome card).
- **Layers panel (left):** top of the stack first; a group's layers sit indented under it and the group folds open and shut. Click to select; **Ctrl+click** adds a layer to the selection and **Shift+click** selects a run; eye = show/hide; padlock = lock; double-click or F2 to rename; drag, Alt+↑/↓ or the arrow buttons to reorder (at the top or bottom of a group, moving steps out of it; dropping on the lower half of a group's row puts the layer in it); **Group** (Ctrl+G) puts the selected layers in a new group where the top-most of them was; **Ungroup** (Ctrl+Shift+G); Duplicate (Ctrl+D, a group with everything in it); **Copy** (Ctrl+C; §6.2); **Add to library** (§6.1); Delete (Del). **Add layer** offers Band fill, Line, Repeated shapes, Shape, Path, Group, **Texture…** (the texture library), Token Maker frame… (as editable layers or the original), **From your library…** and **Paste layers**. The books button beside it opens **Your library**.
- **Canvas (middle):** live preview on a checkerboard. Click picks the top-most layer under the pointer (inside groups too). Dragging a line, band fill or repeat moves it across the band; dragging a repeat round the token slides its elements along. Dragging a shape or path moves it (round the band, or anywhere when placed freely). A selected shape or path shows its box, a **square resize handle** (bottom right) and a **round turn handle** beyond the box (Shift snaps to 15°); the turn handle moves to the inner side when the outer side would be off the picture. A drag is one undo step. Below it: token shape, band thickness, the **light dial**, show sample picture (Advanced: outer spacing, backing colour).
- **Drawing a path:** Add layer → Path starts drawing. Each click adds a point (the first click places the path on the band); click the first point or press Enter to finish (the path is then closed), Escape to stop without closing. When drawing ends the path's anchor moves to the middle of what was drawn, so it turns and resizes about its centre. **Edit points** (Properties) shows the points (squares) and curve handles (circles): drag them; double-click a point to make it smooth or sharp; Delete removes the chosen point; **Add points** carries on drawing.
- **Light dial:** drag the sun round, or focus it and use the arrow keys (Shift = 15° steps); the reset button returns it to the top left.
- **Properties panel (right):** controls for the selected layer's type. Basic shows the common ones (for a Token Maker frame with a converter, **Turn into editable layers**; for repeats, **Shaded by the light** and a **Patterns** section: which ones to show (a row of on/off switches), alternate colours and sizes, alternate sides; for lines, **Wavy**; for shapes and paths: fill, shading, outline, mirror, raised, **Place freely**; for textures: kind, colour(s), how many, size, strength, where, variation with a shuffle button, start and end across the band; for the ring paint: a ring preview and each colour with its angle, "Turn with the light"). Advanced adds opacity, blend mode, **clip**, outline, glow, "bigger one every…" and "leave gaps beside the bigger ones", rune/note pattern, gradient stop positions and opacities, "Turn with the light" for gradients across the token, highlight/shade amounts and the **highlight colour** of metal paints, the **numeric position, size, stretch and rotation** of shapes and paths, and **Project data** (the JSON, editable and checked like an opened file).
- **Template picker:** Blank, designs built from editable layers ("Brass & beads", "Glowing runes", "Jewelled", and from Phase 3 "Battle-worn steel" and "Night sky"), the 18 Token Maker frames that convert into editable layers (marked *Editable*; hovering shows any small difference from the original), and all 27 Token Maker frames as the originals, with live thumbnails. Also used to add a Token Maker frame to a project, as a group of editable layers or as the original.
- **Texture library:** the 11 texture presets as tiles drawn by the renderer on a thick band; "Also add a matching band colour under it" (on by default when the project is empty) adds a lit band fill and the texture as one undo step.
- **Export** (top bar, Phase 5): a picture (PNG) at 256–2048 px or **any size from 16 to 4096 px**, with the middle see-through or the sample picture; a **sheet of the design on every token shape** (five pictures side by side, each up to 1024 px, 1/16 of a picture apart, see-through); or the **project file with a preview picture** (§4.8). All drawn by `renderProject`.
- **Help:** every control has a help tip, one plain sentence (`ui/help.ts`, or a control's own `hint`): a small "?" beside its label shows it when pointed at, tapped or focused, and screen readers hear it as the control's description (`aria-describedby`). A test opens every kind of layer and paint in Advanced mode, the stage bar and the export menu, and fails on any control without one. The **welcome card** shows on a first visit (remembered in localStorage, `frame-studio:welcomed`) and again from the **Help** button in the top bar; it doesn't block the editor.

### 6.1 The layer library (Phase 5)

`src/state/library.ts`, `src/ui/LibraryDialog.tsx`. Pick a layer or group (or several) and press **Add to library** (the bookmark under the layer list). **Your library** (the books button over the list, or Add layer → From your library…) shows every item as a tile drawn by the renderer on a thick plain band; clicking one adds its layers just above the selected layer, as one undo step, with new ids. Items can be renamed, removed and exported one at a time; **Export all** downloads a library file and **Import…** adds the items of a library file, a file of copied layers or a project file. The library is kept in this browser's IndexedDB (`frame-studio:library`, each item stored as the text of a layers file, so it is migrated when Frame Studio is updated).

### 6.2 Copy, cut and paste (Phase 5)

`src/state/clipboard.ts`. **Ctrl+C / Ctrl+X / Ctrl+V** (when not typing in a box), the **Copy** button under the layer list and **Add layer → Paste layers**. Copied layers (the picked ones, bottom first; a picked group brings its layers) go on the system clipboard as the text of a layers file, so they reach another tab, another browser window or even another browser, and into localStorage (`frame-studio:clipboard`), which every Frame Studio tab of the browser shares, for when the clipboard can't be read without asking (the Paste menu item). Pasting puts them above the selected layer with new ids, as one undo step; other text on the clipboard is left alone. Cut leaves locked layers where they are.

### 6.3 Phones, touch and the keyboard (Phase 5)

- **Narrow screens** (under 960 px): the canvas fills the top, the stage bar scrolls sideways under it, and the panels move into a **bottom sheet** with **Layers / Properties** tabs. Top-bar buttons show only their icons (their names are still read out).
- **Touch:** every target is at least **44 px** on a touch screen (`pointer: coarse`, as in Token Maker); help "?" marks are 24 px. The canvas takes every finger movement (`touch-action: none`), and handles and path points are easier to catch with a finger (20 px instead of 9); on a small shape a handle only wins when the finger is nearer to it than to the shape's centre, so a fingertip on the shape moves it.
- **Keyboard:** the layer list is a tree: ↑/↓, Home/End move the selection (Shift adds), →/← open and fold groups, Space/Enter pick, F2 renames, Alt+↑/↓ reorder; only the picked row is in the tab order. Menus take the focus, move with the arrows and close with Escape (giving the focus back); radio groups (Basic/Advanced, token shape) move with the arrows; the export menu closes with Escape. The **canvas** can be focused: the arrow keys move the selected layer (Shift for bigger steps), each press one undo step. When the focused row is deleted or cut, the focus moves to the row picked in its place.
- **Accessibility checks:** the Playwright tests run **axe** (WCAG 2.1 A/AA and best practice) on the editor in Basic and Advanced, the Add layer menu, the export menu, the template picker, the library and the welcome card, on desktop and on a phone, and fail on any serious or critical problem.

Undo/redo works on the structured project (token-maker's `history.ts`): every edit is one step; a slider, colour-picker, handle or point drag is one step. Loading a project starts a fresh history.

Autosave: the project's JSON is written to IndexedDB (`frame-studio:project`) 0.4 s after each change and restored on the next visit. First visit opens Token Maker's Stamped frame.

## 7. Quality rules

- Read this file first; update it, `PROGRESS.md` and `README.md` at the end of every phase.
- Never edit `src/engine/legacy/`; sync from Token Maker instead.
- One renderer for preview and export. Keep it pure and pixel-tested.
- Don't present a Token Maker frame as editable parts until it really is converted. Every converter has a limit in `convert.test.ts` and a row in §4.7.
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
| 3 | Procedural layers: marble, hammered metal, battle wear, wood grain, stone blocks, scatter (stars), rope, scales, cracks; the colour-around-the-ring paint; per-layer caching; texture library **(done)** |
| 4 | Converting Token Maker frames into editable layers, with visual comparison tests: 18 frames, starting with Polished and Paladin **(done)** |
| 5 | Polish and sharing: a personal layer library, copy/paste between projects, touch support, export options, help tips, Token Maker opening `.framestudio.json` files **(Frame Studio side done; Token Maker side waiting, §10)** |

## 9. Owner answers and open questions

**Answered after Phase 1** (recorded in §2):

1. **Light direction:** add a light-direction control; the default is the top left, as in Token Maker.
   - It is a project setting (`stage.light`, degrees the light comes from: 0 right, 90 below, 225 top left), added in schema version 2 with a migration that gives older projects 225°.
   - It drives everything Frame Studio's own code lights: the `lit` paint, shaded beads and element gradients, and the direction of raised shadows.
   - Token Maker frames (legacy layers) are lit from the top left inside the copied engine, which must not be edited. They stay top-left lit unless converted into editable layers (Phase 4, §4.7); the Properties panel says so when the light is moved.
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

**Decided while building Phase 3** (sensible defaults; say if any should change):

1. **Textures are re-implemented, not imported.** The engine's texture functions aren't exported and can't be edited, so `render/textures.ts` re-implements them; a test proves each is pixel for pixel the original at its defaults, so Phase 4 conversions can match exactly.
2. **"1 = Token Maker"** for amount, size and strength, so numbers read the same across kinds. Hammered metal's 100 % is Magma's density; Fighter's is 50 %.
3. **Textures follow the light** where the original is lit (hammered, wear, stone pitting, rope, marble's side). At the top left they are identical to Token Maker.
4. **"Where" for textures other than marble fades them** towards one side, rather than leaving marks out, so the arrangement doesn't change when switching.
5. **The ring paint turns with the light by default**, since Stamped's colours are lighting; it can be switched off for decorative colour rings.
6. **Every layer is cached**, not only heavy ones, so editing any layer redraws only it. The cost is a few 255ths of rounding in old designs' edge pixels (§4.3).

**Decided while building Phase 4** (sensible defaults; say if any should change):

1. **Converted frames use Frame Studio's own elements** (crosses, beads, runes…) rather than copies of each frame's ornament code, so every part stays an ordinary, editable layer and follows the light. The build, grooves and textures match the originals almost exactly; ornaments look the same but differ in fine detail (§4.7).
2. **Only what was needed was added to the format** (§4.1): a lit paint's highlight colour, see-through gradient colours, gradients that turn with the light, flat repeats and an on/off pattern. Each is off by default.
3. **A converted frame is a group** when it replaces a layer (keeping that layer's name, opacity, blend and clip), and a flat list of layers when it starts a new project.
4. **Frames that would look noticeably different stay unconverted** (Stamped, Ranger, Bard, Warlock, Barbarian, Artificer, Druid, Knotwork) rather than being offered as poor copies.

**Decided while building Phase 5** (sensible defaults; say if any should change):

1. **Token Maker gets Frame Studio's code by copy with a manifest** (§10), not a shared package: it is the pattern already used for the engine, it needs no package publishing, and a test on each side catches edits to the copies. One renderer, as the owner asked.
2. **A design is drawn on Token Maker's band** (its thickness and spacing), on the token's shape, lit from the design's own light.
3. **The library is per browser** (IndexedDB), with library files to move it, like the autosave; nothing is uploaded.
4. **Copied layers are plain text on the clipboard**, so pasting needs no permission prompt; a shared copy in localStorage covers the cases where the clipboard can't be read.
5. **The layer list became a tree** (it was a list box), the right pattern for nested layers with buttons in each row, which the accessibility checks asked for.

**Answered before Phase 5:** "looks the same" is good enough for converted frames (they don't have to be exact copies). The limits in §4.7 stay as they are and the originals stay available beside the editable versions.

**Still open:** none.

## 10. Using designs in Token Maker (Phase 5)

The owner's answer: Token Maker opens `.framestudio.json` project files, as a third frame kind beside drawn frames and picture frames.

**How the code is shared: copied with a manifest.** `npm run share:export -- ../token-maker` copies `src/project/`, `src/render/` and `src/share/` (not the tests) into token-maker's `src/frameStudio/`, changing only the imports of the engine copy (`../engine/legacy/x` → `../../render/x`, the token-maker files it was copied from), and writes `src/frameStudio/SOURCE.json` with this repository's commit and each file's SHA-256. `npm run share:check -- ../token-maker` reports what differs. `scripts/share-bundle.test.ts` checks that every import of every copied file resolves inside the copy or to one of token-maker's `src/render/` files, and that no editor code (state, UI, React) comes along; the copy was also type-checked in a folder laid out like token-maker. Token Maker never edits these files; it changes Frame Studio and exports again, just as Frame Studio syncs the engine (§3).

**What Token Maker calls** (`src/share/frameDesign.ts`):

- `readFrameDesign(text)`: reads any version of the file with every check of §4.3 (nothing in it is run).
- `drawFrameDesign(ctx, project, g)`: draws the design as a frame on Token Maker's band — the same `FrameGeometry` its `drawFrame` takes (origin at the token's centre, `R`, `outer`, `inner` in pixels) — on the token's shape, lit from the design's light, without clearing what is under it. `src/share/frameDesign.test.ts` checks that this is **the very same picture** Frame Studio draws for that band, on every shape, on a thin and a thick band, for three designs; the Phase 5 end-to-end test exports a project file from the editor, reads it and draws it this way, and compares it with the editor's own PNG export (mean difference 0.22/255; the browser and the test draw with different engines).
- `previewOf(text)`: the preview picture saved in the file (§4.8), for Token Maker's tile.

**The Token Maker side** (to do in token-maker, once this session can reach its repository):

1. Run `npm run share:export -- ../token-maker` and add a test there that fails if `src/frameStudio/` differs from its `SOURCE.json` (like Frame Studio's `engine.test.ts`).
2. Add a frame kind `'design'` beside drawn and picture frames in its `FrameSettings` (a schema bump with a migration), holding an id of the imported design.
3. In the Frame & shape panel, **Open a Frame Studio design…** reads the file with `readFrameDesign` and shows its warnings or reason; designs are kept in IndexedDB beside uploaded picture frames and go into shared presets the same way (with `previewOf` for the tile, or a thumbnail drawn by `drawFrameDesign`).
4. In `render.ts`, layer 9 draws a design frame with `drawFrameDesign(ctx, design, geometry)` on its cached frame canvas, using the same geometry as drawn frames, so the band follows Token Maker's thickness and spacing and the frame cache keeps working.
5. Test that a design looks the same in both apps: draw the Phase 5 fixture designs through `renderToken` and through `drawFrameDesign` directly, and compare.
