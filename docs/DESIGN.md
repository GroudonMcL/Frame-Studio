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

## 3. Tech stack

Same as Token Maker, so code and habits carry over: TypeScript, React 19 + Vite, Canvas 2D, Zustand (with token-maker's `history.ts` for undo), `idb-keyval` for autosave, Vitest (+ `@napi-rs/canvas` for pixel tests), Playwright, ESLint. Same visual identity ("Lamplit Workbench", `src/styles/tokens.css` copied from Token Maker). No new dependencies beyond Token Maker's.

**The engine copy.** `src/engine/legacy/` holds unchanged copies of token-maker's `src/render/{catalog,color,frameKit,frames,finishes,shapes,sampleArt}.ts` (plus a 9-line `render.ts` stand-in for one type). `SOURCE.json` records the token-maker commit and each file's SHA-256.

- Never edit those files here. Change Token Maker, then `npm run engine:sync -- ../token-maker` (copies changed files, records the new commit and hashes) and run the tests.
- `npm run engine:check -- ../token-maker` reports differences without copying.
- `src/engine/legacy/engine.test.ts` fails if a copied file was edited here.

## 4. The project format

### 4.1 FrameProject (schema version 1)

Defined in `src/project/types.ts`; defaults in `src/project/defaults.ts`; reading and checking in `src/project/migrate.ts`.

```ts
interface FrameProject {
  format: 'frame-studio-project';
  schemaVersion: 1;
  name: string;
  stage: { shape; thickness; outerSpacing; showArt; backingColor };   // how it's previewed, not the look
  layers: Layer[];                                                    // bottom first
}
// Every layer: id (stable, unique), name, visible, locked, opacity 0–1, blend
type Layer =
  | { type: 'legacyFrame'; presetId; style; color; accent | null }     // a Token Maker frame, one composite layer
  | { type: 'bandFill'; from; to; paint }                              // colours part of the band
  | { type: 'line'; at; width; paint; dash; glow | null }              // a line round the band
  | { type: 'repeat'; element; mode; count; spacing; snapToCorners;    // one shape repeated round the band
      at; size; stretch; rotation; offset; fill; outline | null; outlineWidth;
      raised; glow | null; accentEvery; accentScale; accentColor | null; seed }
  | { type: 'unsupported'; originalType; data; reason };               // kept, never drawn (see 4.3)
type Paint =
  | { kind: 'solid'; color }
  | { kind: 'lit'; color; light; dark; pressed }    // token-maker's metal lighting (litTables)
  | { kind: 'linear'; angle; stops }                // across the token
  | { kind: 'acrossBand'; stops }                   // outer edge → inner edge
```

Elements for `repeat`: bead (shaded sphere), circle, diamond, square, triangle, star, cross, rune, leaf, spike.

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
- A layer kind this version doesn't know becomes an `unsupported` layer: kept exactly, saved back exactly, shown with a warning, not drawn. Nothing is silently dropped.
- Duplicate layer ids get fresh ones.
- Nothing in a file is ever run as code.

## 5. The renderer

`renderProject(ctx, project, size, { art })` in `src/render/renderProject.ts` draws the preview, the template thumbnails, the PNG export and the test images. One renderer, so the export always matches the preview.

1. Clip to the square; origin at the centre.
2. If `stage.showArt`: the backing colour and the sample picture inside the band's middle (where token-maker's art runs to).
3. Layers, bottom first. A layer with opacity < 100 % or a blend mode other than Normal is drawn on its own canvas first and then composited, so its opacity is even where its parts overlap.

Painters per type are in `src/render/layers.ts`. The legacy layer calls token-maker's `drawFrame` with exactly the geometry token-maker would use; a test checks every frame is pixel-identical to a direct `drawFrame` call.

Editor-only drawing (the selection outline) is on a separate overlay canvas and never reaches the export.

**Later:** cache each layer's canvas by its settings and size (as token-maker caches frames) when designs get heavy; a draft preview while dragging if needed.

## 6. The editor

`src/App.tsx` + `src/ui/`. Desktop layout (min 960 px wide):

- **Top bar:** name (click to rename), New (template picker), Open, Save (`.framestudio.json`), Export PNG (256–2048 px, with or without the sample picture), Undo/Redo, **Basic / Advanced** switch.
- **Layers panel (left):** top of the stack first. Click to select; eye = show/hide; padlock = lock; double-click or F2 to rename; drag, Alt+↑/↓ or the arrow buttons to reorder; Duplicate (Ctrl+D); Delete (Del). **Add layer** offers Band fill, Line, Repeated shapes and Token Maker frame….
- **Canvas (middle):** live preview on a checkerboard. Click picks the top-most layer under the pointer. Dragging a line, band fill or repeat moves it across the band; dragging a repeat round the token slides its elements along. A drag is one undo step. Below it: token shape, band thickness, show sample picture (Advanced: outer spacing, backing colour).
- **Properties panel (right):** controls for the selected layer's type. Basic shows the common ones; Advanced adds opacity, blend mode, outline, glow, "bigger one every…", rune pattern, gradient stop positions, highlight/shade amounts, and **Project data** (the JSON, editable and checked like an opened file).
- **Template picker:** Blank, designs built from editable layers ("Brass & beads", "Glowing runes"), and the 27 Token Maker frames with live thumbnails. Also used to add a Token Maker frame as a layer.

Undo/redo works on the structured project (token-maker's `history.ts`): every edit is one step; a slider or colour-picker drag is one step. Loading a project starts a fresh history.

Autosave: the project's JSON is written to IndexedDB (`frame-studio:project`) 0.4 s after each change and restored on the next visit. First visit opens Token Maker's Stamped frame.

## 7. Quality rules

- Read this file first; update it, `PROGRESS.md` and `README.md` at the end of every phase.
- Never edit `src/engine/legacy/`; sync from Token Maker instead.
- One renderer for preview and export. Keep it pure and pixel-tested.
- Don't present a Token Maker frame as editable parts until it really is converted.
- Every new layer type: type + defaults + checker in `migrate.ts` + painter + properties + hit test + tests.
- Don't claim tests passed without running them. Run `npm test`, `npm run e2e`, `npm run typecheck`, `npm run lint`, `npm run build` before a PR.
- Plain-English summaries and Windows PowerShell commands for the owner.
- Progress screenshots: `npm run screenshots` (with `npm run dev` running) writes `docs/screenshots/`.

## 8. Roadmap

See `docs/BUILD-PROMPTS.md` for the full prompt of each phase and `docs/PROGRESS.md` for the checklist.

| Phase | Goal |
|---|---|
| 1 | Foundation: templates, the format, the first layer types, layers panel, properties, undo, save/open, PNG, autosave **(done)** |
| 2 | Drawing tools: free shapes and editable paths placed anywhere, groups, transforms, more elements, alternating patterns, wavy lines, direct handles on the canvas |
| 3 | Procedural layers: marble, hammered metal, battle wear, wood grain, stone blocks, scatter (stars), rope, scales; the colour-around-the-ring paint; per-layer caching |
| 4 | Converting Token Maker frames into editable layers, starting with Polished (simple) and Paladin or Arcane (intricate), with visual comparison tests |
| 5 | Polish and sharing: a personal layer library, copy/paste between projects, touch support, using designs in Token Maker |

## 9. Open questions for the owner

Recorded with the default used until answered:

1. **Light direction.** Token Maker frames are lit from the top left. Should Frame Studio offer a light-direction control for its own layers? *Default: no, keep the top left so everything matches.*
2. **Using designs in Token Maker.** Should Token Maker import `.framestudio.json` files (needing the Frame Studio renderer inside Token Maker), or PNGs only? *Default: decide in Phase 5.*
3. **Phone support.** *Default: desktop first; touch in Phase 5.*
