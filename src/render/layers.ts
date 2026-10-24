// One painter per layer type. Each draws its layer onto a context whose origin
// is the token's centre. New layer types are added here and in
// project/types.ts; the editor finds their controls in ui/PropertiesPanel.tsx.
// Groups and clipping are handled by renderProject.

import { rgba } from '../engine/legacy/color';
import { atPoint, noShadow, perimeterLength, seededRandom, tracePolygon, type FrameGeometry } from '../engine/legacy/frameKit';
import { drawFrame } from '../engine/legacy/frames';
import type { PerimeterSample, Point } from '../engine/legacy/shapes';
import type { Layer, LegacyFrameLayer, LineLayer, RepeatLayer, WaveShape } from '../project/types';
import { bandWidthPx, outlineAt, repeatCount, spacedAlong } from './band';
import { context2d, newCanvas, type Ctx } from './canvas';
import { drawElement, runeFor } from './elements';
import { lightAt, raisedFrom } from './light';
import { fillBand, paintCanvas, paintStyle, recolourRound, ringTableFor } from './paint';
import { drawPlaced } from './placed';
import { drawTexture } from './textures';

/** What every painter needs besides its layer. */
export interface RenderEnv {
  g: FrameGeometry;
  /** The stage's light direction, in degrees. */
  light: number;
  /** The square's size in pixels. */
  size: number;
}

function drawLegacy(ctx: Ctx, layer: LegacyFrameLayer, g: FrameGeometry): void {
  // Exactly what token-maker's renderer passes to drawFrame (its render.ts, layer 9).
  drawFrame(ctx, layer.style, { ...g, color: layer.color, accent: layer.accent ?? undefined });
}

/** The outline a line follows: the band's outline at its position, wobbling in and out if it is wavy. */
/** One wave of each shape, for t from 0 to 1 a wave: -1 (outwards) to 1 (inwards). */
const WAVE: Record<WaveShape, (t: number) => number> = {
  sine: (t) => Math.sin(Math.PI * 2 * t),
  zigzag: (t) => (2 / Math.PI) * Math.asin(Math.sin(Math.PI * 2 * t)),
  // Arches bulging outwards, meeting in points on the inside.
  scallop: (t) => 1 - 2 * Math.abs(Math.sin(Math.PI * t)),
  // Battlements: a smoothed square wave.
  square: (t) => Math.max(-1, Math.min(1, Math.sin(Math.PI * 2 * t) * 6)),
};

/** How many waves a line has: its own number, or as many as fit at its wave length (Token Maker's vines and knotwork). */
export function waveCount(layer: LineLayer, outline: Point[], g: FrameGeometry): number {
  if (layer.waveLength <= 0) return layer.waves;
  return Math.max(1, Math.round(perimeterLength(outline) / Math.max(1, layer.waveLength * bandWidthPx(g))));
}

export function lineOutline(layer: LineLayer, g: FrameGeometry): Point[] {
  const outline = outlineAt(g, layer.at);
  if (layer.waveAmplitude <= 0 || outline.length === 0) return outline;
  const waves = waveCount(layer, outline, g);
  const n = Math.max(240, waves * (layer.waveShape === 'sine' ? 24 : 48));
  const amp = layer.waveAmplitude * bandWidthPx(g);
  const wave = WAVE[layer.waveShape] ?? WAVE.sine;
  return spacedAlong(outline, n).map((p, i) => {
    const off = amp * wave(waves * (i / n) + layer.wavePhase);
    // Inwards is to the right of the direction of travel (outlines run clockwise).
    return { x: p.x - Math.sin(p.angle) * off, y: p.y + Math.cos(p.angle) * off };
  });
}

function drawLine(ctx: Ctx, layer: LineLayer, env: RenderEnv): void {
  const { g } = env;
  const outline = lineOutline(layer, g);
  const width = layer.width * bandWidthPx(g);
  if (outline.length === 0 || width <= 0) return;
  ctx.save();
  tracePolygon(ctx, outline);
  ctx.lineWidth = width;
  ctx.lineJoin = g.shape === 'circle' || g.shape === 'rounded' || layer.waveAmplitude > 0 ? 'round' : 'miter';
  ctx.miterLimit = 4;
  if (layer.dash === 'dashed') ctx.setLineDash([width * 3, width * 2]);
  if (layer.dash === 'dotted') {
    ctx.setLineDash([0.001, width * 2]);
    ctx.lineCap = 'round';
  }
  if (layer.paint.kind === 'ring') {
    // Stroked on its own canvas, recoloured round the ring, then put down (with its glow).
    const own = newCanvas(env.size, env.size);
    const octx = context2d(own);
    octx.translate(env.size / 2, env.size / 2);
    octx.lineWidth = ctx.lineWidth;
    octx.lineJoin = ctx.lineJoin;
    octx.lineCap = ctx.lineCap;
    octx.miterLimit = ctx.miterLimit;
    octx.setLineDash(ctx.getLineDash());
    tracePolygon(octx, outline);
    octx.strokeStyle = '#000000';
    octx.stroke();
    recolourRound(octx, g.R, ringTableFor(layer.paint, env.light));
    if (layer.raised) raisedFrom(ctx, bandWidthPx(g), env.light);
    if (layer.glow) {
      ctx.shadowColor = rgba(layer.glow, 1);
      ctx.shadowBlur = bandWidthPx(g) * 0.5;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(own as CanvasImageSource, 0, 0);
    ctx.restore();
    return;
  }
  ctx.strokeStyle = paintStyle(ctx, g, layer.paint, layer.at, layer.at, env.light);
  if (layer.raised) raisedFrom(ctx, bandWidthPx(g), env.light);
  if (layer.glow) {
    ctx.shadowColor = rgba(layer.glow, 1);
    ctx.shadowBlur = bandWidthPx(g) * 0.5;
  }
  ctx.stroke();
  ctx.restore();
}

export interface RepeatPlacement {
  p: PerimeterSample;
  /** Height in pixels. */
  h: number;
  accent: boolean;
  color: string;
  /** Points the other way (alternate sides). */
  flip: boolean;
  /** Its number round the ring before any were left out (picks the rune or note). */
  index: number;
  /** Extra turn from the random variation, in radians. */
  turn: number;
  /** A random number (0–1) for elements that come in kinds (Bard's notes), or undefined. */
  variant?: number;
}

/** How far element i is from the nearest bigger one, counting round the ring. */
function stepsFromAccent(i: number, n: number, every: number): number {
  const back = i % every;
  const next = i + (every - back);
  return Math.min(back, next < n ? next - i : n - i);
}

/** Where each element of a repeat goes, for drawing and for picking on the canvas. */
/**
 * The random variation of each element, from the layer's seed: in turn, as
 * each is switched on, how far it wanders in or out, its size, its turn and
 * (for Bard's notes) its kind, as Token Maker draws them in that order.
 */
function variations(layer: RepeatLayer, n: number) {
  const random = seededRandom(layer.seed);
  const kinds = layer.element === 'bardNote';
  return Array.from({ length: n }, () => ({
    across: layer.wander > 0 ? (random() - 0.5) * layer.wander : 0,
    size: layer.sizeVariation > 0 ? 1 + (random() - 0.5) * layer.sizeVariation : 1,
    turn: layer.rotationVariation > 0 ? (((random() - 0.5) * layer.rotationVariation) * Math.PI) / 180 : 0,
    variant: kinds ? random() : undefined,
  }));
}

export function repeatPlacements(layer: RepeatLayer, g: FrameGeometry): RepeatPlacement[] {
  const n = repeatCount(g, layer.at, layer.mode, layer.count, layer.spacing, layer.snapToCorners, layer.multipleOf);
  const points = spacedAlong(outlineAt(g, layer.at), n, layer.offset);
  const w = bandWidthPx(g);
  const h = layer.size * w;
  const colors = [layer.fill, ...layer.altColors];
  const vary = variations(layer, points.length);
  const out: RepeatPlacement[] = [];
  points.forEach((p, i) => {
    if (layer.show.length && !layer.show[i % layer.show.length]) return;
    const accent = layer.accentEvery > 0 && i % layer.accentEvery === 0;
    if (!accent && layer.accentEvery > 0 && layer.skipAroundAccent > 0 && stepsFromAccent(i, n, layer.accentEvery) <= layer.skipAroundAccent) return;
    const v = vary[i];
    const size = h * (layer.altSizes.length ? layer.altSizes[i % layer.altSizes.length] : 1) * (accent ? layer.accentScale : 1) * v.size;
    const flip = layer.alternateSides > 0 && i % 2 === 1;
    let at = p;
    const off = (layer.alternateSides > 0 ? (flip ? 1 : -1) * layer.alternateSides * w : 0) + v.across * w;
    if (off !== 0) at = { ...p, x: p.x - Math.sin(p.angle) * off, y: p.y + Math.cos(p.angle) * off };
    const color = accent && layer.accentColor ? layer.accentColor : colors[i % colors.length];
    out.push({ p: at, h: size, accent, color, flip, index: i, turn: v.turn, variant: v.variant });
  });
  return out;
}

function drawRepeat(ctx: Ctx, layer: RepeatLayer, env: RenderEnv): void {
  const { g } = env;
  const placements = repeatPlacements(layer, g);
  const variants = runeFor(layer.seed, placements.at(-1) ? placements.at(-1)!.index + 1 : 0);
  const w = bandWidthPx(g);
  const turn = (layer.rotation * Math.PI) / 180;
  const paint = layer.fillPaint ? { canvas: paintCanvas(layer.fillPaint, g, env.light, env.size), each: layer.paintEach } : null;
  ctx.save();
  if (layer.raised) raisedFrom(ctx, w, env.light);
  if (layer.glow) {
    ctx.shadowColor = rgba(layer.glow, 1);
    ctx.shadowBlur = w * 0.5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  for (const { p, h, color, flip, index, turn: extra, variant } of placements) {
    const l = lightAt(p, env.light);
    const t = turn + extra;
    // The light turned back by the element's own rotation, and flipped with it.
    const light = { x: l.x * Math.cos(-t) - l.y * Math.sin(-t), y: (l.x * Math.sin(-t) + l.y * Math.cos(-t)) * (flip ? -1 : 1) };
    atPoint(ctx, p, () => {
      ctx.rotate(t);
      if (flip) ctx.scale(1, -1);
      drawElement(ctx, layer.element, h, layer.stretch, {
        fill: color,
        outline: layer.outline,
        outlineWidth: layer.outlineWidth,
        rune: variants[index],
        light,
        shaded: layer.shaded,
        detail: layer.detail,
        variant,
        paint,
      });
    });
  }
  noShadow(ctx);
  ctx.restore();
}

/** Draws one layer that isn't a group (groups are drawn by renderProject). */
export function drawLayer(ctx: Ctx, layer: Layer, env: RenderEnv): void {
  switch (layer.type) {
    case 'legacyFrame':
      return drawLegacy(ctx, layer, env.g);
    case 'bandFill':
      return fillBand(ctx, env.g, layer.from, layer.to, layer.paint, env.light);
    case 'line':
      return drawLine(ctx, layer, env);
    case 'repeat':
      return drawRepeat(ctx, layer, env);
    case 'texture':
      return drawTexture(ctx, layer, env.g, env.light, env.size);
    case 'shape':
    case 'path':
      return drawPlaced(ctx, layer, env.g, env.light, env.size);
    case 'group':
    case 'unsupported':
      return;
  }
}
