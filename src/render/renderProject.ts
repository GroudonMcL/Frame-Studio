// The one renderer (DESIGN.md §5): the canvas preview, the template
// thumbnails, the PNG export and the tests all draw through renderProject, so
// what you see is what you export.

import { clipToBand, tracePolygon } from '../engine/legacy/frameKit';
import { boundingBox, shapePolygon } from '../engine/legacy/shapes';
import type { RenderSource } from '../engine/legacy/render';
import type { FrameProject, Layer } from '../project/types';
import { bandGeometry } from './band';
import { context2d, newCanvas, type Ctx } from './canvas';
import { drawLayer, type RenderEnv } from './layers';

export interface RenderOptions {
  /** Draw the backing and this picture inside the frame (the stage's "show art"). */
  art?: RenderSource | null;
}

/** Paints the project into a `size`×`size` area starting at the context's origin. */
export function renderProject(ctx: Ctx, project: FrameProject, size: number, options: RenderOptions = {}): void {
  const R = size / 2;
  const g = bandGeometry(project.stage, size);
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  // Nothing is drawn outside the square, as in token-maker.
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.clip();
  ctx.translate(R, R);

  if (project.stage.showArt) {
    // The opening reaches the middle of the band, where token-maker's art runs to with no inner spacing.
    const opening = shapePolygon(g.shape, R, (g.outer + g.inner) / 2);
    ctx.save();
    tracePolygon(ctx, opening);
    ctx.fillStyle = project.stage.backingColor;
    ctx.fill();
    if (options.art) {
      ctx.clip();
      const box = boundingBox(opening);
      const side = Math.max(box.maxX - box.minX, box.maxY - box.minY);
      const k = side / Math.min(options.art.width, options.art.height);
      const w = options.art.width * k;
      const h = options.art.height * k;
      ctx.drawImage(options.art.image, -w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }

  drawStack(ctx, project.layers, { g, light: project.stage.light, size });
  ctx.restore();
}

/** A layer on its own, with its band clip; a group draws its children as a stack. */
function drawOne(ctx: Ctx, layer: Layer, env: RenderEnv): void {
  ctx.save();
  if (layer.clip === 'band') clipToBand(ctx, env.g);
  if (layer.type === 'group') drawStack(ctx, layer.children, env);
  else drawLayer(ctx, layer, env);
  ctx.restore();
}

/** A blank canvas the size of the picture, with its origin at the centre. */
function scratch(env: RenderEnv): { canvas: ReturnType<typeof newCanvas>; ctx: Ctx } {
  const canvas = newCanvas(env.size, env.size);
  const ctx = context2d(canvas);
  ctx.translate(env.size / 2, env.size / 2);
  return { canvas, ctx };
}

/**
 * Layers bottom first. A layer with opacity < 100 %, a blend mode other than
 * Normal, or a clip to the layer below is drawn on its own canvas first and
 * then composited, so its opacity is even where its parts overlap. A layer
 * clipped to the one below shows only where that layer (the nearest one
 * below that isn't itself clipped) has paint, like a clipping mask.
 */
function drawStack(ctx: Ctx, layers: Layer[], env: RenderEnv): void {
  const R = env.size / 2;
  let base: Layer | null = null;
  for (const layer of layers) {
    if (layer.clip !== 'below') base = layer;
    if (!layer.visible || layer.opacity <= 0) continue;
    const mask = layer.clip === 'below' ? base : null;
    if (layer.clip === 'below' && (!mask || !mask.visible || mask.opacity <= 0)) continue;
    if (!mask && layer.opacity >= 1 && layer.blend === 'source-over') {
      drawOne(ctx, layer, env);
      continue;
    }
    const own = scratch(env);
    drawOne(own.ctx, layer, env);
    if (mask) {
      const m = scratch(env);
      drawOne(m.ctx, mask, env);
      own.ctx.save();
      own.ctx.setTransform(1, 0, 0, 1, 0, 0);
      own.ctx.globalCompositeOperation = 'destination-in';
      own.ctx.drawImage(m.canvas as CanvasImageSource, 0, 0);
      own.ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blend;
    ctx.drawImage(own.canvas as CanvasImageSource, -R, -R);
    ctx.restore();
  }
}
