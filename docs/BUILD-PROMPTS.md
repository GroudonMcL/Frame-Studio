# Frame Studio — Build prompts

The prompts used to build Frame Studio, one per phase, written for an AI coding assistant (Claude Code) working in this repository. They are adapted from the owner's brief (`PROJECT-STARTER.md`) to the decisions in `DESIGN.md` §2 and the findings in `TOKEN-MAKER-CONTEXT.md`. Use them in order; tick each phase in `PROGRESS.md`.

Every prompt starts with the same ground rules:

```
Ground rules: Read docs/DESIGN.md and docs/TOKEN-MAKER-CONTEXT.md fully before doing anything; DESIGN.md is the source of truth. The owner is new to coding and uses Windows: explain what you did in plain English and give PowerShell commands. If a big decision isn't covered by the design doc, ask the owner before guessing, and record the answer in DESIGN.md. Never edit src/engine/legacy/ (sync it from token-maker instead). Keep one renderer for preview and export. Don't describe a feature as done unless it works and is tested; don't claim tests passed unless you ran them. Send the owner screenshots of progress (npm run screenshots). At the end, update README.md, docs/DESIGN.md and docs/PROGRESS.md, run npm test, npm run e2e, npm run typecheck, npm run lint and npm run build, and open a pull request.
```

---

## Phase 0 — Audit (done)

```
Ground rules: (as above)

Phase 0 goal: understand token-maker before building anything. Do not write application code.

1. Read token-maker's README, docs/DESIGN.md, docs/PROGRESS.md and the rendering code (src/render/frames.ts, finishes.ts, frameKit.ts, shapes.ts, catalog.ts, render.ts, src/document/sizing.ts). Verify the docs against the code and list discrepancies.
2. Write docs/TOKEN-MAKER-CONTEXT.md: a file map; how geometry, lighting, the shared build, textures and ornaments work; which helpers are shared; which settings already exist; the preview/export pipeline; performance risks.
3. Inventory all 27 frames: their visual parts (from the code, not guesses) and a class each: 1 reusable layers, 2 hybrid, 3 specialised.
4. Propose the FrameProject format, the editor architecture and the phases; list decisions for the owner with a recommended default. Ask the owner the decisions that change the architecture (where the code lives, how geometry works, what is produced, how work is delivered).

Done when: the owner has answered the architecture questions and the context document exists.
```

---

## Phase 1 — Foundation (done)

```
Ground rules: (as above)

Phase 1 goal: a working editor (not a mock-up) built on the structured format. DESIGN.md §3–§6.

1. Set up the repository like token-maker (React + Vite + TypeScript, Vitest with @napi-rs/canvas, Playwright, ESLint, same design tokens). Copy token-maker's frame engine into src/engine/legacy/ unchanged, with SOURCE.json (commit + hashes), npm run engine:check / engine:sync, and a test that fails if a copy is edited.
2. Implement FrameProject (schema version 1): stage settings, and layers with stable ids, name, visible, locked, opacity, blend. Layer types: legacyFrame (a Token Maker frame as one composite layer: frame, colour, highlights colour), bandFill (paint: solid, lit metal, gradient across the token, gradient across the band), line (position, width, paint, dash, glow) and repeat (element, count or spacing, corner snapping, position, size, stretch, rotation, slide, colour, outline, raised, glow, a bigger one every n). Positions and sizes are measured against the band (DESIGN.md §4.2).
3. parseProject: version check, migrations hook, every field checked with defaults and warnings, unknown layer kinds kept as 'unsupported' and written back unchanged. serializeProject for files and autosave.
4. renderProject: one renderer for preview, thumbnails, export and tests; opacity and blend per layer on its own canvas; the legacy layer must be pixel-identical to token-maker's drawFrame.
5. Editor: top bar (name, New, Open, Save, Export PNG, Undo/Redo, Basic/Advanced); layers panel (select, rename, show/hide, lock, reorder by buttons/keys/drag, duplicate, delete, add); canvas (live preview, click to pick, drag to move across the band or slide along it, selection outline on an overlay); properties per layer type with Advanced settings; template picker with live thumbnails (blank, layered examples, the 27 frames; also "add a frame as a layer"); Project data view in Advanced.
6. Undo/redo on the project (token-maker's history.ts; one step per drag). Autosave to IndexedDB.
7. Tests: catalogue loads; every frame renders on every shape and matches token-maker; editing changes the preview; visibility, order, opacity and blend; duplicate and delete; undo/redo; save → open round trip; bad files refused; unsupported layers preserved; autosave; Playwright flows for all of these, plus PNG export size.

Done when: load a Token Maker frame, add a ring of shapes, change their count and colour, reorder and hide layers, undo, save, reopen, export a PNG — all tested.
```

---

## Phase 2 — Drawing tools (done)

```
Ground rules: (as above)

Phase 2 goal: richer ways to make shapes. DESIGN.md §8.

1. A "shape" layer (circle, rectangle, polygon, star) and an editable "path" layer (click to add points, drag points and curve handles on the canvas). Owner's decision: adaptable by default — anchored at a point round the band (angle + across) and sized in band widths, so they fit every shape and thickness; "Place freely" (token units) is an option per layer.
2. Transforms for every placed layer: move, scale, rotate with on-canvas handles; numeric values in Advanced. Mirroring (left/right pair) like token-maker's decorations.
3. Groups: put layers in a group, collapse it, hide/lock/opacity for the whole group; clipping a layer to the band or to the layer below.
4. Repeat improvements: alternating colours and sizes (pattern lists such as "light, dark"), skip neighbours of accent elements (Monk), alternate sides (Druid leaves), more elements (chevron, tick, gear, eye, note, claw).
5. Line improvements: wavy lines (amplitude, waves round the ring, phase) for vines and knotwork.
6. Light direction (owner's decision): a dial in the stage bar, default top left (225°), stored as stage.light. It drives the lit paint, bead and element shading and raised shadows. Token Maker frames stay top-left lit until converted (the engine can't be edited); say so in their Properties when the light is moved.
7. Schema version 2 with a migration from version 1 (adds stage.light = 225 and the new layer fields) and a test that every version-1 file still opens and draws the same.
8. Tests for every new layer, transform maths, groups, the light direction (shading follows it; 225° matches version 1 exactly), the migration, and Playwright flows for drawing a path and editing its points.

Done when: draw a custom gem shape, mirror it on both sides of the token, group it with a ring of alternating diamonds, switch the token to a hexagon and see it all follow the band, and move the light to the bottom right.
```

---

## Phase 3 — Procedural layers (done)

```
Ground rules: (as above)

Phase 3 goal: the textures token-maker frames are made of, as layers with parameters. DESIGN.md §8 and TOKEN-MAKER-CONTEXT.md §3.

1. Add a "texture" layer type whose kind is one of: marble (marble + flecks), hammered metal, battle wear, wood grain, stone blocks, scatter (stars/particles), rope strands, scales, cracks (magma). Each takes colours from a base colour like token-maker's finishes, plus amount, scale, seed and the light/dark-side behaviour. Reuse the engine's helpers (hammerTexture, seededRandom, wavyLine…) where they fit; do not copy token-maker functions that aren't exported — write the layer painters in src/render/ so they can be checked against the originals.
2. A "colour round the ring" paint (stops by angle), for Stamped's hand-sampled tables.
3. Cache each layer's canvas by its settings and size so heavy textures don't redraw on unrelated edits; keep exports uncached above 2048 px like token-maker.
4. A texture library in the Add layer menu with thumbnails.
5. Tests: deterministic output per seed; same result at every size (scaled); cache returns identical pixels; performance budget for a 10-layer design.

Done when: a design with marble, hammered metal and stars renders the same in the preview and the export, and editing one layer doesn't redraw the others.
```

---

## Phase 4 — Converting Token Maker frames (done)

```
Ground rules: (as above)

Phase 4 goal: Token Maker frames become genuinely editable templates.

1. Add a converter per frame that produces an equivalent stack of editable layers (band fill, pressed step, crease, rims, textures, ornaments). Start with Polished (simple) and Paladin (intricate); then Arcane/Infernal/Wizard, Double line, Harlequin, Cleric, Ranger, Gilded, Fighter, and the rest by class (TOKEN-MAKER-CONTEXT.md §3).
2. Visual comparison tests: render the original (legacy layer) and the converted stack at several sizes and every shape; measure the difference (e.g. mean per-pixel difference and the share of pixels over a threshold) and set a tight limit per frame. Document any frame that can't match and why.
3. In the template picker, show converted frames as "editable" and keep the legacy version available.
4. Where a converted frame can't be exact (e.g. random seeds drawn in a different order), ask the owner whether "looks the same" is good enough.

Done when: Polished and Paladin open as editable layer stacks that match the originals within the agreed limit.
```

---

## Phase 5 — Polish, library and sharing (done)

```
Ground rules: (as above)

Phase 5 goal: a complete creative tool.

1. A personal layer library: save any layer or group as a reusable item (IndexedDB), with thumbnails; import/export library items as files.
2. Copy and paste layers between projects (including between browser tabs).
3. Touch and phone layout like token-maker's (bottom sheet, 44 px targets), keyboard access throughout, axe accessibility checks.
4. Use designs in Token Maker (owner's decision): Token Maker opens .framestudio.json project files. Share Frame Studio's project reader and renderer with Token Maker (decide copy-with-manifest or shared package, keeping one renderer), add a "Frame Studio design" frame kind beside drawn and picture frames whose band follows Token Maker's thickness and spacing, keep imported designs in IndexedDB and in shared presets like uploaded picture frames, and test that a design looks the same in both apps.
5. Export options: transparent PNG at any size, a sheet of the design on every shape, and the project file with a preview picture embedded.
6. Help tips for every control (one plain sentence each), and a first-time welcome card.

Done when: a design made in Frame Studio can be saved to the library, reused in another design, and opened as a frame in Token Maker from its .framestudio.json file.
```

---

The phases below come from the owner's brief after Phase 5, "Expanding Frame Studio: a world of creative possibilities": move from an editor to a procedural art studio whose borders emerge from combining reusable systems, easy to use, most useful for D&D tokens first. `ROADMAP.md` maps the brief's whole idea catalogue to these phases and explains the order. Every prompt also says: *read docs/ROADMAP.md; keep sizes in band widths, light everything from stage.light, and add a schema migration with fixture files from the previous version.*

## Phase 6 — Surfaces and effects (done)

```
Ground rules: (as above)

Phase 6 goal: materials, depth, lighting and surface detail that work on every layer, and an easy way to apply them.

1. Effects on every layer and group, non-destructive, ordered, each switchable: a bevel built on a height map (distance from the edge through a profile, raised or sunk in, plus procedural surfaces such as hammered metal, grain, brushed, cracked and scales) turned into normals and lit by the stage's light, with shine; outer and inner shadow and glow; a gradient-map material colour; hue/saturation/brightness/contrast; wear (chips, rubbed edges, grime).
2. Faceted shapes and paths whose faces have calculated orientations lit by the light; faceted gem, plate and shard elements.
3. More blend modes, and a knockout kept apart from colour blending in the interface.
4. A style library of ready-made effect stacks (metals, stone and bone, crystal, carving, magic, finishes), previewed on the user's own design, applied to every picked layer in one step; copy and paste effects.
5. Templates built from effects, including the brief's dwarven bronze and eldritch crystal borders.

Done when: a band given a style from the library becomes hammered bronze, follows the light dial, can be adjusted and undone, and its exported picture is the picture the renderer draws from the saved file.
```

---

## Phase 7 — Ornaments anywhere

```
Ground rules: (as above)

Phase 7 goal: ornaments that follow any path or radiate round any point.

1. Repeated shapes can follow a drawn path (open or closed) instead of the band: count or spacing, orientation, alternate sides, scale along the path, seeded random variation of size, angle and gaps.
2. A radial array: any shape or path repeated round a point (count, radius, start angle, mirrored copies).
3. Gem cuts (brilliant, rose, emerald, cabochon, rough) with table, crown and facet settings, and metal settings (bezel, 4 or 6 claws) with their own style.
4. Text on the band or a path (bundled fonts including runes), with effects.
5. A contours layer: several nested bands at once (count, spacing, taper).

Done when: a ring of gems in claw settings follows a drawn wavy path, and an engraved inscription runs round the band, both with effects, on every token shape.
```

---

## Phase 8 — Generators

```
Ground rules: (as above)

Phase 8 goal: intricate geometry from a few numbers, as ordinary layers that effects and styles work on.

1. Organic growth along the band or a path: vines, roots, thorns, tendrils, antlers (branching, curl, taper, thickness, leaves or thorns), drawn as filled shapes.
2. Cracks (breaking the band into fragments, with missing pieces) and lightning, as geometry.
3. Plates and cells: Voronoi or regular cells dividing the band into separate plates, each bevelled and varied in colour.
4. Knotwork with real over/under crossings; gears; chains that interlock round the band.
5. A noise displacement effect (warped edges, subtle distortion) and scratches as a wear option.
6. Convert the Token Maker frames that were waiting for these (Druid, Knotwork, Artificer, Barbarian), with comparison limits as in Phase 4.

Done when: an "Overgrown ruin" template (cracked stone plates with missing fragments, roots growing through, a knotwork band) is built only from generators and styles.
```

---

## Phase 9 — Precise control

```
Ground rules: (as above)

Phase 9 goal: the power tools.

1. Masks from any layer: alpha or luminance, inverted or not.
2. Height compositing: layers add to or cut into a shared height map, so one bevel lights overlapping parts as one surface; extruded sidewalls; views of the height and normal maps.
3. Boolean geometry for shapes and paths (union, subtract, intersect), offset, stroke to shape with taper.
4. Separate in/out handles for path points, moving and turning groups on the canvas, zoom and pan.

Done when: runes cut through a raised plate share one height map with it (the plate's bevel follows the cut edges), seen in the height-map view and in the export.
```

---

## Phase 10 — Workflow

```
Ground rules: (as above)

Phase 10 goal: faster ways to make many good tokens.

1. Randomise a style or a whole design within sensible limits, with locks.
2. Save your own styles in the library and library files.
3. A theme colour that recolours a whole design, converted Token Maker frames included.
4. A lighting rig: several coloured lights, ambient colour, bloom, light bleeding onto neighbours.
5. Batch export of a token pack; more token shapes, added to Token Maker too.

Done when: a design is randomised into three variations, each recoloured from a theme colour and exported as a pack on every shape.
```
