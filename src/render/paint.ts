// Turning a Paint (project/types.ts) into canvas colours.

import { angularFill, clipToBand, litTables, type FrameGeometry, type LitTables } from '../engine/legacy/frameKit';
import type { GradientStop, Paint } from '../project/types';
import { insetAt } from './band';
import type { Ctx } from './canvas';

const litCache = new Map<string, LitTables>();

/** token-maker's lighting tables for a colour (cached, they take 360 colour mixes). */
export function litFor(color: string, light: number, dark: number): LitTables {
  const key = `${color}|${light}|${dark}`;
  let t = litCache.get(key);
  if (!t) {
    t = litTables(color, { light, dark });
    if (litCache.size > 64) litCache.clear();
    litCache.set(key, t);
  }
  return t;
}

function addStops(gradient: CanvasGradient, stops: GradientStop[]): CanvasGradient {
  for (const s of stops) gradient.addColorStop(Math.min(1, Math.max(0, s.at)), s.color);
  return gradient;
}

/**
 * A fill style for a Paint that isn't 'lit' (lit paints are drawn as wedges,
 * see fillBand). `from`/`to` are the across positions the gradient spans.
 */
export function paintStyle(ctx: Ctx, g: FrameGeometry, paint: Paint, from = 0, to = 1): string | CanvasGradient {
  switch (paint.kind) {
    case 'solid':
      return paint.color;
    case 'lit': {
      // Lines can't use the wedge fill; a top-left to bottom-right gradient stands in.
      const tables = litFor(paint.color, paint.light, paint.dark);
      const table = paint.pressed ? tables.step : tables.band;
      return addStops(ctx.createLinearGradient(-g.R * 0.7, -g.R * 0.7, g.R * 0.7, g.R * 0.7), [
        { at: 0, color: table[225] },
        { at: 1, color: table[45] },
      ]);
    }
    case 'linear': {
      const a = (paint.angle * Math.PI) / 180;
      const dx = Math.cos(a) * g.R;
      const dy = Math.sin(a) * g.R;
      return addStops(ctx.createLinearGradient(-dx, -dy, dx, dy), paint.stops);
    }
    case 'acrossBand': {
      // Radial from the token's centre: matches the band exactly on a circle, closely on other shapes.
      const r0 = Math.max(0, g.R - insetAt(g, to));
      const r1 = Math.max(r0 + 0.01, g.R - insetAt(g, from));
      const reversed = paint.stops.map((s) => ({ at: 1 - s.at, color: s.color })).reverse();
      return addStops(ctx.createRadialGradient(0, 0, r0, 0, 0, r1), reversed);
    }
  }
}

/** Fills the band between two across positions with a paint. */
export function fillBand(ctx: Ctx, g: FrameGeometry, from: number, to: number, paint: Paint): void {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const outer = Math.max(0, insetAt(g, lo));
  const inner = insetAt(g, hi);
  if (inner <= outer) return;
  if (paint.kind === 'lit') {
    const tables = litFor(paint.color, paint.light, paint.dark);
    angularFill(ctx, g, outer, inner, paint.pressed ? tables.step : tables.band);
    return;
  }
  ctx.save();
  clipToBand(ctx, { ...g, outer, inner });
  ctx.fillStyle = paintStyle(ctx, g, paint, lo, hi);
  ctx.fillRect(-g.R, -g.R, g.R * 2, g.R * 2);
  ctx.restore();
}
