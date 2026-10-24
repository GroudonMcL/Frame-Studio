# Token Maker: context for Frame Studio

> **What this is:** the architecture audit asked for in `PROJECT-STARTER.md` (its "Prompt 1"), written so that anyone (a person or an AI) working on Frame Studio can understand the existing Token Maker without re-reading all of it. Everything here was checked against Token Maker's source at commit `d83f99a` (October 2026), not only its documents. Where its docs and code disagree, it says so.

Token Maker lives at <https://github.com/GroudonMcL/token-maker>. It is a React + Vite + TypeScript website that makes VTT tokens in the browser. Its own docs are `README.md`, `docs/DESIGN.md` (the source of truth), `docs/PROGRESS.md` and `docs/BUILD-PROMPTS.md`.

---

## 1. Map of the files that matter

Only the parts relevant to frames are listed. Paths are in token-maker.

| File | What it does | In Frame Studio? |
|---|---|---|
| `src/render/catalog.ts` | The 5 shapes (`ShapeId`) and the 27 frame presets: id, name, group (Classic / Textures / Classes), **style** (which drawing code) and default colour. | Copied unchanged → `src/engine/legacy/catalog.ts` |
| `src/render/frames.ts` | `drawFrame(ctx, style, geometry)`: the entry point. Draws Stamped itself; every other style is a "finish" drawn by `drawFinish`. Also `frameAccent(style)`. | Copied unchanged |
| `src/render/finishes.ts` | The 24 finishes (`FINISHES`): each frame's surface and ornaments. ~960 lines; the heart of the artwork. | Copied unchanged |
| `src/render/frameKit.ts` | Shared drawing helpers: band geometry, lit colour tables, `angularFill`, `strokeAt`, `clipToBand`, `alongBand`, `atPoint`, `sphere`, `raised`, `hammerTexture`, `wavyLine`, `seededRandom`… | Copied unchanged |
| `src/render/shapes.ts` | Token outlines as polygons (`shapePolygon(shape, R, inset)`), `samplePerimeter`, point-in-polygon. | Copied unchanged |
| `src/render/color.ts` | Hex parsing, `shade`, `mix`, `rgba`, HSL, `recolour` (used by Stamped). | Copied unchanged |
| `src/render/sampleArt.ts` | The stand-in portrait (sky, hills, figure) used in thumbnails and tests. | Copied unchanged (plus a tiny `render.ts` stand-in for its one type import) |
| `src/render/render.ts` | `renderToken(ctx, doc, assets, size)`: the whole token, 14 layers (DESIGN.md §5). Frames are layer 9, drawn onto their own cached canvas. | **Not** copied (it draws whole tokens). Frame Studio has its own `renderProject`. |
| `src/document/sizing.ts` | Per-grid-square units and `computeInsets` (where the band starts and ends). | Logic re-implemented in `src/render/band.ts` (`bandInsets`) |
| `src/document/types.ts`, `defaults.ts`, `migrate.ts` | The `TokenDocument` (schema version 8) and its migrations. The frame part is `FrameSettings`. | Not copied; same *pattern* used for `FrameProject` |
| `src/state/history.ts` | Undo/redo store with "transient" drags that commit as one step. | Copied → `src/state/history.ts` (header comment changed) |
| `src/render/imageFrames.ts`, `src/image/frameHole.ts` | Picture (PNG) frames and automatic hole finding. | Not used yet |
| `src/sections/FrameSection.tsx` | The Frame & shape panel (tiles, colour, thickness, spacing, backing, highlights colour). | Not used; its controls informed the legacy layer's properties |
| `scripts/frame-sheet.ts` | Renders every frame on one sheet. | Frame Studio has its own `npm run frame-sheet` |

---

## 2. How a frame is drawn (verified in the code)

### 2.1 Geometry

Everything is drawn with the canvas origin at the token's centre. A frame receives a `FrameGeometry`:

```ts
{ shape, R /* half-size, px */, outer, inner /* px in from the token's edge */, color, accent? }
```

`outer`/`inner` come from `computeInsets` (token-maker `src/document/sizing.ts`): with defaults (Medium token, thickness 0.14, outer spacing 0.1) the band runs from 10 % to 24 % of the half-size in from the edge. Insets are capped at 0.85 in total so small tokens keep some art.

Shapes are polygons from `shapePolygon(shape, R, inset)`. An inset outline is a **true parallel offset** of the outer shape (circles are 180-gons, rounded squares have 16-segment corners), starting at the top and running clockwise. Every shape is convex.

### 2.2 The common build ("built like Stamped")

All 26 drawn frames (27 presets minus "No frame") share one build, in this order:

1. **Band fill**: `angularFill` paints 240 thin wedges, each one colour from a 360-entry table indexed by angle. The table comes from `litTables(base, lighting)`: lit from the **top left (225°)**, shaded bottom right. (Wedges are used because conic gradients differ between browsers.)
2. **Pressed-in step**: the inner `step` fraction of the band (default 0.45 of its width) is filled again with the step table, lit from the opposite side, so it looks stamped in.
3. **Texture** (optional): drawn clipped to the band.
4. **Crease**: a dark line where the step meets the band.
5. **Rims** (`rims()`): a bright outer rim (linear gradient from the top left) and a dark inner rim.
6. **Ornament** (optional): drawn last, may reach past the band (beads, eyes, gears…).

Stamped is the exception: it uses two hand-sampled 24-stop colour tables (recoloured to the chosen colour with `recolour`) and its own texture (`stampedTexture`: marbling, flecks, veins on the dark side).

A `Finish` (in `finishes.ts`) is therefore just data plus two functions:

```ts
{ base?(color) → colour, lighting?: { light, dark, highlight? }, step?: number,
  texture?(ctx, g, tables, base), ornament?(ctx, g, base), accent?: string }
```

This is the most important fact for Frame Studio: **every frame is already a stack of a few parts** (band fill, step, texture, crease, rims, ornament). Phase 4 can turn those parts into layers frame by frame.

### 2.3 Sizes and placement

Ornament and texture sizes are fractions of the band width `w = inner − outer`, so a frame looks the same at any resolution and thickness. Placement helpers:

- `alongBand(g, count, at)`: `count` points evenly spaced round the band, `at` of the way across (0 outer edge, 1 inner edge), each with its direction of travel.
- `atPoint(ctx, p, draw)`: draws in a local frame at a point: +x along the band (clockwise), +y inwards.
- `countFor(g, size, at)`: how many things of `size` px fit round.
- `ornamentCount(shape, n)`: rounds to a multiple of the shape's corners (4 or 6) so corners get one each.
- `seededRandom(seed)`: deterministic noise, so preview and export match.

Frame Studio's band-relative coordinates (`across`, sizes in band widths) are exactly these conventions.

### 2.4 Settings a user can already change

From `FrameSettings` in token-maker `src/document/types.ts`: frame preset/style, **colour**, **highlights colour** (`highlightColor`, only for the 7 frames with an `accent`: Starfield, Bard, Monk, Paladin, Ranger, Rogue, Warlock), thickness, outer spacing, inner spacing, backing colour and backing opacity. Thickness and spacing are geometry (Frame Studio's stage), colour and highlights colour belong to the frame (Frame Studio's legacy layer). There is no frame opacity (removed after Phase 1).

### 2.5 Where frames sit in the token render

`renderToken` draws 14 layers (token-maker DESIGN.md §5). Relevant to frames:

- The **drop shadow** (layer 1) and the **inner shadow onto the art** (layer 8) are separate layers, not part of `drawFrame`. (Token-maker's DESIGN.md §2 says frames include "a drop shadow and a shadow cast onto the art"; that was true in the old extension, not in this code.)
- Layer 9 draws the frame onto its own square canvas; the last six are cached by `style|size|geometry` (up to 2048 px).
- The art is clipped to the band's middle when inner spacing is 0 (`computeInsets().image`), so it runs under the inner half of the frame.
- Everything is clipped to the square: nothing is ever drawn outside the token's image.
- The same function draws the preview and the export ("the export comes from the same renderer as the preview").

### 2.6 Performance notes

- A frame draw costs roughly: 240 wedges × 2 fills, plus textures with up to a few thousand small shapes (Stamped's flecks, Cobblestone, Starfield), plus `shadowBlur` for raised ornaments and glows (the most expensive canvas operation). Token-maker caches the frame canvas for this reason.
- With many layers in Frame Studio the same risks apply: many `shadowBlur` layers, and per-layer off-screen canvases for opacity/blend. Phase 1 draws every layer every change; caching per layer is planned (see DESIGN.md §5 "Later").

### 2.7 Discrepancies between token-maker's docs and its code

| Docs say | Code does |
|---|---|
| "27 code-drawn frames" | 27 **presets**, of which one is "No frame" (style `none`); 26 draw something. They use **25 distinct styles**: Arcane and Infernal share `arcane` (only the colour differs), and Wizard is the Arcane build with bigger runes. |
| Frames include a drop shadow and a shadow onto the art (DESIGN.md §2) | Those are separate render layers (1 and 8) in `render.ts`. |
| PROGRESS Phase 1 lists "frame opacity" | Removed in the Phase 1 feedback round; frames are always solid. |
| Preset ids match names | Mostly; "Polished" is preset id `minimal` with style `line`; class frames' styles are named by their motif (`claws`, `notes`, `radiant`…). |

---

## 3. Inventory of the 27 frames

Classification, as asked in `PROJECT-STARTER.md`:

1. **Straightforward**: every part can be made from Frame Studio's reusable layer types (band fill, line, repeated shapes) once small options are added (e.g. alternating colours).
2. **Hybrid**: most parts are reusable layers, but one part (usually a texture) needs a specialised procedural layer (marble, hammered metal, rope…).
3. **Specialised**: the look *is* its procedural texture; it needs a custom renderer kept as one layer with parameters.

All drawn frames share the build in §2.2 (band fill, step, crease, rims), which maps to band fill + band fill (pressed) + line + 2 lines. Only the differences are listed.

| # | Frame (style) | Group | Distinctive parts (from the code) | Class | Notes for conversion |
|---|---|---|---|---|---|
| 1 | Stamped (`stamped`) | Classic | Own 24-stop angle colour tables for band and step, recoloured; veins, flecks and marbling on the dark side | 2 | Needs a "custom colour-around-the-ring" paint and a marble/vein texture layer |
| 2 | Gilded (`gilded`) | Classic | Bright gold lighting; light marble; a row of shaded beads at 60 % across | 2 | Beads = repeated beads layer; marble needs texture layer |
| 3 | Engraved (`engraved`) | Classic | Marble; a groove at 30 %; 40 short tick marks along the groove | 2 | Groove = 2 lines; ticks = repeated "tick" element (to add) |
| 4 | Arcane (`arcane`, runic 0.17) | Classic | Dark band; marble; glowing line at 70 %; glowing random runes at 36 % | 2 | Runes + glow line are already possible (see the "Glowing runes" layered template) |
| 5 | Infernal (`arcane`) | Classic | Same code as Arcane, orange | 2 | Same as Arcane |
| 6 | Double line (`double`) | Classic | No step; two grooves; 12 raised diamonds | 1 | Lines + repeated diamonds |
| 7 | Polished (`line`) | Classic | Just the common build | 1 | Easiest: 2 band fills + 3 lines |
| 8 | No frame (`none`) | Classic | Nothing | n/a | An empty project |
| 9 | Oak (`wood`) | Textures | 14 wavy grain lines; knots of rings | 3 | Wood-grain texture layer with parameters |
| 10 | Cobblestone (`stone`) | Textures | Blocks of varied tone between the edges; mortar; pitting | 3 | Stone-block texture layer |
| 11 | Magma (`magma`) | Textures | Dark rock, hammered; glowing wandering cracks | 3 | Crack texture layer |
| 12 | Harlequin (`harlequin`) | Textures | No step; alternating light/dark diamonds along the band | 1 | Repeated diamonds with alternating colour |
| 13 | Knotwork (`braid`) | Textures | Marble; two sine-wave strands crossing | 2 | Needs a "wavy line" option on the line layer |
| 14 | Starfield (`starfield`) | Textures | Dark band; nebula smudges; random stars (accent colour) | 2 | Needs a "scatter" layer (random placement) |
| 15 | Barbarian (`claws`) | Classes | Hammered hide; battle wear; 6 three-claw gashes | 2 | Claw gash = custom element; wear = texture |
| 16 | Bard (`notes`) | Classes | Marble; 3 grooves (staff); random single/paired notes (accent) | 2 | Note element with random variant |
| 17 | Cleric (`radiant`) | Classes | Alternating long/short rays; 4 big shaded spheres | 1 | Repeated spikes with alternating size; repeated beads (count 4) |
| 18 | Druid (`vines`) | Classes | Wood grain; a sine-wave vine; leaves alternating sides | 2 | Wavy line + leaves with alternating offset; wood texture |
| 19 | Fighter (`riveted`) | Classes | Hammered metal; battle wear; 12 rivets | 2 | Rivets = repeated beads; hammer texture |
| 20 | Monk (`beads`) | Classes | Rope strands; beads with every 9th a big jade (accent), neighbours skipped | 2 | Beads already possible ("bigger one every 9"); "skip neighbours" option and rope texture needed |
| 21 | Paladin (`holy`) | Classes | Polished silver; groove; 8 gold crosses (accent); blue gems between | 1 | Crosses + offset gems: two repeat layers |
| 22 | Ranger (`fletching`) | Classes | Chevrons, every 2 of 4 red (accent); a line | 1 | Chevron element (to add) with colour pattern |
| 23 | Rogue (`stitched`) | Classes | Pitted leather; two stitch rows (dark grooves + slanted thread dashes, accent) | 2 | Stitches = dashed line + repeat; leather = hammer texture |
| 24 | Sorcerer (`sorcerer`) | Classes | Staggered rows of overlapping scales | 2 | Scale rows = several repeat layers with half-gap offsets; overlap order matters |
| 25 | Warlock (`eyes`) | Classes | Heavy marble; 6 detailed eyes (iris = accent) looking inwards | 2 | Eye = custom element |
| 26 | Wizard (`wizard`, runic 0.26) | Classes | Arcane with bigger, sparser runes | 2 | Same as Arcane |
| 27 | Artificer (`clockwork`) | Classes | Marble; gear teeth on the inner edge; 6 small gears | 2 | Teeth = repeated trapezoid at across 1; gears = custom element |

**Shared texture functions** (each would become one procedural layer type): `marble` (9 frames), `hammerTexture` (5), `battleWear` (2), `groove` (4, really two lines), `ropeStrands` (1), `drawScales` (1), wood grain (2), `stampedTexture` (1).

**Honest limit:** a frame that isn't converted shows as **one layer** with only colour and highlights colour editable, and says so in the Properties panel. Phase 4 converted 18 of the frames into editable layers; DESIGN.md §4.7 says how closely each matches, and why the other eight aren't converted yet.

---

## 4. Coordinate conventions to keep

- Origin at the token's centre; +x right, +y down; angles in degrees with 0 = right, 90 = down (token-maker's light comes from 225°, the top left).
- Band positions: 0 = outer edge, 1 = inner edge. Sizes in band widths. Counts either explicit or "as many as fit".
- Outlines start at the top and run clockwise.
- Everything is clipped to the square image.
- Randomness always via `seededRandom`, so every render is identical.

## 5. Things to watch when Token Maker changes

- `src/engine/legacy/SOURCE.json` records the token-maker commit and a hash of each copied file. `npm run engine:check -- ../token-maker` lists what changed; `npm run engine:sync -- ../token-maker` copies it over. The unit tests fail if a copied file is edited inside Frame Studio.
- The pixel test "draws pixel for pixel what token-maker draws" compares Frame Studio's legacy layer with a direct `drawFrame` call for every frame.
