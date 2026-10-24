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

- [ ] **Phase 2 — Drawing tools** (including the light-direction control)
- [ ] **Phase 3 — Procedural layers**
- [ ] **Phase 4 — Converting Token Maker frames**
- [ ] **Phase 5 — Polish, library and sharing**

## Known limitations after Phase 1

- Token Maker frames are one layer each: only their colour and highlights colour can be changed (Phase 4 converts them).
- No free-placed shapes or editable paths yet; every layer follows the band (Phase 2).
- No procedural textures as layers yet (Phase 3).
- Desktop only; touch interaction is not built (Phase 5).
- Every layer is redrawn on every change. Fine for the current layer types; caching comes with the heavier texture layers (Phase 3).
- Layers can be reordered by dragging in the list with a mouse; there is no drop indicator line yet.
