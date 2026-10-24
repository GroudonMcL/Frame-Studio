// The shapes a Repeated shapes layer can use. Each is drawn centred on the
// origin in a point's local frame (+x along the band, +y in towards the
// token's centre), `h` pixels tall and `h * stretch` wide.

import { shade } from '../engine/legacy/color';
import { noShadow, seededRandom, sphere } from '../engine/legacy/frameKit';
import type { ElementKind } from '../project/types';
import type { Ctx } from './canvas';
import { GLYPHS, STROKED, traceGlyph, type Glyph } from './glyphs';
import { turn } from './light';

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
  chevron: 'Chevron',
  tick: 'Tick mark',
  gear: 'Gear',
  eye: 'Eye',
  note: 'Music note',
  claw: 'Claw marks',
  fletching: 'Fletching (open chevron)',
  bardNote: 'Music note (Bard’s)',
  watchEye: 'Eye (detailed, Warlock’s)',
  gash: 'Claw gashes (Barbarian’s)',
  tooth: 'Gear tooth',
  cog: 'Cog with a hub',
  sprig: 'Leaf on a stem (Druid’s)',
  heart: 'Heart',
  crescent: 'Crescent moon',
  flame: 'Flame',
  fleur: 'Fleur-de-lis',
  shield: 'Shield',
  sun: 'Sun',
  snowflake: 'Snowflake',
  crown: 'Crown',
  gem: 'Cut gem',
  drop: 'Drop',
  shell: 'Scallop shell',
  spiral: 'Spiral',
  paw: 'Paw print',
  feather: 'Feather',
  knot: 'Celtic knot',
  skull: 'Skull',
  arrow: 'Arrow',
};

/** Elements with a second colour (`detail`), and what it is called in the editor. */
export const DETAIL_NAMES: Partial<Record<ElementKind, string>> = {
  watchEye: 'White of the eye',
  gash: 'Lit edge',
  cog: 'Hub',
  flame: 'Inner flame',
  shield: 'Inner field',
  crown: 'Band',
  gem: 'Top facet',
  shell: 'Ribs',
  feather: 'Shaft',
  knot: 'Cord edge',
  skull: 'Eyes and teeth',
};

/** Elements drawn as lines, whose "outline width" is the thickness of their lines. */
export const LINE_ELEMENTS = new Set<ElementKind>(['rune', 'fletching', ...STROKED]);

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

/** Which rune (or note: single or paired) the i-th element of a layer gets. */
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
    case 'chevron':
      // An arrowhead pointing along the band, like Ranger's fletching.
      ctx.moveTo(-x, -y);
      ctx.lineTo(0, -y);
      ctx.lineTo(x, 0);
      ctx.lineTo(0, y);
      ctx.lineTo(-x, y);
      ctx.lineTo(0, 0);
      break;
    case 'tick':
      ctx.rect(-x * 0.18, -y, w * 0.18, h);
      break;
    case 'gear': {
      const teeth = 8;
      for (let i = 0; i < teeth * 4; i++) {
        const a = -Math.PI / 2 + ((i - 0.5) * Math.PI * 2) / (teeth * 4);
        const r = i % 4 < 2 ? 1 : 0.76;
        ctx.lineTo(Math.cos(a) * x * r, Math.sin(a) * y * r);
      }
      ctx.closePath();
      // The hole, drawn the other way round so it stays empty.
      ctx.moveTo(x * 0.3, 0);
      ctx.ellipse(0, 0, x * 0.3, y * 0.3, 0, 0, -Math.PI * 2, true);
      break;
    }
    case 'eye':
      ctx.moveTo(-x, 0);
      ctx.quadraticCurveTo(0, -y * 1.6, x, 0);
      ctx.quadraticCurveTo(0, y * 1.6, -x, 0);
      break;
    case 'claw':
      // Three tapering gashes.
      for (const k of [-1, 0, 1]) {
        const cx = k * x * 0.62;
        ctx.moveTo(cx - x * 0.26, -y);
        ctx.quadraticCurveTo(cx + x * 0.3, 0, cx + x * 0.14, y);
        ctx.quadraticCurveTo(cx - x * 0.06, 0, cx - x * 0.26, -y);
        ctx.closePath();
      }
      break;
    case 'note':
    case 'rune':
      break;
  }
  ctx.closePath();
}

/** Music notes: one, or two joined by a beam. */
function traceNote(ctx: Ctx, w: number, h: number, paired: boolean): void {
  const x = w / 2;
  const y = h / 2;
  const heads = paired ? [-x * 0.55, x * 0.45] : [-x * 0.15];
  const stem = Math.max(0.6, w * 0.08);
  ctx.beginPath();
  for (const hx of heads) {
    ctx.ellipse(hx, y * 0.62, x * (paired ? 0.32 : 0.48), y * 0.3, -0.35, 0, Math.PI * 2);
    ctx.closePath();
    const sx = hx + x * (paired ? 0.28 : 0.42);
    ctx.rect(sx - stem, -y, stem, y * 1.55);
  }
  if (paired) ctx.rect(heads[0] + x * 0.28 - stem, -y, heads[1] - heads[0] + stem, y * 0.26);
  else {
    const sx = heads[0] + x * 0.42;
    ctx.moveTo(sx, -y);
    ctx.quadraticCurveTo(sx + x * 0.7, -y * 0.5, sx + x * 0.35, y * 0.1);
    ctx.quadraticCurveTo(sx + x * 0.45, -y * 0.45, sx, -y * 0.55);
    ctx.closePath();
  }
}

/** Fills the current path with `color`, brighter towards the light and darker away from it (or flat, if not `shaded`). */
export function shadedFill(ctx: Ctx, color: string, w: number, h: number, light: { x: number; y: number }, rule: CanvasFillRule = 'nonzero', shaded = true): void {
  if (!shaded) {
    ctx.fillStyle = color;
    ctx.fill(rule);
    return;
  }
  const { x, y } = light;
  const gradient = ctx.createLinearGradient((x * w) / 2, (y * h) / 2, (-x * w) / 2, (-y * h) / 2);
  gradient.addColorStop(0, shade(color, 0.25));
  gradient.addColorStop(1, shade(color, -0.3));
  ctx.fillStyle = gradient;
  ctx.fill(rule);
}

export interface ElementStyle {
  fill: string;
  outline: string | null;
  /** Fraction of the element's height. */
  outlineWidth: number;
  rune: number;
  /** Direction the light comes from, in the element's own frame (unit vector). */
  light: { x: number; y: number };
  /** Shaded by the light (the default), or one flat colour. */
  shaded?: boolean;
  /** The second colour of two-part elements; null or missing = worked out from `fill`. */
  detail?: string | null;
  /** Varies some elements (Bard's notes: single or paired), 0–1; missing = the first kind. */
  variant?: number;
}

/** Token Maker's Bard note: a head and stem, single with a flag or paired with a beam. `u` is Token Maker's band width × 2.5. */
function bardNote(ctx: Ctx, h: number, stretch: number, style: ElementStyle): void {
  const u = h / 0.4;
  const paired = (style.variant ?? 1) < 0.4;
  ctx.save();
  ctx.scale(stretch, 1);
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = style.fill;
  ctx.lineWidth = u * 0.035;
  for (const x of paired ? [-u * 0.1, u * 0.1] : [0]) {
    ctx.beginPath();
    ctx.ellipse(x, u * 0.1, u * 0.07, u * 0.05, -0.4, 0, Math.PI * 2);
    if (style.shaded) shadedFill(ctx, style.fill, u * 0.14, u * 0.1, style.light);
    else ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + u * 0.06, u * 0.09);
    ctx.lineTo(x + u * 0.06, -u * 0.2);
    ctx.stroke();
  }
  ctx.beginPath();
  if (paired) {
    ctx.moveTo(-u * 0.04, -u * 0.2);
    ctx.lineTo(u * 0.16, -u * 0.2);
    ctx.lineWidth = u * 0.06;
  } else {
    ctx.moveTo(u * 0.06, -u * 0.2);
    ctx.quadraticCurveTo(u * 0.18, -u * 0.12, u * 0.14, -u * 0.02);
  }
  ctx.stroke();
  ctx.restore();
}

/** Token Maker's Warlock eye: a veined white, a shaded iris in the element's colour looking inwards, the pupil, a glint and a dark rim. */
function watchEye(ctx: Ctx, w: number, h: number, style: ElementStyle): void {
  const r = h / 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, r, 0, 0, Math.PI * 2);
  ctx.fillStyle = style.detail ?? '#f2ead8';
  ctx.fill();
  // Only the white casts the shadow.
  noShadow(ctx);
  const veins = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.3);
  veins.addColorStop(0, 'rgba(255, 255, 255, 0)');
  veins.addColorStop(1, 'rgba(120, 20, 20, 0.45)');
  ctx.fillStyle = veins;
  ctx.fill();
  if (style.shaded === false) {
    ctx.beginPath();
    ctx.arc(0, r * 0.3, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = style.fill;
    ctx.fill();
  } else sphere(ctx, 0, r * 0.3, r * 0.6, style.fill, style.light);
  ctx.fillStyle = '#050505';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r * 0.15, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(-r * 0.2, r * 0.05, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  if (style.outlineWidth > 0) {
    ctx.strokeStyle = style.outline ?? 'rgba(20, 0, 10, 0.85)';
    ctx.lineWidth = Math.max(0.5, h * style.outlineWidth);
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, r, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Token Maker's Barbarian gashes: three curved cuts, each with a lit edge. Width 1 is Token Maker's proportions ÷ 1.13. */
function gash(ctx: Ctx, h: number, stretch: number, style: ElementStyle): void {
  const k = h / 1.65;
  ctx.save();
  ctx.scale(1.5 * stretch, 1.5);
  ctx.lineCap = 'round';
  for (const dx of [-0.16, 0, 0.16]) {
    ctx.strokeStyle = style.fill;
    ctx.lineWidth = k * 0.09;
    ctx.beginPath();
    ctx.moveTo(dx * k, -k * 0.55);
    ctx.quadraticCurveTo(dx * k + k * 0.05, 0, dx * k, k * 0.55);
    ctx.stroke();
    ctx.strokeStyle = style.detail ?? shade(style.fill, 0.6);
    ctx.lineWidth = k * 0.02;
    ctx.beginPath();
    ctx.moveTo(dx * k - k * 0.04, -k * 0.5);
    ctx.quadraticCurveTo(dx * k + k * 0.01, 0, dx * k - k * 0.04, k * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** Token Maker's Artificer cog: eight teeth, a hub (shaded, unless flat) and a dark hole. */
function cog(ctx: Ctx, h: number, stretch: number, style: ElementStyle): void {
  const r = h / 2 / 1.3;
  ctx.save();
  ctx.scale(stretch, 1);
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rr = i % 2 ? r : r * 1.3;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  // A flat cog (as Token Maker's) with a domed hub.
  ctx.fillStyle = style.fill;
  ctx.fill();
  if (style.outline && style.outlineWidth > 0) {
    ctx.strokeStyle = style.outline;
    ctx.lineWidth = Math.max(0.5, h * style.outlineWidth);
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  noShadow(ctx);
  const hub = style.detail ?? shade(style.fill, -0.15);
  if (style.shaded === false) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = hub;
    ctx.fill();
  } else sphere(ctx, 0, 0, r * 0.8, hub, style.light);
  ctx.fillStyle = shade(hub, -0.7);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Token Maker's Druid leaf: growing from the element's point along the band, tilted outwards. */
function sprig(ctx: Ctx, h: number, stretch: number, style: ElementStyle): void {
  const tilt = -0.9;
  const bulge = (0.12 / 0.36) * h * stretch;
  ctx.save();
  ctx.rotate(tilt);
  ctx.translate(h / 2, 0);
  ctx.beginPath();
  ctx.moveTo(-h / 2, 0);
  ctx.quadraticCurveTo(-h / 2 + h * 0.472, bulge, h / 2, 0);
  ctx.quadraticCurveTo(-h / 2 + h * 0.472, -bulge, -h / 2, 0);
  ctx.closePath();
  shadedFill(ctx, style.fill, h, bulge, turn(style.light, -tilt), 'nonzero', style.shaded);
  if (style.outline && style.outlineWidth > 0) {
    ctx.strokeStyle = style.outline;
    ctx.lineWidth = Math.max(0.5, h * style.outlineWidth);
    ctx.stroke();
  }
  ctx.restore();
}

/** Ranger's fletching: an open chevron pointing along the band, drawn as a line. */
function fletching(ctx: Ctx, w: number, h: number, style: ElementStyle): void {
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, 0);
  ctx.lineTo(-w / 2, h / 2);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = style.fill;
  ctx.lineWidth = Math.max(0.5, h * Math.max(0.02, style.outlineWidth));
  ctx.stroke();
}

/** One of the path-drawn ornaments (glyphs.ts): its body, its detail in the second colour, its outline. */
function drawGlyph(ctx: Ctx, glyph: Glyph, w: number, h: number, style: ElementStyle): void {
  const x = w / 2;
  const y = h / 2;
  const lineWidth = Math.max(0.5, h * Math.max(0.03, style.outlineWidth) * (glyph.weight ?? 1));
  if (glyph.lines) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (glyph.edged) {
      // A darker edge under the line, like a cord.
      traceGlyph(ctx, glyph.lines, x, y, false);
      ctx.strokeStyle = style.detail ?? shade(style.fill, -0.6);
      ctx.lineWidth = lineWidth * 1.6;
      ctx.stroke();
      noShadow(ctx);
    }
    traceGlyph(ctx, glyph.lines, x, y, false);
    ctx.strokeStyle = style.fill;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    return;
  }
  traceGlyph(ctx, glyph.body!, x, y, true);
  shadedFill(ctx, style.fill, w, h, style.light, 'nonzero', style.shaded);
  if (glyph.detail || glyph.detailLines) {
    // Only the body casts the shadow.
    noShadow(ctx);
    const color = style.detail ?? shade(style.fill, glyph.detailShade ?? -0.5);
    if (glyph.detail) {
      traceGlyph(ctx, glyph.detail, x, y, true);
      shadedFill(ctx, color, w, h, style.light, 'nonzero', style.shaded);
    }
    if (glyph.detailLines) {
      traceGlyph(ctx, glyph.detailLines, x, y, false);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.5, h * 0.045);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
  if (style.outline && style.outlineWidth > 0) {
    noShadow(ctx);
    traceGlyph(ctx, glyph.body!, x, y, true);
    ctx.strokeStyle = style.outline;
    ctx.lineWidth = Math.max(0.5, h * style.outlineWidth);
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function drawElement(ctx: Ctx, kind: ElementKind, h: number, stretch: number, style: ElementStyle): void {
  const w = h * stretch;
  if (h <= 0) return;
  const glyph = GLYPHS[kind];
  if (glyph) return drawGlyph(ctx, glyph, w, h, style);
  switch (kind) {
    case 'bardNote':
      return bardNote(ctx, h, stretch, style);
    case 'watchEye':
      return watchEye(ctx, w, h, style);
    case 'gash':
      return gash(ctx, h, stretch, style);
    case 'cog':
      return cog(ctx, h, stretch, style);
    case 'sprig':
      return sprig(ctx, h, stretch, style);
    case 'fletching':
      return fletching(ctx, w, h, style);
  }
  if (kind === 'note') {
    traceNote(ctx, w, h, style.rune % 2 === 1);
    shadedFill(ctx, style.fill, w, h, style.light, 'nonzero', style.shaded);
    if (style.outline && style.outlineWidth > 0) {
      ctx.strokeStyle = style.outline;
      ctx.lineWidth = Math.max(0.5, h * style.outlineWidth);
      ctx.stroke();
    }
    return;
  }
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
    if (style.shaded === false) {
      ctx.beginPath();
      ctx.arc(0, 0, h / 2, 0, Math.PI * 2);
      ctx.fillStyle = style.fill;
      ctx.fill();
    } else sphere(ctx, 0, 0, h / 2, style.fill, style.light);
    ctx.restore();
  } else if (kind === 'eye') {
    // White of the eye, then the iris in the element's colour, looking inwards, and the pupil.
    trace(ctx, kind, w, h);
    shadedFill(ctx, '#f1e9d6', w, h, style.light, 'nonzero', style.shaded);
    ctx.save();
    ctx.clip();
    const r = Math.min(w, h) * 0.3;
    ctx.beginPath();
    ctx.arc(0, h * 0.08, r, 0, Math.PI * 2);
    shadedFill(ctx, style.fill, r * 2, r * 2, style.light, 'nonzero', style.shaded);
    ctx.beginPath();
    ctx.ellipse(0, h * 0.08, r * 0.38, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0a08';
    ctx.fill();
    ctx.restore();
  } else {
    trace(ctx, kind, w, h);
    // Lit from the stage's light (the top left unless it was moved).
    shadedFill(ctx, style.fill, w, h, style.light, kind === 'gear' ? 'evenodd' : 'nonzero', style.shaded);
  }
  if (style.outline && style.outlineWidth > 0) {
    trace(ctx, kind, w, h);
    ctx.strokeStyle = style.outline;
    ctx.lineWidth = Math.max(0.5, h * style.outlineWidth);
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}
