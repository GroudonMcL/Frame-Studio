// The shapes a Repeated shapes layer can use. Each is drawn centred on the
// origin in a point's local frame (+x along the band, +y in towards the
// token's centre), `h` pixels tall and `h * stretch` wide.

import { shade } from '../engine/legacy/color';
import { seededRandom, sphere } from '../engine/legacy/frameKit';
import type { ElementKind } from '../project/types';
import type { Ctx } from './canvas';

export const ELEMENT_NAMES: Record<ElementKind, string> = {
  bead: 'Bead (shaded)',
  circle: 'Circle',
  diamond: 'Diamond',
  square: 'Square',
  triangle: 'Triangle',
  star: 'Star',
  cross: 'Cross',
  rune: 'Rune',
  leaf: 'Leaf',
  spike: 'Spike',
};

/** Little glyphs drawn as strokes (x and y from -1 to 1), in the style of token-maker's Arcane runes. */
const RUNES: number[][][] = [
  [[0, -1, 0, 1], [0, -1, 0.7, -0.4]],
  [[0, -1, 0, 1], [-0.6, -0.3, 0.6, 0.3]],
  [[-0.6, 1, 0, -1], [0, -1, 0.6, 1], [-0.3, 0.2, 0.3, 0.2]],
  [[0, -1, 0, 1], [0, 0, 0.6, -0.6], [0, 0, 0.6, 0.6]],
  [[-0.6, -1, 0.6, 1], [0.6, -1, -0.6, 1]],
  [[0, -1, 0, 1], [-0.6, -0.5, 0, 0], [0.6, -0.5, 0, 0]],
  [[-0.5, -1, 0.5, -1], [0, -1, 0, 1], [-0.5, 1, 0.5, 1]],
];

/** Which rune the i-th element of a layer gets. */
export function runeFor(seed: number, count: number): number[] {
  const random = seededRandom(seed * 7919 + 0x7a1);
  return Array.from({ length: count }, () => Math.floor(random() * RUNES.length));
}

/** Traces the outline of a filled element (everything except bead and rune). */
function trace(ctx: Ctx, kind: ElementKind, w: number, h: number): void {
  const x = w / 2;
  const y = h / 2;
  ctx.beginPath();
  switch (kind) {
    case 'circle':
    case 'bead':
      ctx.ellipse(0, 0, x, y, 0, 0, Math.PI * 2);
      break;
    case 'diamond':
      ctx.moveTo(0, -y);
      ctx.lineTo(x, 0);
      ctx.lineTo(0, y);
      ctx.lineTo(-x, 0);
      break;
    case 'square':
      ctx.rect(-x, -y, w, h);
      break;
    case 'triangle':
      // Points outwards, away from the token's centre.
      ctx.moveTo(0, -y);
      ctx.lineTo(x, y);
      ctx.lineTo(-x, y);
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 0.45 : 1;
        ctx.lineTo(Math.cos(a) * x * r, Math.sin(a) * y * r);
      }
      break;
    case 'cross': {
      const t = 0.22;
      ctx.rect(-x * t, -y, w * t, h);
      ctx.rect(-x, -y * t, w, h * t);
      break;
    }
    case 'leaf':
      ctx.moveTo(0, -y);
      ctx.quadraticCurveTo(x * 1.4, 0, 0, y);
      ctx.quadraticCurveTo(-x * 1.4, 0, 0, -y);
      break;
    case 'spike':
      ctx.moveTo(0, -y);
      ctx.quadraticCurveTo(x * 0.25, 0, x, y);
      ctx.lineTo(-x, y);
      ctx.quadraticCurveTo(-x * 0.25, 0, 0, -y);
      break;
    case 'rune':
      break;
  }
  ctx.closePath();
}

export interface ElementStyle {
  fill: string;
  outline: string | null;
  /** Fraction of the element's height. */
  outlineWidth: number;
  rune: number;
  /** Direction the light comes from, in the element's own frame (unit vector). */
  light: { x: number; y: number };
}

export function drawElement(ctx: Ctx, kind: ElementKind, h: number, stretch: number, style: ElementStyle): void {
  const w = h * stretch;
  if (h <= 0) return;
  if (kind === 'rune') {
    const strokes = RUNES[style.rune % RUNES.length];
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of strokes) {
      ctx.moveTo((x0 * w) / 2, (y0 * h) / 2);
      ctx.lineTo((x1 * w) / 2, (y1 * h) / 2);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = style.fill;
    ctx.lineWidth = Math.max(1, h * Math.max(0.08, style.outlineWidth));
    ctx.stroke();
    return;
  }
  if (kind === 'bead') {
    ctx.save();
    ctx.scale(stretch, 1);
    sphere(ctx, 0, 0, h / 2, style.fill, style.light);
    ctx.restore();
  } else {
    trace(ctx, kind, w, h);
    // Lit from the top left, like everything in token-maker.
    const { x, y } = style.light;
    const gradient = ctx.createLinearGradient((x * w) / 2, (y * h) / 2, (-x * w) / 2, (-y * h) / 2);
    gradient.addColorStop(0, shade(style.fill, 0.25));
    gradient.addColorStop(1, shade(style.fill, -0.3));
    ctx.fillStyle = gradient;
    ctx.fill('nonzero');
  }
  if (style.outline && style.outlineWidth > 0) {
    trace(ctx, kind, w, h);
    ctx.strokeStyle = style.outline;
    ctx.lineWidth = Math.max(0.5, h * style.outlineWidth);
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}
