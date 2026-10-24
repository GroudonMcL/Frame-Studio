// Sheets of the ornaments, textures, templates and last conversions added
// in Phase 6, for checking by eye (npm run showcase -- <what> out.png):
//   ornaments   every repeat shape, round a band
//   textures    the texture library
//   templates   the designs built from layers
//   converted   the Token Maker frames beside their editable versions (--frames=stamped,ranger…)
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { FRAME_PRESETS, type ShapeId } from '../src/engine/legacy/catalog';
import { convertPreset } from '../src/project/convert';
import { bandFillLayer, createProject, LAYERED_TEMPLATES, legacyFrameLayer, repeatLayer, textureBand, textureFromPreset, TEXTURES } from '../src/project/defaults';
import { ELEMENT_KINDS, type Layer } from '../src/project/types';
import { setCanvasFactory, type Ctx } from '../src/render/canvas';
import { ELEMENT_NAMES } from '../src/render/elements';
import { renderProject } from '../src/render/renderProject';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
const [what = 'ornaments', out = `${what}.png`] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const frames = process.argv.find((a) => a.startsWith('--frames='))?.slice(9).split(',') ?? ['stamped', 'ranger', 'bard', 'warlock', 'barbarian', 'artificer', 'druid', 'knotwork'];
const size = 240;

interface Item {
  name: string;
  layers: Layer[];
  thickness: number;
  shape?: ShapeId;
}
const band = { ...bandFillLayer(), paint: { kind: 'lit' as const, color: '#4a5a7a', light: 0.7, dark: 0.8, pressed: false, highlight: null } };
const shapes: ShapeId[] = ['circle', 'rounded', 'square', 'hexagon', 'flatHex'];
const items: Item[] =
  what === 'ornaments'
    ? ELEMENT_KINDS.map((element) => ({ name: ELEMENT_NAMES[element], thickness: 0.3, layers: [band, { ...repeatLayer(), element, count: 8, size: 0.7, fill: '#e0b850' }] }))
    : what === 'textures'
      ? TEXTURES.map((t) => ({ name: t.name, thickness: 0.32, layers: [textureBand(t), textureFromPreset(t)] }))
      : what === 'templates'
        ? LAYERED_TEMPLATES.map((t) => ({ name: t.name, thickness: 0.2, layers: t.make() }))
        : frames.flatMap((id, i) => {
            const name = FRAME_PRESETS.find((p) => p.id === id)!.name;
            const shape = shapes[i % shapes.length];
            return [
              { name: `${name}: original`, thickness: 0.18, shape, layers: [legacyFrameLayer(id)] },
              { name: `${name}: editable`, thickness: 0.18, shape, layers: convertPreset(id)! },
            ];
          });

const cols = what === 'converted' ? 4 : 6;
const label = 26;
const sheet = createCanvas(cols * size, Math.ceil(items.length / cols) * (size + label));
const ctx = sheet.getContext('2d');
ctx.fillStyle = '#2b2d33';
ctx.fillRect(0, 0, sheet.width, sheet.height);
items.forEach((item, i) => {
  const p = createProject(item.layers);
  p.stage = { ...p.stage, showArt: false, thickness: item.thickness, shape: item.shape ?? 'circle' };
  const c = createCanvas(size, size);
  renderProject(c.getContext('2d') as unknown as Ctx, p, size, { cache: false });
  const x = (i % cols) * size;
  const y = Math.floor(i / cols) * (size + label);
  ctx.drawImage(c, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  ctx.fillText(item.name, x + 8, y + size + 18);
});
writeFileSync(out, sheet.toBuffer('image/png'));
console.log(`${items.length} pictures → ${out}`);
