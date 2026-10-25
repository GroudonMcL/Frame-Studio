# Roadmap: from editor to procedural art studio

The owner's brief after Phase 5 ("Expanding Frame Studio: a world of creative possibilities", October 2026) asks to move Frame Studio from an editor towards a **procedural art studio**: borders that would be hard or impossible to draw by hand should *emerge from combining reusable systems* (materials, geometry, lighting, surface detail, effects) rather than each being programmed. This file is the plan for that, in order. `DESIGN.md` stays the source of truth for what is built; `BUILD-PROMPTS.md` has the prompt for each phase and `PROGRESS.md` the checklist.

## How the order was chosen

Every phase is judged by one question: **how much better does a D&D token border get, for how little effort from the person making it?**

1. **Surfaces first (Phase 6).** Almost every token border people buy is a metal, stone, wood, bone or crystal ring with depth, lit from one side, often with a glow. Frame Studio's flat paints were the biggest gap between its designs and those. A 2.5D surface system also improves *everything already there* (every layer, every converted Token Maker frame), so it pays off immediately.
2. **Ornaments anywhere (Phase 7).** After surfaces, the next most visible thing on a token is ornament: gems in settings, rivets, runes, spikes. These exist round the band; letting them follow any path or radiate round any point multiplies what can be made.
3. **Generators (Phase 8).** Vines, roots, lightning, cracks, plates, knotwork, chains: intricate designs from a few numbers. They are bigger pieces of work and depend on Phase 7's paths.
4. **Precise control (Phase 9).** Masks, height that combines between layers, boolean geometry: power-user tools that unlock the remaining ideas in the brief.
5. **Workflow (Phase 10).** Randomise, your own styles, a theme colour for a whole design, more lights, batch export.

Each phase keeps the project's rules (DESIGN.md §7): one renderer, sizes measured in band widths so a design fits every token shape and thickness, everything lit from the stage's light, a schema migration with old files still drawing the same, help on every control, tests (including pixel tests) and end-to-end checks.

## The brief's catalogue, mapped to phases

| Brief | Idea | Phase |
|---|---|---|
| 1 Materials | Embossing, bevels and relief: inner bevels, width, depth, softness, profile, raised/recessed, highlight and shadow colours, shared light | **6 (done)** |
| | Height maps combined between layers | **9 (done)**: a group's shared height map |
| | Material presets: gold, silver, copper, bronze, blackened iron, hammered metal, marble/granite/slate/obsidian, bone, ivory, crystal, glass, ice | **6 (done)**: 26 styles, 14 material ramps |
| | Damascus steel, chainmail, wood, leather, parchment, porcelain, enamel, lacquer, chitin, corrupted flesh | 6 has the systems (surfaces + ramps); more presets in 10 |
| | Wear: scratches, chips, worn edges, rust/verdigris, dirt, edge-dependent wear | **6 (done)**: chips, rubbed edges, grime; scratches and missing fragments in 8 |
| | Lighting and glow: inner/outer glow, soft shadows, emissive cracks and runes | **6 (done)** |
| | Bloom, coloured light bleeding onto neighbours, scattering through crystal | **10 (done)**: the lighting rig |
| | Filters: hue, saturation, brightness, contrast, gradient map, duotone | **6 (done)** |
| | Posterise, threshold, noise, blur, sharpen, chromatic aberration, distortion, halftone, stippling | 8 (distortion) and 10 (the rest, as more effects) |
| 2 Compositing | Multiply, Screen, Overlay, Soft/Hard Light, Difference/Exclusion, Darken/Lighten, Add, colour dodge/burn, hue/saturation/luminosity | **6 (done)** |
| | Knockout (cut holes) | **6 (done)**, kept apart from colour blending in the interface |
| | Clipping group | Phases 2 and 6 (clip to the layer below, clip to the band) |
| | Alpha and luminance masks from any layer, matte extraction | **9 (done)** |
| 3 2.5D | Height → normals → lighting, profiles, normal strength and smoothing | **6 (done)** |
| | Preview the height and normal maps | **9 (done)** |
| | Procedural faceted shapes with calculated face orientations | **6 (done)**: facets for shapes and paths; gem, plate and shard elements |
| | Gemstone generator: cuts (brilliant, rose, emerald, cabochon, rough), settings, claws and bezels | **7 (done)** |
| | A global lighting rig with a handle | Phase 2's light dial; elevation per bevel in 6; several coloured lights and rim light **10 (done)** |
| | Extrusion and sidewalls | **9 (done)** |
| 4 Geometry | Parametric ring builder (nested bands, contours, each its own material) | **7 (done)**: the contours layer |
| | Polygon border generator | The five token shapes come from Token Maker; more shapes need Token Maker too (waiting on the owner, DESIGN.md §9) |
| | Bézier paths | Phase 2; separate in/out handles **9 (done)** |
| | Path-following objects | **7 (done)** |
| | Boolean geometry, offset, stroke to shape | **9 (done)**: combining groups, grow/shrink, tapered strokes |
| | Organic generators (branches, roots, tendrils, thorns, antlers, coral, veins) | **8 (done)** |
| | Text on a path, variable-width strokes, symmetry tools | **7 (done)** |
| 5 Procedural | Radial array, mandala | **7 (done)** |
| | Linear array | **7 (done)** (along a path) |
| | Spiral generator | **8 (done)**: curling tendrils |
| | Voronoi, cellular patterns, crack generator | **8 (done)** as geometry (6 as surfaces) |
| | Fractal branching, L-systems | **8 (done)**: branches on branches |
| | Knotwork | **8 (done)** |
| | Gears and cogs | **8 (done)** |
| | Noise-driven displacement | **8 (done)**: the distortion effect |

## Phase 6 — Surfaces and effects (done)

Built: effects on every layer and group (bevel and surface, shadow, glow, material colour, colour adjust, wear and grime), faceted shapes and paths, faceted elements, ten more blend modes and a knockout, a library of 26 styles with live previews of your own design, copy and paste effects, and four templates made from these (Dwarven bronze, Eldritch crystal, Radiant gold, Hellforged iron). Details in DESIGN.md §5.4, §5.5 and §6.4.

The two examples in the brief are templates now:

- *An ancient dwarven border of layered hammered bronze, individually bevelled hexagonal plates, recessed runes, tiny rivets, directional highlights and a warm glow from cracks in the metal* → **Dwarven bronze**: a band with the Hammered bronze style, a cracks texture with a glow, faceted hexagonal plates recoloured as bronze with a little wear, runes with the Engraved style, rivets, bevelled rims.
- *An eldritch border of translucent purple crystals with irregular facets, internal light, overlapping tendrils and subtle distortion* → **Eldritch crystal**: an obsidian band, two bevelled wavy tendrils that cast shadows on each other, a glowing line, and faceted crystal shards with an inner and an outer glow. (Distortion comes in Phase 8.)

## Phase 7 — Ornaments anywhere (done)

Built: repeats that follow any path or line (facing along it or upright, growing along the way, with seeded random variation), radial arrays on shapes and paths, five gem cuts with sparkle and bezel or claw settings that take their own metal style, text on the band or a path (runes, Grenze, Atkinson) and contour layers, plus the Royal inscription template. Details in DESIGN.md §4.9, §4.10, §5.6 and §6.5. The plan as it was:

The ring of repeated shapes is Frame Studio's most used layer; this phase frees it from the band.

1. **Repeat along a path:** a Repeated shapes layer can follow a drawn path (open or closed) instead of the band: spacing, count, orientation (along the path or upright), alternating sides, scale along the path and random variation (size, angle, skip), seeded.
2. **Radial array:** repeat any shape or path round a point (count, radius, start angle, mirror each copy), for mandalas, sigils, compass roses and clusters of gems.
3. **Gem cuts and settings:** a Gem layer (or element options): brilliant, rose, emerald (step cut), cabochon, rough crystal; table size, crown height, facet count; a metal setting drawn round it (bezel or 4/6 claws) that takes its own style. Internal sparkle lit by the stage's light.
4. **Text on a path:** a line of text (runes or any font Frame Studio ships) following the band or a path, with size, spacing and the same effects as any layer (engraved inscriptions, glowing runes).
5. **Contours layer:** several nested bands at once (count, spacing, taper), each a line with its own width, as a quick ring builder.

Done when: a ring of gems in claw settings follows a drawn wavy path, and an engraved inscription runs round the band, both with effects, on every token shape.

## Phase 8 — Generators (done)

Built: growth (vines, roots, thorns, tendrils, antlers), cracks and lightning as geometry, plates and cells (irregular, honeycomb, bricks, tiles, scales; missing pieces), knotwork with real over/under crossings, gears and chains, a distortion effect and scratches; waves fitted to the band; Druid, Knotwork, Artificer and Barbarian converted; the Overgrown ruin template. Details in DESIGN.md §5.7 and §6.6. The plan as it was:

Intricate geometry from a few numbers, all seeded so preview and export match, all producing ordinary layers that effects and styles work on.

1. **Organic growth:** vines, roots, thorns, tendrils and antlers grown along the band or a path (branching, curl, taper, thickness, leaves or thorns at intervals), drawn as filled shapes so they can be bevelled.
2. **Cracks and lightning as geometry:** branching cracks across the band (break the band into fragments, missing pieces) and lightning bolts, rather than a texture.
3. **Plates and cells:** a Voronoi or regular cellular layer that divides the band into plates, each its own shape (so each gets its own bevel and colour variation): flagstones, scales, honeycomb, mosaic.
4. **Knotwork:** interlaced bands with real over/under crossings round the ring (the Knotwork and Druid frames that couldn't be converted in Phase 4).
5. **Gears and chains:** a gear generator (teeth, spokes, hub) and chain links that follow the band, interlocking.
6. **Distortion and scratches:** a noise displacement effect (warp edges and whole layers, for "subtle distortion" and irregular stone), and scratch marks as a wear option.

Done when: an "Overgrown ruin" template (cracked stone plates with missing fragments, roots growing through, knotwork band) is built only from generators and styles, and the four unconverted Token Maker frames that needed these (Druid, Knotwork, Artificer, Barbarian) convert.

## Phase 9 — Precise control (done)

Built: masks from any layer (shape or brightness, inverted), a shared height map per group (layers raise or carve into it, lit by the group's bevel), height and normal map views, extruded sides, grow and shrink, combining a group's shapes (union, subtract, intersect, exclude), tapered strokes, separate in/out handles, moving and turning groups on the canvas, zoom and pan, and the Rune-carved plates template. Details in DESIGN.md §5.8 and §6.7. The plan as it was:

1. **Masks:** show a layer through any other layer's shape or brightness (alpha and luminance masks, inverted or not), not only the layer below.
2. **Height compositing:** layers can add to (or cut into) a shared height map, so a bevel sees overlapping runes, plates and bands as one sculpted surface; extruded sidewalls for raised plates. A view of the height and normal maps.
3. **Boolean geometry:** union, subtract and intersect shapes and paths; offset (grow and shrink); turn a stroke into a filled shape with taper.
4. **Editing:** separate in/out handles for path points, move and turn a group on the canvas, zoom and pan.

## Phase 10 — Workflow (done, except more shapes)

Built: variations with locks, varying one style, your own styles (in the library and library files), a theme colour (and an accent) for a whole design, a lighting rig (more coloured lights, ambient colour, bloom, light bleeding), and token packs (every shape and size in one ZIP). Details in DESIGN.md §5.9 and §6.8. **Not built: more shapes** (item 6), which needs the shapes added to Token Maker's engine first; see DESIGN.md §9. The plan as it was:

1. **Randomise:** a dice button on a style or a whole design that varies seeds, colours and sizes within sensible limits; lock what shouldn't change.
2. **Your own styles:** save a layer's effects as a style in your library (and in library files), next to the built-in ones.
3. **A theme colour:** recolour a whole design (and converted Token Maker frames) from one or two colours, fixing a known limitation.
4. **A lighting rig:** several lights with their own colours (a cold rim light, warm key light), ambient colour, bloom and light bleeding onto neighbouring layers.
5. **Batch export:** a pack of tokens (every shape, sizes, with and without the sample picture) in one download.
6. **More shapes** with Token Maker (octagon, triangle, shield), since a design must draw the same in both apps.

## Token Maker

Token Maker draws Frame Studio designs with a copy of Frame Studio's reader and renderer (DESIGN.md §10). Its copy reads designs up to schema version 4, so it refuses files saved since Phase 6 (now version 9) with "made with a newer Frame Studio". Running `npm run share:export -- ..\token-maker` copies the new reader and renderer (effects included) across; that should be done, and Token Maker's tests run, before sharing new designs. It wasn't done in Phases 6–10 because changing the token-maker repository was outside these builds (the same change would add the new token shapes).
