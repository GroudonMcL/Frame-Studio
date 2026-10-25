// Effects (DESIGN.md §5.4): non-destructive filters on a layer's picture,
// applied in order before it is composited. They work on the picture's
// pixels, so they suit any layer (or group) whatever drew it.
//
// The bevel is the 2.5D surface system: a height map is made from the
// picture's shape (each pixel's distance from the edge, through a profile)
// plus a procedural surface, turned into normals and lit by the stage's light,
// so every bevelled layer is lit as one object. Sizes are in band widths, so
// an effect looks the same at every token size and thickness. Everything is
// plain arithmetic on the pixels (no canvas filters), so the preview, the
// export and the tests (node) draw exactly the same picture.

import type { AdjustEffect, BevelEffect, BevelProfile, Effect, GlowEffect, GradientStop, RecolourEffect, ShadowEffect, Surface, WearEffect } from '../project/types';
import type { Ctx } from './canvas';
import { lightVector } from './light';

export interface EffectEnv {
  /** The band's width in pixels: the unit of every size. */
  bw: number;
  /** The stage's light, in degrees. */
  light: number;
}

/** Effects that are switched on. */
export const activeEffects = (effects: Effect[] | undefined) => (effects ?? []).filter((e) => e.on);

/** Applies `effects` (first first) to the whole `size`×`size` picture drawn on `ctx`. */
export function applyEffects(ctx: Ctx, size: number, effects: Effect[], env: EffectEnv): void {
  const on = activeEffects(effects);
  if (on.length === 0) return;
  const image = ctx.getImageData(0, 0, size, size);
  const px = image.data;
  // Nothing painted, nothing to do (a shadow or glow needs something to come from).
  let any = false;
  for (let i = 3; i < px.length; i += 4) if (px[i]) { any = true; break; }
  if (!any) return;
  for (const e of on) {
    switch (e.kind) {
      case 'bevel':
        bevel(px, size, e, env);
        break;
      case 'shadow':
        shadow(px, size, e, env);
        break;
      case 'glow':
        glow(px, size, e, env);
        break;
      case 'recolour':
        recolour(px, e);
        break;
      case 'adjust':
        adjust(px, e);
        break;
      case 'wear':
        wear(px, size, e, env);
        break;
    }
  }
  ctx.putImageData(image, 0, 0);
}

// ---------------------------------------------------------------- helpers

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function rgbOf(hex: string): [number, number, number] {
  const h = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex;
  const n = parseInt(h.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function alphaOf(px: Uint8ClampedArray): Float32Array {
  const a = new Float32Array(px.length / 4);
  for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3] / 255;
  return a;
}

/**
 * A box blur run three times (close to a Gaussian), `r` pixels each way.
 * Outside the picture counts as `edge`.
 */
export function blur(src: Float32Array, size: number, r: number, edge = 0): Float32Array {
  const radius = Math.max(0, Math.round(r / 1.7));
  if (radius < 1) return src.slice();
  const a = src.slice();
  const b = new Float32Array(a.length);
  for (let pass = 0; pass < 3; pass++) {
    boxLine(a, b, size, radius, edge, true);
    boxLine(b, a, size, radius, edge, false);
  }
  return a;
}

function boxLine(src: Float32Array, dst: Float32Array, size: number, r: number, edge: number, rows: boolean): void {
  const n = 2 * r + 1;
  for (let line = 0; line < size; line++) {
    const at = (k: number) => (rows ? line * size + k : k * size + line);
    const value = (k: number) => (k < 0 || k >= size ? edge : src[at(k)]);
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += value(k);
    for (let k = 0; k < size; k++) {
      dst[at(k)] = sum / n;
      sum += value(k + r + 1) - value(k - r);
    }
  }
}

/**
 * How far each painted pixel (alpha ≥ ½) is from the nearest unpainted one,
 * in pixels (Felzenszwalb and Huttenlocher's exact distance transform).
 * Outside the picture counts as unpainted (or, with `outsidePainted`, as
 * painted). Unpainted pixels get 0.
 */
export function insideDistance(alpha: Float32Array, size: number, outsidePainted = false): Float32Array {
  const n = size + 2;
  const INF = 1e20;
  const f = new Float64Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const inside = x > 0 && y > 0 && x <= size && y <= size ? alpha[(y - 1) * size + (x - 1)] >= 0.5 : outsidePainted;
      f[y * n + x] = inside ? INF : 0;
    }
  const line = new Float64Array(n);
  const out = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const pass = (stride: number, step: number) => {
    for (let l = 0; l < n; l++) {
      for (let k = 0; k < n; k++) line[k] = f[l * stride + k * step];
      edt1d(line, n, out, v, z);
      for (let k = 0; k < n; k++) f[l * stride + k * step] = out[k];
    }
  };
  pass(n, 1);
  pass(1, n);
  const d = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      // Half a pixel is the edge itself; a soft edge pixel sits partly outside.
      d[i] = alpha[i] >= 0.5 ? Math.max(0, Math.sqrt(f[(y + 1) * n + x + 1]) - 1 + alpha[i]) : 0;
    }
  return d;
}

function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

// ---------------------------------------------------------------- noise

/** A repeatable random number in [0, 1) for a lattice point. */
function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Fractal noise, roughly 0–1. */
export function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x, y, seed + o * 131);
    norm += amp;
    amp *= 0.5;
    x *= 2.03;
    y *= 2.03;
  }
  return sum / norm;
}

/** Cell noise: the distances to the nearest and second-nearest of one random point per cell (or a staggered grid, if `regular`). */
function cells(x: number, y: number, seed: number, regular = false): [number, number] {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i;
      const cy = iy + j;
      const px = regular ? cx + 0.5 + (cy & 1 ? 0.5 : 0) : cx + hash(cx, cy, seed);
      const py = regular ? cy + 0.5 : cy + hash(cx, cy, seed + 7);
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
  return [f1, f2];
}

/**
 * A procedural surface's height at (x, y) in cell units, about −1…1.
 * `polar` gives the position round the token, for the brushed finish.
 */
export function surfaceHeight(surface: Surface, x: number, y: number, seed: number, polar: { along: number; r: number }): number {
  switch (surface) {
    case 'smooth':
      return 0;
    case 'hammered': {
      // Overlapping round dents, ridges where they meet.
      const [f1] = cells(x * 1.2, y * 1.2, seed);
      return f1 * f1 * 2 - 0.6 + (fbm(x * 3, y * 3, seed + 5, 2) - 0.5) * 0.3;
    }
    case 'grain':
      return (fbm(x * 1.5, y * 1.5, seed) - 0.5) * 2.4;
    case 'brushed':
      // Fine streaks running round the token.
      return (fbm(polar.along * 0.25, polar.r * 9, seed, 3) - 0.5) * 2.2;
    case 'cracked': {
      const [f1, f2] = cells(x * 0.8, y * 0.8, seed);
      const crack = 1 - smooth(0, 0.09, f2 - f1);
      return -crack * 1.4 + (fbm(x * 2, y * 2, seed + 3, 2) - 0.5) * 0.4;
    }
    case 'scales': {
      const [f1] = cells(x * 1.3, y * 1.3, seed, true);
      return Math.sqrt(Math.max(0, 1 - (f1 * f1) / 0.42)) * 1.6 - 0.6;
    }
  }
}

// ---------------------------------------------------------------- bevel

function profile(p: BevelProfile, t: number): number {
  switch (p) {
    case 'rounded':
      return Math.sqrt(1 - (1 - t) * (1 - t));
    case 'chisel':
      return t;
    case 'cove':
      return 1 - Math.sqrt(1 - t * t);
    case 'ridge':
      // A rim along the edge, the middle left low (like a coin's).
      return t >= 1 ? 0 : Math.sin(Math.PI * t);
    case 'stepped': {
      const s = t * 3;
      const i = Math.min(2, Math.floor(s));
      return (i + smooth(0.55, 1, s - i)) / 3;
    }
  }
}

/** The light as a unit vector in 3D (+z towards the viewer), from the stage's light and a height above the band. */
export function light3d(light: number, heightDeg: number): [number, number, number] {
  const v = lightVector(light);
  const el = (heightDeg * Math.PI) / 180;
  return [v.x * Math.cos(el), v.y * Math.cos(el), Math.sin(el)];
}

/** The bevel's height map, in pixels (raised positive). */
export function bevelHeight(alpha: Float32Array, size: number, e: BevelEffect, env: EffectEnv): Float32Array {
  const dist = insideDistance(alpha, size);
  const S = Math.max(1, e.size * env.bw);
  const H = new Float32Array(alpha.length);
  const sign = e.direction === 'sunken' ? -1 : 1;
  const cell = Math.max(2, e.surfaceScale * env.bw);
  const bump = e.surface === 'smooth' ? 0 : e.surfaceDepth * cell * 0.3;
  const half = size / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (alpha[i] <= 0) continue;
      const t = clamp01(dist[i] / S);
      let h = profile(e.profile, t) * S * e.depth * sign;
      if (bump) {
        const dx = x - half;
        const dy = y - half;
        const r = Math.hypot(dx, dy);
        h += bump * surfaceHeight(e.surface, x / cell, y / cell, e.seed, { along: (Math.atan2(dy, dx) * r) / cell, r: r / cell });
      }
      H[i] = h * Math.min(1, alpha[i] * 2);
    }
  // Always a little, so the pixel steps of the edge don't show as streaks.
  const soften = Math.max(e.soften * env.bw, 2 + S * 0.05);
  return blur(H, size, soften);
}

function bevel(px: Uint8ClampedArray, size: number, e: BevelEffect, env: EffectEnv): void {
  const alpha = alphaOf(px);
  const H = bevelHeight(alpha, size, e, env);
  const [lx, ly, lz] = light3d(env.light, e.lightHeight);
  // Half-way between the light and the viewer, for the shine.
  const hl = Math.hypot(lx, ly, lz + 1);
  const hx = lx / hl;
  const hy = ly / hl;
  const hz = (lz + 1) / hl;
  const shin = 8 + e.gloss * e.gloss * 120;
  const flatSpec = Math.pow(hz, shin);
  const [hr, hg, hb] = rgbOf(e.highlight);
  const [sr, sg, sb] = rgbOf(e.shadow);
  const at = (x: number, y: number) => H[Math.min(size - 1, Math.max(0, y)) * size + Math.min(size - 1, Math.max(0, x))];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (alpha[i] <= 0) continue;
      const gx = (at(x + 1, y) - at(x - 1, y)) / 2;
      const gy = (at(x, y + 1) - at(x, y - 1)) / 2;
      const nl = Math.hypot(gx, gy, 1);
      const nx = -gx / nl;
      const ny = -gy / nl;
      const nz = 1 / nl;
      const diffuse = nx * lx + ny * ly + nz * lz;
      const delta = diffuse - lz;
      const lit = delta > 0 ? clamp01(delta / Math.max(0.05, 1 - lz)) * e.highlightOpacity : 0;
      const dark = delta < 0 ? clamp01(-delta / Math.max(0.05, lz)) * e.shadowOpacity : 0;
      const s = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), shin);
      const shine = e.gloss > 0 ? clamp01((s - flatSpec) / (1 - flatSpec)) * e.gloss : 0;
      const p = i * 4;
      let r = px[p];
      let g = px[p + 1];
      let b = px[p + 2];
      if (dark) {
        r += (sr - r) * dark;
        g += (sg - g) * dark;
        b += (sb - b) * dark;
      }
      const k = clamp01(lit + shine);
      if (k) {
        r += (hr - r) * k;
        g += (hg - g) * k;
        b += (hb - b) * k;
      }
      px[p] = r;
      px[p + 1] = g;
      px[p + 2] = b;
    }
}

// ---------------------------------------------------------------- shadow and glow

/** Puts a coloured layer of coverage `cover` (0–1) behind the picture. */
function behind(px: Uint8ClampedArray, cover: Float32Array, rgb: [number, number, number]): void {
  for (let i = 0; i < cover.length; i++) {
    const g = cover[i];
    if (g <= 0) continue;
    const p = i * 4;
    const a = px[p + 3] / 255;
    const out = a + g * (1 - a);
    if (out <= 0) continue;
    const k = (g * (1 - a)) / out;
    px[p] += (rgb[0] - px[p]) * k;
    px[p + 1] += (rgb[1] - px[p + 1]) * k;
    px[p + 2] += (rgb[2] - px[p + 2]) * k;
    px[p + 3] = out * 255;
  }
}

/** Tints the painted pixels towards `rgb` by `amount` (0–1), keeping their alpha. */
function within(px: Uint8ClampedArray, amount: Float32Array, rgb: [number, number, number]): void {
  for (let i = 0; i < amount.length; i++) {
    const k = amount[i];
    if (k <= 0) continue;
    const p = i * 4;
    if (!px[p + 3]) continue;
    px[p] += (rgb[0] - px[p]) * k;
    px[p + 1] += (rgb[1] - px[p + 1]) * k;
    px[p + 2] += (rgb[2] - px[p + 2]) * k;
  }
}

/** `src` moved by (dx, dy) pixels; uncovered pixels get `edge`. */
function shifted(src: Float32Array, size: number, dx: number, dy: number, edge: number): Float32Array {
  const ox = Math.round(dx);
  const oy = Math.round(dy);
  if (!ox && !oy) return src;
  const out = new Float32Array(src.length);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const sx = x - ox;
      const sy = y - oy;
      out[y * size + x] = sx < 0 || sy < 0 || sx >= size || sy >= size ? edge : src[sy * size + sx];
    }
  return out;
}

function shadow(px: Uint8ClampedArray, size: number, e: ShadowEffect, env: EffectEnv): void {
  const alpha = alphaOf(px);
  const v = lightVector(env.light);
  // Away from the light.
  const dx = -v.x * e.distance * env.bw;
  const dy = -v.y * e.distance * env.bw;
  const rgb = rgbOf(e.color);
  if (!e.inner) {
    const cover = blur(shifted(alpha, size, dx, dy, 0), size, e.blur * env.bw);
    for (let i = 0; i < cover.length; i++) cover[i] *= e.opacity;
    behind(px, cover, rgb);
    return;
  }
  // Inside: the edge facing the light casts its shadow in.
  const outside = new Float32Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) outside[i] = 1 - alpha[i];
  const cover = blur(shifted(outside, size, dx, dy, 1), size, e.blur * env.bw, 1);
  for (let i = 0; i < cover.length; i++) cover[i] = clamp01(cover[i]) * e.opacity;
  within(px, cover, rgb);
}

/**
 * A glow fades with the distance from the edge (outside it, or inside it),
 * so thin runes glow as brightly as a whole band.
 */
function glow(px: Uint8ClampedArray, size: number, e: GlowEffect, env: EffectEnv): void {
  const alpha = alphaOf(px);
  const rgb = rgbOf(e.color);
  const r = Math.max(1, e.size * env.bw);
  const from = e.inner ? alpha : alpha.map((a) => 1 - a);
  // Painted pixels are all distance 0 from themselves (outer), so they are fully covered (and the glow is behind them).
  const dist = insideDistance(from, size, !e.inner);
  const cover = new Float32Array(alpha.length);
  for (let i = 0; i < cover.length; i++) {
    if (e.inner ? alpha[i] <= 0 : alpha[i] >= 1) continue;
    const t = 1 - clamp01(dist[i] / r);
    cover[i] = Math.pow(t, 1.6) * e.opacity;
  }
  // A little softening, so the glow has no hard rings.
  const soft = blur(cover, size, Math.min(r * 0.3, 6));
  if (e.inner) within(px, soft, rgb);
  else behind(px, soft, rgb);
}

// ---------------------------------------------------------------- colour

/** 256 colours, dark to light, from gradient stops (with each stop's opacity as how much it shows). */
export function gradientTable(stops: GradientStop[]): Float32Array {
  const sorted = [...stops].sort((a, b) => a.at - b.at);
  const table = new Float32Array(256 * 4);
  const rgbs = sorted.map((s) => rgbOf(s.color));
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = sorted.findIndex((s) => s.at >= t);
    if (k === -1) k = sorted.length - 1;
    const a = Math.max(0, k - 1);
    const span = sorted[k].at - sorted[a].at;
    const f = k === a || span <= 0 ? (t >= sorted[k].at ? 1 : 0) : clamp01((t - sorted[a].at) / span);
    const fromA = k === a ? 0 : 1 - f;
    for (let c = 0; c < 3; c++) table[i * 4 + c] = rgbs[a][c] * fromA + rgbs[k][c] * (1 - fromA);
    table[i * 4 + 3] = sorted[a].opacity * fromA + sorted[k].opacity * (1 - fromA);
  }
  return table;
}

function recolour(px: Uint8ClampedArray, e: RecolourEffect): void {
  const table = gradientTable(e.stops);
  for (let p = 0; p < px.length; p += 4) {
    if (!px[p + 3]) continue;
    const l = Math.round(0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2]);
    const t = l * 4;
    const k = e.amount * table[t + 3];
    px[p] += (table[t] - px[p]) * k;
    px[p + 1] += (table[t + 1] - px[p + 1]) * k;
    px[p + 2] += (table[t + 2] - px[p + 2]) * k;
  }
}

function adjust(px: Uint8ClampedArray, e: AdjustEffect): void {
  // The hue turn as a colour matrix (as CSS's hue-rotate), mixed with grey for the saturation.
  const a = (e.hue * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const m = [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
  const sat = 1 + e.saturation;
  const contrast = 1 + e.contrast;
  const bright = e.brightness * 128;
  for (let p = 0; p < px.length; p += 4) {
    if (!px[p + 3]) continue;
    let r = px[p];
    let g = px[p + 1];
    let b = px[p + 2];
    if (e.hue) {
      const r0 = r;
      const g0 = g;
      r = m[0] * r0 + m[1] * g0 + m[2] * b;
      g = m[3] * r0 + m[4] * g0 + m[5] * b;
      b = m[6] * r0 + m[7] * g0 + m[8] * b;
    }
    const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = (grey + (r - grey) * sat + bright - 128) * contrast + 128;
    g = (grey + (g - grey) * sat + bright - 128) * contrast + 128;
    b = (grey + (b - grey) * sat + bright - 128) * contrast + 128;
    px[p] = r;
    px[p + 1] = g;
    px[p + 2] = b;
  }
}

// ---------------------------------------------------------------- wear

function wear(px: Uint8ClampedArray, size: number, e: WearEffect, env: EffectEnv): void {
  const alpha = alphaOf(px);
  const dist = insideDistance(alpha, size);
  const cell = Math.max(2, e.scale * env.bw);
  const reach = cell * 0.8;
  const [gr, gg, gb] = rgbOf(e.grimeColor);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const p = i * 4;
      if (!px[p + 3]) continue;
      const u = x / cell;
      const v = y / cell;
      // 1 on the edge, 0 a little way in.
      const edge = 1 - clamp01(dist[i] / reach);
      if (e.chips > 0) {
        const bite = edge * (0.4 + 1.2 * fbm(u * 1.1, v * 1.1, e.seed + 11, 2)) - (1.3 - e.chips);
        if (bite > 0) px[p + 3] *= 1 - smooth(0, 0.08, bite);
      }
      let r = px[p];
      let g = px[p + 1];
      let b = px[p + 2];
      if (e.polish > 0) {
        const k = edge * edge * e.polish * 0.7 * (0.6 + 0.8 * fbm(u * 3, v * 3, e.seed + 23, 2));
        r += (255 - r) * k * 0.6;
        g += (255 - g) * k * 0.6;
        b += (255 - b) * k * 0.6;
      }
      if (e.grime > 0) {
        const n = fbm(u * 0.9, v * 0.9, e.seed + 37);
        const k = smooth(0.62 - e.grime * 0.3, 0.85, n) * (1 - edge * 0.6) * e.grime * 0.9;
        r += (gr - r) * k;
        g += (gg - g) * k;
        b += (gb - b) * k;
      }
      px[p] = r;
      px[p + 1] = g;
      px[p + 2] = b;
    }
}
