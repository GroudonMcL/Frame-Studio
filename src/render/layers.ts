// One painter per layer type. Each draws its layer onto a context whose origin
// is the token's centre. New layer types are added here and in
// project/types.ts; the editor finds their controls in ui/properties/.

import { rgba } from '../engine/legacy/color';
import { atPoint, localLight, noShadow, raised, tracePolygon, type FrameGeometry } from '../engine/legacy/frameKit';
import { drawFrame } from '../engine/legacy/frames';
import type { Layer, LegacyFrameLayer, LineLayer, RepeatLayer } from '../project/types';
import { bandWidthPx, outlineAt, repeatCount, spacedAlong } from './band';
import type { Ctx } from './canvas';
import { drawElement, runeFor } from './elements';
import { fillBand, paintStyle } from './paint';

function drawLegacy(ctx: Ctx, layer: LegacyFrameLayer, g: FrameGeometry): void {
  // Exactly what token-maker's renderer passes to drawFrame (its render.ts, layer 9).
  drawFrame(ctx, layer.style, { ...g, color: layer.color, accent: layer.accent ?? undefined });
}

function drawLine(ctx: Ctx, layer: LineLayer, g: FrameGeometry): void {
  const outline = outlineAt(g, layer.at);
  const width = layer.width * bandWidthPx(g);
  if (outline.length === 0 || width <= 0) return;
  ctx.save();
  tracePolygon(ctx, outline);
  ctx.lineWidth = width;
  ctx.lineJoin = g.shape === 'circle' || g.shape === 'rounded' ? 'round' : 'miter';
  ctx.miterLimit = 4;
  if (layer.dash === 'dashed') ctx.setLineDash([width * 3, width * 2]);
  if (layer.dash === 'dotted') {
    ctx.setLineDash([0.001, width * 2]);
    ctx.lineCap = 'round';
  }
  ctx.strokeStyle = paintStyle(ctx, g, layer.paint, layer.at, layer.at);
  if (layer.glow) {
    ctx.shadowColor = rgba(layer.glow, 1);
    ctx.shadowBlur = bandWidthPx(g) * 0.5;
  }
  ctx.stroke();
  ctx.restore();
}

/** Where each element of a repeat goes, for drawing and for picking on the canvas. */
export function repeatPlacements(layer: RepeatLayer, g: FrameGeometry) {
  const n = repeatCount(g, layer.at, layer.mode, layer.count, layer.spacing, layer.snapToCorners);
  const points = spacedAlong(outlineAt(g, layer.at), n, layer.offset);
  const h = layer.size * bandWidthPx(g);
  return points.map((p, i) => {
    const accent = layer.accentEvery > 0 && i % layer.accentEvery === 0;
    return { p, h: accent ? h * layer.accentScale : h, accent };
  });
}

function drawRepeat(ctx: Ctx, layer: RepeatLayer, g: FrameGeometry): void {
  const placements = repeatPlacements(layer, g);
  const runes = runeFor(layer.seed, placements.length);
  const w = bandWidthPx(g);
  const turn = (layer.rotation * Math.PI) / 180;
  ctx.save();
  if (layer.raised) raised(ctx, w);
  if (layer.glow) {
    ctx.shadowColor = rgba(layer.glow, 1);
    ctx.shadowBlur = w * 0.5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  placements.forEach(({ p, h, accent }, i) => {
    const l = localLight(p);
    // The light turned back by the element's own rotation.
    const light = { x: l.x * Math.cos(-turn) - l.y * Math.sin(-turn), y: l.x * Math.sin(-turn) + l.y * Math.cos(-turn) };
    atPoint(ctx, p, () => {
      ctx.rotate(turn);
      drawElement(ctx, layer.element, h, layer.stretch, {
        fill: accent && layer.accentColor ? layer.accentColor : layer.fill,
        outline: layer.outline,
        outlineWidth: layer.outlineWidth,
        rune: runes[i],
        light,
      });
    });
  });
  noShadow(ctx);
  ctx.restore();
}

export function drawLayer(ctx: Ctx, layer: Layer, g: FrameGeometry): void {
  switch (layer.type) {
    case 'legacyFrame':
      return drawLegacy(ctx, layer, g);
    case 'bandFill':
      return fillBand(ctx, g, layer.from, layer.to, layer.paint);
    case 'line':
      return drawLine(ctx, layer, g);
    case 'repeat':
      return drawRepeat(ctx, layer, g);
    case 'unsupported':
      return;
  }
}
