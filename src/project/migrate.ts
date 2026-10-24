// Reading saved projects (files, autosave, the data view). Old versions are
// migrated one step at a time, then every field is checked: a bad value falls
// back to its default with a warning, and a layer this version can't read is
// kept as an "unsupported" layer rather than silently dropped.

import { FRAME_STYLES, SHAPES } from '../engine/legacy/catalog';
import { isValidHex } from '../engine/legacy/color';
import { DEFAULT_STAGE, NEW_LAYER, newId } from './defaults';
import {
  BLEND_MODES,
  ELEMENT_KINDS,
  PROJECT_FORMAT,
  SCHEMA_VERSION,
  type FrameProject,
  type GradientStop,
  type Layer,
  type Paint,
  type StageSettings,
} from './types';

export type ParseResult = { ok: true; project: FrameProject; warnings: string[] } | { ok: false; error: string };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Migrations from version n to n + 1, keyed by n. None yet: version 1 is the first. */
const MIGRATIONS: Record<number, (p: Obj) => Obj> = {};

export function parseProject(input: unknown): ParseResult {
  let raw = input;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input);
    } catch {
      return { ok: false, error: "This isn't a Frame Studio project file (it isn't valid JSON)." };
    }
  }
  if (!isObj(raw) || raw.format !== PROJECT_FORMAT) {
    return { ok: false, error: "This isn't a Frame Studio project file." };
  }
  let version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  if (version > SCHEMA_VERSION) {
    return { ok: false, error: `This project was made with a newer Frame Studio (format ${version}); this one reads up to ${SCHEMA_VERSION}.` };
  }
  if (version < 1) return { ok: false, error: 'This project file has no valid format version.' };
  let p: Obj = raw;
  while (version < SCHEMA_VERSION) {
    p = MIGRATIONS[version](p);
    version++;
  }
  const warnings: string[] = [];
  const ids = new Set<string>();
  const layers = (Array.isArray(p.layers) ? p.layers : []).map((l, i) => {
    const layer = checkLayer(l, i, warnings);
    // Ids must be unique; a clash (e.g. a hand-edited file) gets a fresh one.
    if (ids.has(layer.id)) layer.id = newId();
    ids.add(layer.id);
    return layer;
  });
  if (!Array.isArray(p.layers)) warnings.push('The project had no layer list; it starts empty.');
  return {
    ok: true,
    warnings,
    project: {
      format: PROJECT_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      name: typeof p.name === 'string' && p.name.trim() ? p.name : 'Untitled frame',
      stage: checkStage(p.stage),
      layers,
    },
  };
}

function checkStage(s: unknown): StageSettings {
  const o = isObj(s) ? s : {};
  return {
    shape: SHAPES.some((x) => x.id === o.shape) ? (o.shape as StageSettings['shape']) : DEFAULT_STAGE.shape,
    thickness: num(o.thickness, DEFAULT_STAGE.thickness, 0.01, 0.6),
    outerSpacing: num(o.outerSpacing, DEFAULT_STAGE.outerSpacing, 0, 0.5),
    showArt: typeof o.showArt === 'boolean' ? o.showArt : DEFAULT_STAGE.showArt,
    backingColor: hex(o.backingColor, DEFAULT_STAGE.backingColor),
  };
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}
const hex = (v: unknown, fallback: string) => (typeof v === 'string' && isValidHex(v) ? v.toLowerCase() : fallback);
const hexOrNull = (v: unknown, fallback: string | null) => (v === null ? null : typeof v === 'string' && isValidHex(v) ? v.toLowerCase() : fallback);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => (options.includes(v as T) ? (v as T) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

function checkStops(v: unknown, fallback: GradientStop[]): GradientStop[] {
  if (!Array.isArray(v)) return fallback;
  const stops = v.filter(isObj).map((s) => ({ at: num(s.at, 0, 0, 1), color: hex(s.color, '#ffffff') }));
  return stops.length >= 2 ? stops.slice(0, 16).sort((a, b) => a.at - b.at) : fallback;
}

function checkPaint(v: unknown, fallback: Paint): Paint {
  const o = isObj(v) ? v : {};
  const fbColor = 'color' in fallback ? fallback.color : '#ffffff';
  const fbStops = 'stops' in fallback ? fallback.stops : [{ at: 0, color: '#ffffff' }, { at: 1, color: '#000000' }];
  switch (o.kind) {
    case 'solid':
      return { kind: 'solid', color: hex(o.color, fbColor) };
    case 'lit':
      return { kind: 'lit', color: hex(o.color, fbColor), light: num(o.light, 0.85, 0, 1), dark: num(o.dark, 0.8, 0, 1), pressed: bool(o.pressed, false) };
    case 'linear':
      return { kind: 'linear', angle: num(o.angle, 45, -360, 360), stops: checkStops(o.stops, fbStops) };
    case 'acrossBand':
      return { kind: 'acrossBand', stops: checkStops(o.stops, fbStops) };
    default:
      return fallback;
  }
}

function checkLayer(l: unknown, index: number, warnings: string[]): Layer {
  const o = isObj(l) ? l : {};
  const type = typeof o.type === 'string' ? o.type : '(none)';
  const common = {
    id: typeof o.id === 'string' && o.id ? o.id : newId(),
    name: typeof o.name === 'string' ? o.name : `Layer ${index + 1}`,
    visible: bool(o.visible, true),
    locked: bool(o.locked, false),
    opacity: num(o.opacity, 1, 0, 1),
    blend: oneOf(o.blend, BLEND_MODES, 'source-over'),
  };
  if (!(type in NEW_LAYER)) {
    warnings.push(`Layer "${common.name}" is a kind this version can't draw (${type}); it is kept but hidden from the picture.`);
    const { id: _id, name: _n, visible: _v, locked: _l, opacity: _o, blend: _b, ...data } = o;
    return { ...common, type: 'unsupported', originalType: type, data, reason: `Unknown layer kind "${type}".` };
  }
  switch (type) {
    case 'legacyFrame': {
      const d = NEW_LAYER.legacyFrame();
      if (d.type !== 'legacyFrame') throw new Error('unreachable');
      if (typeof o.style === 'string' && !FRAME_STYLES.has(o.style)) warnings.push(`Layer "${common.name}" used an unknown frame style; it is now Stamped.`);
      return {
        ...common,
        type,
        presetId: typeof o.presetId === 'string' ? o.presetId : d.presetId,
        style: typeof o.style === 'string' && FRAME_STYLES.has(o.style) ? (o.style as typeof d.style) : d.style,
        color: hex(o.color, d.color),
        accent: hexOrNull(o.accent, null),
      };
    }
    case 'bandFill': {
      const d = NEW_LAYER.bandFill();
      if (d.type !== 'bandFill') throw new Error('unreachable');
      return { ...common, type, from: num(o.from, d.from, -0.5, 1.5), to: num(o.to, d.to, -0.5, 1.5), paint: checkPaint(o.paint, d.paint) };
    }
    case 'line': {
      const d = NEW_LAYER.line();
      if (d.type !== 'line') throw new Error('unreachable');
      return {
        ...common,
        type,
        at: num(o.at, d.at, -0.5, 1.5),
        width: num(o.width, d.width, 0.001, 2),
        paint: checkPaint(o.paint, d.paint),
        dash: oneOf(o.dash, ['solid', 'dashed', 'dotted'] as const, 'solid'),
        glow: hexOrNull(o.glow, null),
      };
    }
    default: {
      const d = NEW_LAYER.repeat();
      if (d.type !== 'repeat') throw new Error('unreachable');
      return {
        ...common,
        type: 'repeat',
        element: oneOf(o.element, ELEMENT_KINDS, d.element),
        mode: oneOf(o.mode, ['count', 'spacing'] as const, d.mode),
        count: Math.round(num(o.count, d.count, 1, 400)),
        spacing: num(o.spacing, d.spacing, 0.05, 20),
        snapToCorners: bool(o.snapToCorners, d.snapToCorners),
        at: num(o.at, d.at, -0.5, 1.5),
        size: num(o.size, d.size, 0.01, 3),
        stretch: num(o.stretch, d.stretch, 0.1, 5),
        rotation: num(o.rotation, d.rotation, -360, 360),
        offset: num(o.offset, d.offset, 0, 1),
        fill: hex(o.fill, d.fill),
        outline: hexOrNull(o.outline, d.outline),
        outlineWidth: num(o.outlineWidth, d.outlineWidth, 0, 0.5),
        raised: bool(o.raised, d.raised),
        glow: hexOrNull(o.glow, d.glow),
        accentEvery: Math.round(num(o.accentEvery, d.accentEvery, 0, 100)),
        accentScale: num(o.accentScale, d.accentScale, 0.1, 5),
        accentColor: hexOrNull(o.accentColor, d.accentColor),
        seed: Math.round(num(o.seed, d.seed, 0, 1e9)),
      };
    }
  }
}

/** The text of a project file. Unsupported layers are written back as they came. */
export function serializeProject(project: FrameProject): string {
  const layers = project.layers.map((l) => {
    if (l.type !== 'unsupported') return l;
    const { originalType, data, reason: _r, type: _t, ...common } = l;
    return { ...data, ...common, type: originalType };
  });
  return JSON.stringify({ ...project, layers }, null, 2) + '\n';
}
