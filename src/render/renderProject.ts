// The one renderer (DESIGN.md §5): the canvas preview, the template
// thumbnails, the PNG export and the tests all draw through renderProject, so
// what you see is what you export.

import { tracePolygon } from '../engine/legacy/frameKit';
import { boundingBox, shapePolygon } from '../engine/legacy/shapes';
import type { RenderSource } from '../engine/legacy/render';
import type { FrameProject } from '../project/types';
import { bandGeometry } from './band';
import { context2d, newCanvas, type Ctx } from './canvas';
import { drawLayer } from './layers';

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

  for (const layer of project.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    if (layer.opacity >= 1 && layer.blend === 'source-over') {
      ctx.save();
      drawLayer(ctx, layer, g);
      ctx.restore();
      continue;
    }
    // Drawn on its own first so its opacity is even where its parts overlap.
    const own = newCanvas(size, size);
    const octx = context2d(own);
    octx.translate(R, R);
    drawLayer(octx, layer, g);
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blend;
    ctx.drawImage(own as CanvasImageSource, -R, -R);
    ctx.restore();
  }
  ctx.restore();
}
