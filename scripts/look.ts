// Draws templates on every shape, for checking by eye: npm run look -- out.png id [id…]
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { SHAPES } from '../src/engine/legacy/catalog';
import { createProject, LAYERED_TEMPLATES } from '../src/project/defaults';
import { setCanvasFactory, type Ctx } from '../src/render/canvas';
import { renderProject } from '../src/render/renderProject';
import { registerShippedFonts } from './nodeFonts';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
registerShippedFonts();
const [out = 'look.png', ...ids] = process.argv.slice(2);
const S = Number(process.env.S ?? 320);
const c = createCanvas(S * SHAPES.length, S * ids.length);
const ctx = c.getContext('2d') as unknown as Ctx;
ctx.fillStyle = '#2a2a30';
ctx.fillRect(0, 0, c.width, c.height);
ids.forEach((id, row) => {
  const t = LAYERED_TEMPLATES.find((x) => x.id === id)!;
  SHAPES.forEach((shape, col) => {
    const p = createProject(t.make(), t.name);
    p.stage = { ...p.stage, shape: shape.id, showArt: false, thickness: 0.2 };
    ctx.save();
    ctx.translate(col * S, row * S);
    renderProject(ctx, p, S, { cache: false, clear: false });
    ctx.restore();
  });
});
writeFileSync(out, c.toBuffer('image/png'));
