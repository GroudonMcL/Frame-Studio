// The Frame Studio project format (DESIGN.md §4). Everything about a design
// is in this one JSON object; the renderer reads it and nothing else. It is
// kept apart from the interface and the renderer so each can change alone.
//
// Positions and sizes are measured against the frame band, so one design fits
// every token shape and thickness (DESIGN.md §4.2):
//   - "across" positions: 0 = the band's outer edge, 1 = its inner edge
//     (values a little outside 0–1 reach past the band);
//   - sizes: fractions of the band's width;
//   - "along" positions: fractions of the way round, clockwise from the top.

import type { FrameStyle, ShapeId } from '../engine/legacy/catalog';

export const PROJECT_FORMAT = 'frame-studio-project';
export const SCHEMA_VERSION = 1;

export interface FrameProject {
  format: typeof PROJECT_FORMAT;
  /** Bump and add a migration in migrate.ts whenever the shape of this changes. */
  schemaVersion: number;
  name: string;
  /** How the design is previewed and exported. Not part of the look itself. */
  stage: StageSettings;
  /** Bottom first: later layers are drawn on top. */
  layers: Layer[];
}

export interface StageSettings {
  shape: ShapeId;
  /** Band thickness as a fraction of the token's half-size (token-maker's 0.14 on a Medium token). */
  thickness: number;
  /** Gap between the token's edge and the band, same unit. */
  outerSpacing: number;
  /** Show the sample picture and backing inside the frame. */
  showArt: boolean;
  backingColor: string;
}

/** Blend modes offered in Advanced (all work in Canvas 2D everywhere). */
export const BLEND_MODES = ['source-over', 'multiply', 'screen', 'overlay', 'soft-light', 'lighter', 'color'] as const;
export type BlendMode = (typeof BLEND_MODES)[number];

interface LayerBase {
  /** Stable for the life of the layer; never reused. */
  id: string;
  name: string;
  visible: boolean;
  /** Locked layers can't be picked on the canvas or edited. */
  locked: boolean;
  /** 0–1 */
  opacity: number;
  blend: BlendMode;
}

/**
 * One of token-maker's 27 frames, drawn by its own code. It is one composite
 * layer: only the settings token-maker has (colour, highlights colour) can be
 * edited. Phase 4 breaks frames into editable layers one by one.
 */
export interface LegacyFrameLayer extends LayerBase {
  type: 'legacyFrame';
  /** token-maker's frame preset id (e.g. 'infernal'), for its name and default colour. */
  presetId: string;
  style: FrameStyle;
  color: string;
  /** "Frame highlights colour" for frames with own-coloured details; null = the frame's default. */
  accent: string | null;
}

export interface GradientStop {
  /** 0–1 */
  at: number;
  color: string;
}

/** How an area or line is coloured. */
export type Paint =
  | { kind: 'solid'; color: string }
  /** token-maker's metal lighting: lit from the top left, shaded bottom right. `pressed` lights it the other way, like a stamped-in step. */
  | { kind: 'lit'; color: string; light: number; dark: number; pressed: boolean }
  /** Across the whole token at `angle` degrees (0 = left to right). */
  | { kind: 'linear'; angle: number; stops: GradientStop[] }
  /** Across the band, from its outer edge (0) to its inner edge (1). */
  | { kind: 'acrossBand'; stops: GradientStop[] };

/** Fills part of the band, between two "across" positions. */
export interface BandFillLayer extends LayerBase {
  type: 'bandFill';
  from: number;
  to: number;
  paint: Paint;
}

/** A line running round the band. */
export interface LineLayer extends LayerBase {
  type: 'line';
  /** Across position of its centre. */
  at: number;
  /** Fraction of the band's width. */
  width: number;
  paint: Paint;
  dash: 'solid' | 'dashed' | 'dotted';
  /** A soft glow of this colour round the line, or null. */
  glow: string | null;
}

export const ELEMENT_KINDS = ['bead', 'circle', 'diamond', 'square', 'triangle', 'star', 'cross', 'rune', 'leaf', 'spike'] as const;
export type ElementKind = (typeof ELEMENT_KINDS)[number];

/** One shape repeated evenly round the band: beads, studs, runes, gems… */
export interface RepeatLayer extends LayerBase {
  type: 'repeat';
  element: ElementKind;
  /** 'count': exactly `count`; 'spacing': as many as fit with `spacing` (band widths) between centres. */
  mode: 'count' | 'spacing';
  count: number;
  spacing: number;
  /** Round the count so the shape's corners get one each (squares 4, hexagons 6). */
  snapToCorners: boolean;
  /** Across position of the centres. */
  at: number;
  /** Height as a fraction of the band's width. */
  size: number;
  /** Width relative to height. */
  stretch: number;
  /** Degrees, on top of facing along the band. */
  rotation: number;
  /** Fraction of one gap to slide every element along the band (0–1). */
  offset: number;
  fill: string;
  outline: string | null;
  /** Fraction of the element's size. */
  outlineWidth: number;
  /** Small drop shadow, like token-maker's raised ornaments. */
  raised: boolean;
  glow: string | null;
  /** Every `every`-th element is drawn at `scale` (e.g. a big bead every 9th). 0 = off. */
  accentEvery: number;
  accentScale: number;
  accentColor: string | null;
  /** Varies which rune each element is. */
  seed: number;
}

/**
 * A layer from a newer version of Frame Studio, or one this version can't
 * read. It is kept exactly as it was (and saved again) but not drawn.
 */
export interface UnsupportedLayer extends LayerBase {
  type: 'unsupported';
  originalType: string;
  data: Record<string, unknown>;
  reason: string;
}

export type Layer = LegacyFrameLayer | BandFillLayer | LineLayer | RepeatLayer | UnsupportedLayer;
export type LayerType = Layer['type'];
/** The types a user can add. */
export type EditableLayerType = Exclude<LayerType, 'unsupported'>;
