# Frame Studio

A visual editor for code-drawn token frames. Start from one of [Token Maker](https://github.com/GroudonMcL/token-maker)'s 27 frames or from scratch, build a design from layers (bands of colour, lines, rings of beads, runes, gems, shapes and paths you draw yourself…), and save it or export it as a picture. No coding needed; technical settings live in **Advanced**.

![The Dwarven bronze template: hammered bronze, faceted plates, engraved runes and glowing cracks, all made with effects](docs/screenshots/24-dwarven-bronze.png)

## What works now (Phase 8)

- **Generators:** Add layer → **Growth** (vines, roots, thorny stems, curling tendrils, antlers, with leaves, thorns or berries), **Plates and cells** (flagstones, honeycomb, bricks, tiles, scales, with missing pieces), **Cracks and lightning**, **Knotwork** (strands that really weave over and under), **Gears** and **Chain**. Each is made from a few settings and a variation number, runs round the band or along a path, and takes styles and effects like any layer (a bevel on plates bevels each plate).
- **Distortion** effect (wobbly edges, irregular stone) and **scratches** on Wear and grime; wavy lines can **fit their waves to the band**.
- **Four more Token Maker frames convert into editable layers:** Druid, Knotwork, Artificer and Barbarian (22 in all).
- **New template:** Overgrown ruin, made only from generators and styles.

## Also there from Phase 7

- **Ornaments along any path:** Repeated shapes can **follow** a path you drew or a line (wavy or not) instead of the band: facing along it or upright, growing or shrinking along the way, with random variation of size, angle and gaps. The path can be hidden and still be followed.
- **Radial arrays:** repeat a shape or drawn path round a point (how many, how far out, start angle, every other one mirrored), for rosettes, sigils, compass roses and clusters of gems.
- **Gem cuts and settings:** cut gems can be brilliant, rose, emerald, cabochon or rough crystal (facets, table, crown height, sparkle), all lit by the light dial; any repeated shape can sit in a **bezel or four or six claws** in a metal style of its own.
- **Text:** Add layer → Text runs words round the band or along a path, in runes (Elder Futhark, drawn from strokes), Grenze or Atkinson; read the other way for the bottom of a token; give it the Engraved style to cut it in, or a glow.
- **Contours:** several lines round the band at once, tapering, in one or two colours.
- **New template:** Royal inscription.

## Also there from Phase 6

- **Effects on any layer or group** (Properties → Effects): give it depth with **Bevel and surface** (raised or sunk in, rounded, chiselled or stepped edges, and a surface of hammered dents, rough grain, brushed streaks, cracked plates or scales), a **Shadow** or **Glow** (outside or inside its edge), a **Material colour** that turns its shading into gold, silver, bronze, bone, obsidian, jade…, **Colour adjust**, and **Wear and grime** (chipped and rubbed edges, patches of dirt or verdigris). Everything is lit by the light dial, switches off and on, can be reordered, and fits every token shape and thickness.
- **Styles…:** 26 ready-made looks (polished gold, hammered bronze, blackened iron, carved stone, obsidian, amethyst crystal, engraved, arcane glow, hellfire, holy radiance, aged and worn…), each shown as a picture of *your* design in that style. One click applies it to every picked layer; then change any part of it. **Copy effects / Paste effects** moves a look from one layer to others.
- **Facets:** cut a shape or drawn path into flat faces lit by the light (gems, star badges, plates, crystals); repeated shapes can be cut gems, hexagonal plates or crystal shards.
- **More blend modes** (hard light, dodge, burn, darken, lighten, difference, exclusion, hue, saturation, luminosity) and **Cut a hole in the layers below** (in Advanced).
- **New templates made with effects:** Dwarven bronze, Eldritch crystal, Radiant gold and Hellforged iron.
- **What comes next** (Phases 9–10) is planned in [`docs/ROADMAP.md`](docs/ROADMAP.md): ornaments along any path and round any point, gem settings, generators (vines, roots, cracks, plates, knotwork, gears), masks and combined height, and workflow tools.
- *Token Maker:* designs saved now (format 5) open in Token Maker once its copy of Frame Studio's code is updated with `npm run share:export` (below).

![The style library: the selected layer shown in every style](docs/screenshots/22-style-library.png)

## Also there from Phases 1–5

- **Templates:** all 27 Token Maker frames (each as one layer whose colour you can change), five designs built from editable layers (two with textures), or a blank project.
- **Token Maker frames as editable layers:** 22 of the frames (Polished, Paladin, Gilded, Engraved, Arcane, Infernal, Wizard, Double line, Oak, Cobblestone, Magma, Harlequin, Starfield, Cleric, Fighter, Monk, Rogue, Sorcerer, and since Phase 8 Druid, Knotwork, Artificer, Barbarian) can be opened as a stack of layers you can change one by one: the band, the pressed-in step, the rims, the textures and the ornaments. They look like the originals (tests measure how close each one is) and, unlike the originals, they follow the light dial. Pick one marked **Editable** in New, or select a Token Maker frame layer and press **Turn into editable layers**; the originals are all still there.
- **Layers:** Band fill, Line (plain or wavy), Repeated shapes, Shape (circle, rectangle, polygon, star) and Path (draw your own), plus Token Maker frames as layers. Show/hide, lock, rename, reorder, duplicate, delete.
- **Groups:** Ctrl+click layers and press Group (Ctrl+G). Hide, lock or fade a whole group at once. Layers can also be clipped to the band or to the layer below.
- **Drawing:** Add layer → Path, then click points on the canvas; click the first point (or press Enter) to finish. Drag points and their round handles; double-click a point to make it curved.
- **Moving things:** drag shapes and paths on the canvas; use the square handle to resize and the round one to turn. Mirror a shape to get a matching pair on the other side.
- **Patterns:** alternate colours and sizes round a ring, leave gaps beside bigger beads, put leaves on alternate sides, draw only every other one (or any on/off pattern), shaded or in one flat colour; shapes to repeat include chevrons, ticks, gears, eyes, notes and claw marks.
- **Textures:** Add layer → Texture… opens a library of the surfaces Token Maker's frames are made of: marble, hammered metal, hide, battle wear, wood grain, stone blocks, stars, rope, dragon scales and magma cracks. Change their colour, how many marks, their size and strength, which side of the light they keep to, and shuffle for another variation. They are drawn the same way Token Maker draws them (tests check this pixel for pixel).
- **Colours round the ring:** paint a band or line with colours that change as they go round the token (like Stamped's), turning with the light if you want. In Advanced, metal paints can have their own highlight colour, gradient colours can be see-through, and a gradient can turn with the light (like a lit rim).
- **Faster editing:** each layer's picture is kept, so changing one layer only redraws that one.
- **Light:** turn the light dial under the canvas to light your layers from any side (it starts at the top left, like Token Maker).
- **Designs fit every token shape:** everything is placed relative to the frame band, so the same design works on a circle, square or hexagon, thick or thin. A shape can be set to "Place freely" if it should stay put instead.
- **Undo/redo**, **autosave** (your work survives a refresh) and **Save/Open** project files (`.framestudio.json`; files from earlier phases still open and look the same).
- **Your library:** pick a layer or group and press **Add to library** (the bookmark under the layer list) to keep it; add it to any other design from **Add layer → From your library**. Export the library as a file to keep a copy or give it to someone, and import it again.
- **Copy and paste layers** with Ctrl+C / Ctrl+V (or the Copy button and Add layer → Paste layers): within a design, into another design, or into another browser tab.
- **Export:** a see-through PNG at any size (16–4096 px), a sheet showing the design on all five token shapes, or the project file with a small preview picture in it (for Token Maker).
- **Help everywhere:** point at (or tap) the **?** beside any setting for a one-sentence tip. A welcome card greets first-time visitors; the **?** button in the top bar brings it back.
- **Phones and tablets:** on a narrow screen the canvas sits on top and the layers and properties are in a sheet underneath; everything is big enough for a finger, and you can drag shapes with one.
- **Keyboard:** move through the layers with the arrow keys, and move the selected layer on the canvas with the arrow keys once the canvas has focus. Accessibility is checked automatically (axe).
- **Use your designs in Token Maker:** save a design (`.framestudio.json`) and, in Token Maker, choose **Frame & shape → Frame type → Frame Studio → Open a Frame Studio design**. It follows the token's shape, thickness and spacing and looks exactly as it does here. Token Maker uses a copy of Frame Studio's own reader and renderer (`npm run share:export`, below).

See [`docs/PROGRESS.md`](docs/PROGRESS.md) for what's next and the known limitations.

## Running it on Windows

You need [Node.js](https://nodejs.org/) 22 or newer. In PowerShell:

```powershell
cd path\to\Frame-Studio
npm install          # once, or after pulling changes
npm run dev          # then open http://localhost:5173
```

Press `Ctrl+C` in PowerShell to stop it.

## Testing

```powershell
npm test             # unit and pixel tests
npm run typecheck    # TypeScript checks
npm run lint         # code style
npm run build        # production build into dist\
npx playwright install chromium   # once, before the first e2e run
npm run e2e          # end-to-end tests in a real browser
```

Handy for checking by eye:

```powershell
npm run frame-sheet -- sheet.png circle    # every template on one picture (try hexagon, square…)
npm run effects-sheet -- fx.png 240 circle # every style and effects template on one picture
npm run screenshots                        # with npm run dev running: editor screenshots into docs\screenshots
npm run compare-conversions                # each editable Token Maker frame beside its original, with the differences
```

`npm run e2e` also runs the phone tests (a Pixel 7 with touch).

## Keeping the Token Maker engine in step

The frame-drawing code in `src\engine\legacy\` is copied from Token Maker and must not be edited here. With both repositories side by side:

```powershell
npm run engine:check -- ..\token-maker   # lists files that differ
npm run engine:sync -- ..\token-maker    # copies them and records the commit
npm test
```

## Giving Token Maker the Frame Studio code

Token Maker draws Frame Studio designs with a copy of Frame Studio's reader and renderer, kept in step like the engine (the other way round). With both repositories side by side:

```powershell
npm run share:check -- ..\token-maker    # lists files that differ
npm run share:export -- ..\token-maker   # copies them into token-maker\src\frameStudio and records the commit
```

Then run `npm test` in token-maker.

## Documents

- [`docs/DESIGN.md`](docs/DESIGN.md): the design (source of truth).
- [`docs/TOKEN-MAKER-CONTEXT.md`](docs/TOKEN-MAKER-CONTEXT.md): how Token Maker's frames work, and an inventory of all 27.
- [`docs/BUILD-PROMPTS.md`](docs/BUILD-PROMPTS.md): the prompt for each build phase.
- [`docs/PROGRESS.md`](docs/PROGRESS.md): the phase checklist.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): the plan from the owner's "Expanding Frame Studio" brief (Phases 6–10).
- [`docs/PROJECT-STARTER.md`](docs/PROJECT-STARTER.md): the original brief.
