// Draws effect samples on one sheet for checking by eye.
//   npx tsx scripts/effects-sheet.ts out.png [size]
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { bandFillLayer, createProject, NEW_EFFECT, repeatLayer, shapeLayer, textureLayer } from '../src/project/defaults';
import type { Effect, FrameProject, Layer } from '../src/project/types';
import { setCanvasFactory, type Ctx } from '../src/render/canvas';
import { renderProject } from '../src/render/renderProject';

const out = process.argv[2] ?? 'effects-sheet.png';
const size = Number(process.argv[3] ?? 300);
setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

const fx = <K extends Effect['kind']>(kind: K, patch: Partial<Extract<Effect, { kind: K }>> = {}) => ({ ...NEW_EFFECT[kind](), ...patch }) as Effect;
const band = (color: string, effects: Effect[]): Layer => ({ ...bandFillLayer(), paint: { kind: 'solid', color }, effects });
const all: [string, Layer[]][] = [
  ['bevel rounded', [band('#888888', [fx('bevel')])]],
  ['gold (bevel+recolour)', [band('#888888', [fx('bevel', { size: 0.3, gloss: 0.6 }), fx('recolour')])]],
  ['hammered bronze', [band('#808080', [fx('bevel', { surface: 'hammered', surfaceDepth: 0.8, size: 0.25 }), fx('recolour')])]],
  ['cracked stone', [band('#7a766e', [fx('bevel', { profile: 'chisel', surface: 'cracked', surfaceDepth: 1, gloss: 0 })])]],
  ['brushed', [band('#9aa0a8', [fx('bevel', { surface: 'brushed', surfaceDepth: 1, gloss: 0.7 })])]],
  ['scales', [band('#3f8a5a', [fx('bevel', { surface: 'scales', surfaceDepth: 1, surfaceScale: 0.2 })])]],
  ['ridge/stepped', [band('#888888', [fx('bevel', { profile: 'stepped', size: 0.45 })])]],
  ['sunken runes', [band('#6a6a70', [fx('bevel', { size: 0.3 })]), { ...repeatLayer(), element: 'rune', mode: 'spacing', spacing: 0.6, fill: '#6a6a70', size: 0.5, outlineWidth: 0.16, raised: false, effects: [fx('bevel', { direction: 'sunken', size: 0.06, depth: 1.5 })] }]],
  ['glow + shadow', [band('#30304a', [fx('shadow', { distance: 0.12 })]), { ...repeatLayer(), element: 'rune', fill: '#c8a8ff', raised: false, effects: [fx('glow', { color: '#9a5aff', size: 0.25 })] }]],
  ['inner glow/shadow', [band('#30304a', [fx('glow', { inner: true, color: '#ff8a2a' }), fx('shadow', { inner: true })])]],
  ['wear + bevel', [band('#8a8f99', [fx('wear', { chips: 0.6 }), fx('bevel'), fx('adjust', { saturation: -0.5 })])]],
  ['gems/plates/shards', [band('#4a3a2a', [fx('bevel')]), { ...repeatLayer(), element: 'gem', fill: '#c03050', size: 0.5, at: 0.5, count: 8 }, { ...repeatLayer(), element: 'plate', fill: '#a07a40', size: 0.45, at: 0.5, count: 8, offset: 0.5 }, { ...repeatLayer(), element: 'shard', fill: '#8a4ad0', size: 0.9, at: -0.2, count: 12, raised: false }]],
  ['faceted shapes', [band('#3a3a44', []), { ...shapeLayer(), shape: 'star', sides: 5, faceted: true, facetTable: 0, size: 1.6, fill: '#e0b040', mirror: 'four', along: 0.125 }, { ...shapeLayer(), faceted: true, size: 1.2, fill: '#40a0e0' }]],
  ['texture + fx group', [band('#2a1e1c', [fx('bevel', { surface: 'grain' })]), { ...textureLayer('cracks'), effects: [fx('glow', { color: '#ff5a1a', size: 0.12 })] }]],
];
const items = all.filter(([n]) => !process.argv[4] || n.includes(process.argv[4]));
const cols = Math.min(4, items.length);
const label = 24;
const sheet = createCanvas(cols * size, Math.ceil(items.length / cols) * (size + label));
const ctx = sheet.getContext('2d');
ctx.fillStyle = '#3a3d46';
ctx.fillRect(0, 0, sheet.width, sheet.height);
let total = 0;
items.forEach(([name, layers], i) => {
  const project: FrameProject = createProject(layers);
  project.stage = { ...project.stage, showArt: false, thickness: 0.3, outerSpacing: 0.05 };
  const c = createCanvas(size, size);
  const t0 = performance.now();
  renderProject(c.getContext('2d') as unknown as Ctx, project, size, { cache: false });
  total += performance.now() - t0;
  const x = (i % cols) * size;
  const y = Math.floor(i / cols) * (size + label);
  ctx.drawImage(c, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  ctx.fillText(name, x + 8, y + size + 17);
});
writeFileSync(out, sheet.toBuffer('image/png'));
console.log(`Wrote ${out} in ${Math.round(total)} ms`);
