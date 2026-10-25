// The one renderer (DESIGN.md §5): the canvas preview, the template
// thumbnails, the PNG export and the tests all draw through renderProject, so
// what you see is what you export.

import { clipToBand, tracePolygon, type FrameGeometry } from '../engine/legacy/frameKit';
import { boundingBox, shapePolygon } from '../engine/legacy/shapes';
import type { RenderSource } from '../engine/legacy/render';
import type { FrameProject, Layer } from '../project/types';
import { bandGeometry } from './band';
import { context2d, newCanvas, type CanvasLike, type Ctx } from './canvas';
import { bandWidthPx } from './band';
import { activeEffects, applyEffects } from './effects';
import { cachedLayer, effectsKey, layerKey, lookOf, MAX_CACHED_SIZE, renderStats } from './layerCache';
import { flatten, referencesOf } from '../project/tree';
import { drawLayer, type RenderEnv } from './layers';

export interface RenderOptions {
  /** Draw the backing and this picture inside the frame (the stage's "show art"). */
  art?: RenderSource | null;
  /** Reuse each layer's picture from earlier renders (default); renders over 2048 px never do. */
  cache?: boolean;
  /**
   * The band to draw on, in place of the one the stage's thickness and
   * spacing make (Token Maker's own band, when it draws a design as a frame).
   * Its shape replaces the stage's; its edges are pixels in from the edge.
   */
  band?: Pick<FrameGeometry, 'shape' | 'outer' | 'inner'>;
  /** Clear the area first (default). Off: draw over what is already there. */
  clear?: boolean;
}

interface StackEnv extends RenderEnv {
  cache: boolean;
}

/** Paints the project into a `size`×`size` area starting at the context's origin. */
export function renderProject(ctx: Ctx, project: FrameProject, size: number, options: RenderOptions = {}): void {
  const R = size / 2;
  const g = options.band ? { ...bandGeometry(project.stage, size), ...options.band } : bandGeometry(project.stage, size);
  ctx.save();
  if (options.clear !== false) ctx.clearRect(0, 0, size, size);
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

  renderStats.drawn = 0;
  renderStats.reused = 0;
  const cache = options.cache !== false && size <= MAX_CACHED_SIZE;
  const byId = new Map(flatten(project.layers).map((l) => [l.id, l]));
  drawStack(ctx, project.layers, { g, light: project.stage.light, size, cache, find: (id) => byId.get(id) });
  ctx.restore();
}

/** A blank canvas the size of the picture, with its origin at the centre. */
function scratch(size: number): { canvas: CanvasLike; ctx: Ctx } {
  const canvas = newCanvas(size, size);
  const ctx = context2d(canvas);
  ctx.translate(size / 2, size / 2);
  return { canvas, ctx };
}

/** Draws a picture made by `picture` (a full-size canvas) at the origin of a centred context. */
function put(ctx: Ctx, canvas: CanvasLike, size: number): void {
  ctx.drawImage(canvas as CanvasImageSource, -size / 2, -size / 2);
}

/** A layer has effects that are switched on. */
const hasEffects = (layer: Layer) => activeEffects(layer.effects).length > 0;

/**
 * The picture of one layer on its own canvas, with its band clip and (unless
 * `raw`) its effects. A layer that isn't a group comes from the cache when it
 * can (layerCache.ts); so does a group with effects (its key holds its
 * layers' settings); other groups are drawn afresh from their layers'
 * pictures. A layer clipped to this one uses its raw picture as the mask, so
 * its shadow or glow doesn't let the clipped layer spill out.
 */
function picture(layer: Layer, env: StackEnv, raw = false): CanvasLike {
  const effects = !raw && hasEffects(layer);
  const draw = () => {
    const own = scratch(env.size);
    if (effects) {
      // Effects work on the layer's own picture; the band clip is applied again after them.
      put(own.ctx, picture(layer, env, true), env.size);
      own.ctx.save();
      own.ctx.setTransform(1, 0, 0, 1, 0, 0);
      applyEffects(own.ctx, env.size, layer.effects, { bw: bandWidthPx(env.g), light: env.light });
      own.ctx.restore();
      if (layer.clip === 'band') {
        const cut = scratch(env.size);
        clipToBand(cut.ctx, env.g);
        put(cut.ctx, own.canvas, env.size);
        return cut.canvas;
      }
      return own.canvas;
    }
    if (layer.clip === 'band') clipToBand(own.ctx, env.g);
    if (layer.type === 'group') drawStack(own.ctx, layer.children, env);
    else drawLayer(own.ctx, layer, env);
    return own.canvas;
  };
  if (!env.cache || (layer.type === 'group' && !effects)) return draw();
  const key = layerKey(layer, env.g, env.light, env.size, depsKey(layer, env));
  return effects ? cachedLayer(`${env.size}|${layer.id}|fx`, effectsKey(layer, key), env.size, draw) : cachedLayer(`${env.size}|${layer.id}`, key, env.size, draw);
}

/** The settings of the layers this one (or anything in it) follows, so its picture is drawn again when they change. */
function depsKey(layer: Layer, env: StackEnv): string {
  const refs = (layer.type === 'group' ? flatten(layer.children) : [layer]).flatMap(referencesOf);
  if (refs.length === 0) return '';
  return refs.map((id) => {
    const t = env.find?.(id);
    return t ? JSON.stringify(lookOf(t)) : '-';
  }).join('|');
}

/**
 * Layers bottom first, each from its own picture, so editing one layer
 * redraws only that one. Opacity and blend mode apply to the whole picture,
 * so a layer's opacity is even where its parts overlap. A layer clipped to
 * the one below shows only where that layer (the nearest one below that
 * isn't itself clipped) has paint, like a clipping mask. A group at full
 * opacity and Normal blend passes its layers straight through.
 */
function drawStack(ctx: Ctx, layers: Layer[], env: StackEnv): void {
  let base: Layer | null = null;
  for (const layer of layers) {
    if (layer.clip !== 'below') base = layer;
    if (!layer.visible || layer.opacity <= 0) continue;
    const mask = layer.clip === 'below' ? base : null;
    if (layer.clip === 'below' && (!mask || !mask.visible || mask.opacity <= 0)) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blend;
    if (!mask && layer.type === 'group' && layer.opacity >= 1 && layer.blend === 'source-over' && !hasEffects(layer)) {
      if (layer.clip === 'band') clipToBand(ctx, env.g);
      drawStack(ctx, layer.children, env);
    } else if (mask) {
      // A copy, so the cached picture itself isn't cut.
      const own = scratch(env.size);
      put(own.ctx, picture(layer, env), env.size);
      own.ctx.globalCompositeOperation = 'destination-in';
      put(own.ctx, picture(mask, env, true), env.size);
      put(ctx, own.canvas, env.size);
    } else put(ctx, picture(layer, env), env.size);
    ctx.restore();
  }
}
