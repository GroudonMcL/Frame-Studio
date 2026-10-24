// Starting values for projects and layers. Every layer type has predictable
// defaults, so a new layer always looks sensible straight away.

import { FRAME_PRESETS, framePresetById } from '../engine/legacy/catalog';
import { frameAccent } from '../engine/legacy/frames';
import {
  PROJECT_FORMAT,
  SCHEMA_VERSION,
  DEFAULT_LIGHT,
  type BandFillLayer,
  type EditableLayerType,
  type FrameProject,
  type GroupLayer,
  type LegacyFrameLayer,
  type Layer,
  type LineLayer,
  type PathLayer,
  type PathPoint,
  type Placement,
  type PlacedStyle,
  type RepeatLayer,
  type ShapeLayer,
  type StageSettings,
  type TextureKind,
  type TextureLayer,
} from './types';

export const DEFAULT_STAGE: StageSettings = {
  shape: 'circle',
  // token-maker's default frame on a Medium token.
  thickness: 0.14,
  outerSpacing: 0.1,
  showArt: true,
  backingColor: '#1d1f27',
  light: DEFAULT_LIGHT,
};

let counter = 0;
/** A new layer id, unique within this browser session and across saved files. */
export function newId(): string {
  counter = (counter + 1) % 0x10000;
  return `L${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 0x10000).toString(36)}`;
}

const base = (name: string) => ({ id: newId(), name, visible: true, locked: false, opacity: 1, blend: 'source-over' as const, clip: 'none' as const });

export function legacyFrameLayer(presetId: string): LegacyFrameLayer {
  const preset = framePresetById(presetId) ?? FRAME_PRESETS[0];
  return { ...base(preset.name), type: 'legacyFrame', presetId: preset.id, style: preset.style, color: preset.color, accent: null };
}

export function bandFillLayer(): BandFillLayer {
  return { ...base('Band fill'), type: 'bandFill', from: 0, to: 1, paint: { kind: 'lit', color: '#c9a24a', light: 0.85, dark: 0.8, pressed: false, highlight: null } };
}

export function lineLayer(): LineLayer {
  return { ...base('Line'), type: 'line', at: 0.5, width: 0.06, paint: { kind: 'solid', color: '#2a1a0a' }, dash: 'solid', glow: null, waveAmplitude: 0, waves: 12, wavePhase: 0, waveLength: 0, waveShape: 'sine', raised: false };
}

export function repeatLayer(): RepeatLayer {
  return {
    ...base('Repeated shapes'),
    type: 'repeat',
    element: 'bead',
    mode: 'count',
    count: 12,
    spacing: 1,
    snapToCorners: true,
    at: 0.5,
    size: 0.3,
    stretch: 1,
    rotation: 0,
    offset: 0,
    fill: '#e0c070',
    outline: null,
    outlineWidth: 0.08,
    raised: true,
    glow: null,
    accentEvery: 0,
    accentScale: 1.6,
    accentColor: null,
    seed: 1,
    altColors: [],
    altSizes: [],
    skipAroundAccent: 0,
    alternateSides: 0,
    shaded: true,
    show: [],
    detail: null,
    multipleOf: 1,
    wander: 0,
    sizeVariation: 0,
    rotationVariation: 0,
  };
}

/** A texture over the whole band, as Token Maker draws it. */
export function textureLayer(kind: TextureKind = 'marble'): TextureLayer {
  const preset = TEXTURES.find((t) => t.layer.kind === kind)?.layer ?? {};
  return { ...base('Texture'), type: 'texture', kind, from: 0, to: 1, color: '#c9a24a', color2: null, amount: 1, scale: 1, strength: 1, where: 'everywhere', seed: 1, ...preset };
}

export interface TexturePreset {
  id: string;
  name: string;
  description: string;
  /** The texture's settings (a new layer gets the rest from textureLayer). */
  layer: Partial<TextureLayer> & { kind: TextureKind };
  /** A band colour that suits it, used under it in the library and when it is added with a band. */
  band: string;
}

/**
 * The texture library (Add layer → Texture…). The first preset of each kind
 * is that kind's default. Seeds and colours are Token Maker's where a frame
 * uses the texture, so they look as they do there (variations go up to 99999).
 */
export const TEXTURES: TexturePreset[] = [
  { id: 'marble', name: 'Marble', description: 'Soft marbling and flecks on the shaded side, like Stamped and Gilded.', layer: { kind: 'marble', name: 'Marble', color: '#b98a3c', where: 'shaded', seed: 0x5eed }, band: '#b98a3c' },
  { id: 'dark-marble', name: 'Heavy marble', description: 'Marbling all the way round, like Warlock and Arcane.', layer: { kind: 'marble', name: 'Heavy marble', color: '#5a4a6a', amount: 1.4, strength: 1.4, where: 'everywhere', seed: 0xe7e }, band: '#4a3a5a' },
  { id: 'hammered', name: 'Hammered metal', description: 'Dents with a bright fleck on their lit side, like Fighter.', layer: { kind: 'hammered', name: 'Hammered metal', color: '#8a8f99', amount: 0.6, seed: 0x2e3d }, band: '#8a8f99' },
  { id: 'hide', name: 'Hide', description: 'Fine pitting, like Barbarian and Rogue leather.', layer: { kind: 'hammered', name: 'Hide', color: '#6e4a2c', amount: 1.5, scale: 0.45, strength: 0.8, seed: 0x5717 }, band: '#6e4a2c' },
  { id: 'wear', name: 'Battle wear', description: 'Dents and bright scratches, like Fighter and Barbarian.', layer: { kind: 'wear', name: 'Battle wear', color: '#8a8f99', seed: 0xf16 }, band: '#8a8f99' },
  { id: 'wood', name: 'Wood grain', description: 'Wavy grain and knots, like Oak and Druid.', layer: { kind: 'wood', name: 'Wood grain', color: '#7a5230', seed: 0x0a4 }, band: '#7a5230' },
  { id: 'stone', name: 'Stone blocks', description: 'Blocks of varied tone with mortar and pitting, like Cobblestone.', layer: { kind: 'stone', name: 'Stone blocks', color: '#7d7a72', seed: 0x570e }, band: '#7d7a72' },
  { id: 'stars', name: 'Starfield', description: 'Haze and scattered stars, like Starfield.', layer: { kind: 'scatter', name: 'Stars', color: '#ffffff', color2: '#6a5acd', seed: 0x57a2 }, band: '#1a1c3a' },
  { id: 'rope', name: 'Rope', description: 'Twisted strands, like Monk’s cord.', layer: { kind: 'rope', name: 'Rope', color: '#a07a48', seed: 0xbead }, band: '#a07a48' },
  { id: 'scales', name: 'Dragon scales', description: 'Overlapping scales in staggered rows, like Sorcerer.', layer: { kind: 'scales', name: 'Scales', color: '#3f8a5a' }, band: '#3f8a5a' },
  { id: 'cracks', name: 'Magma cracks', description: 'Glowing wandering cracks, like Magma.', layer: { kind: 'cracks', name: 'Magma cracks', color: '#ff5a1a', seed: 0x1a7a }, band: '#2a1e1c' },
  { id: 'veins', name: 'Veined marble', description: 'Stamped’s veins, flecks and marbling, kept to the shaded side.', layer: { kind: 'veins', name: 'Veined marble', color: '#d7671f', where: 'shaded', seed: 0x5eed }, band: '#b5561a' },
  { id: 'brushed', name: 'Brushed metal', description: 'Fine streaks running round the band, like brushed steel.', layer: { kind: 'brushed', name: 'Brushed metal', color: '#9aa0aa', seed: 0xb705 }, band: '#9aa0aa' },
  { id: 'woven', name: 'Basket weave', description: 'Strands woven over and under, like wicker or cloth.', layer: { kind: 'woven', name: 'Basket weave', color: '#c49a5a', seed: 1 }, band: '#7a5a30' },
  { id: 'chainmail', name: 'Chainmail', description: 'Rows of interlinked steel rings.', layer: { kind: 'chainmail', name: 'Chainmail', color: '#a8aeb8', seed: 1 }, band: '#2e3138' },
  { id: 'rust', name: 'Rust', description: 'Patches of rust with pits and specks, on old iron.', layer: { kind: 'rust', name: 'Rust', color: '#8a3b12', seed: 0x2057 }, band: '#5e5a56' },
  { id: 'frost', name: 'Frost', description: 'A cold haze and ice crystals growing in from both edges.', layer: { kind: 'frost', name: 'Frost', color: '#e6f6ff', seed: 0xf205 }, band: '#5a7a9a' },
  { id: 'bark', name: 'Bark', description: 'Deep rough fissures, like an old tree.', layer: { kind: 'bark', name: 'Bark', color: '#6a4a2c', seed: 0xba2c }, band: '#6a4a2c' },
  { id: 'sparkle', name: 'Sparkles', description: 'Twinkling four-pointed sparkles and glints.', layer: { kind: 'sparkle', name: 'Sparkles', color: '#fff6d0', seed: 0x5a2c }, band: '#2a2450' },
  { id: 'gold-sparkle', name: 'Gold dust', description: 'Sparkles on gold, for a fey or royal shimmer.', layer: { kind: 'sparkle', name: 'Gold dust', color: '#fffbe6', amount: 1.6, scale: 0.7, seed: 0x901d }, band: '#c9a24a' },
  { id: 'crackle', name: 'Crackle glaze', description: 'A web of fine cracks, like old porcelain or dried mud.', layer: { kind: 'crackle', name: 'Crackle glaze', color: '#d8cfb8', seed: 0xc4ac }, band: '#d8cfb8' },
  { id: 'knurl', name: 'Knurled grip', description: 'Crossing diagonal grooves, like the grip of a tool.', layer: { kind: 'knurl', name: 'Knurled grip', color: '#8a8f99', seed: 1 }, band: '#8a8f99' },
];

/** A texture layer from the library. */
export function textureFromPreset(preset: TexturePreset): TextureLayer {
  return { ...textureLayer(preset.layer.kind), ...preset.layer };
}

/** The band a library texture sits on in its picture, and under it when it is added with a band. */
export function textureBand(preset: TexturePreset): BandFillLayer {
  return { ...bandFillLayer(), name: `${preset.name} band`, paint: { kind: 'lit', color: preset.band, light: 0.75, dark: 0.8, pressed: false, highlight: null } };
}

/** A new shape or path sits at the top of the band, upright, one band width tall. */
export const DEFAULT_PLACEMENT: Placement = { place: 'band', along: 0, across: 0.5, x: 0, y: -0.8, size: 0.8, stretch: 1, rotation: 0, mirror: 'none' };
const DEFAULT_STYLE: PlacedStyle = { fill: '#5fa8d3', shaded: true, outline: '#1a1008', outlineWidth: 0.06, raised: true, glow: null };

export function shapeLayer(): ShapeLayer {
  return { ...base('Shape'), type: 'shape', ...DEFAULT_PLACEMENT, ...DEFAULT_STYLE, shape: 'polygon', sides: 6, innerRatio: 0.45, corner: 0, element: 'heart', detail: null };
}

/** A new path has no points: it is drawn by clicking on the canvas. */
export function pathLayer(points: PathPoint[] = []): PathLayer {
  return { ...base('Path'), type: 'path', ...DEFAULT_PLACEMENT, ...DEFAULT_STYLE, size: 1, points, closed: points.length > 2 };
}

export function groupLayer(children: Layer[] = []): GroupLayer {
  return { ...base('Group'), type: 'group', children, collapsed: false };
}

/** A cut gem, pointing outwards: a ready-made path. */
export const GEM_POINTS: PathPoint[] = [
  { x: -0.5, y: -0.8, handle: null },
  { x: 0.5, y: -0.8, handle: null },
  { x: 0.9, y: -0.3, handle: null },
  { x: 0, y: 1, handle: null },
  { x: -0.9, y: -0.3, handle: null },
];

export const NEW_LAYER: Record<EditableLayerType, () => Layer> = {
  legacyFrame: () => legacyFrameLayer('stamped'),
  bandFill: bandFillLayer,
  line: lineLayer,
  repeat: repeatLayer,
  texture: () => textureLayer(),
  shape: shapeLayer,
  path: () => pathLayer(),
  group: () => groupLayer(),
};

/** What each layer type is called in the interface. */
export const LAYER_TYPE_NAMES: Record<Layer['type'], string> = {
  legacyFrame: 'Token Maker frame',
  bandFill: 'Band fill',
  line: 'Line',
  repeat: 'Repeated shapes',
  texture: 'Texture',
  shape: 'Shape',
  path: 'Path',
  group: 'Group',
  unsupported: 'Unsupported layer',
};

export function createProject(layers: Layer[] = [], name = 'Untitled frame'): FrameProject {
  return { format: PROJECT_FORMAT, schemaVersion: SCHEMA_VERSION, name, stage: { ...DEFAULT_STAGE }, layers };
}

/** A project holding one token-maker frame, as a starting point. */
export function projectFromFrame(presetId: string): FrameProject {
  const layer = legacyFrameLayer(presetId);
  return createProject([layer], layer.name);
}

/** The default highlights colour of a frame, if it has own-coloured details. */
export const defaultAccent = (layer: LegacyFrameLayer) => frameAccent(layer.style);

export interface LayeredTemplate {
  id: string;
  name: string;
  description: string;
  make: () => Layer[];
}

/**
 * Designs built only from editable layers. They show what the layer types
 * can do; they are new designs, not conversions of token-maker frames.
 */
export const LAYERED_TEMPLATES: LayeredTemplate[] = [
  {
    id: 'brass-beads',
    name: 'Brass & beads',
    description: 'A lit brass band, a pressed-in step, two rims and a ring of beads.',
    make: () => [
      { ...bandFillLayer(), name: 'Brass band', paint: { kind: 'lit', color: '#b88635', light: 0.9, dark: 0.8, pressed: false, highlight: null } },
      { ...bandFillLayer(), name: 'Pressed-in step', from: 0.6, to: 1, paint: { kind: 'lit', color: '#6e4a1c', light: 0.6, dark: 0.5, pressed: true, highlight: null } },
      { ...lineLayer(), name: 'Outer rim', at: 0.02, width: 0.04, paint: { kind: 'linear', angle: 45, stops: [{ at: 0, color: '#fff6e0', opacity: 1 }, { at: 0.5, color: '#b88635', opacity: 1 }, { at: 1, color: '#2a1a08', opacity: 1 }], followLight: false } },
      { ...lineLayer(), name: 'Inner rim', at: 0.99, width: 0.03, paint: { kind: 'solid', color: '#1a0e04' } },
      { ...repeatLayer(), name: 'Beads', at: 0.6, size: 0.16, count: 24, fill: '#d9b060' },
    ],
  },
  {
    id: 'glowing-runes',
    name: 'Glowing runes',
    description: 'A dark stone band with a glowing line and runes all the way round.',
    make: () => [
      { ...bandFillLayer(), name: 'Dark stone', paint: { kind: 'lit', color: '#2a2c36', light: 0.45, dark: 0.7, pressed: false, highlight: null } },
      { ...lineLayer(), name: 'Glow line', at: 0.7, width: 0.035, paint: { kind: 'solid', color: '#a8e4ff' }, glow: '#6fc3ff' },
      {
        ...repeatLayer(),
        name: 'Runes',
        element: 'rune',
        mode: 'spacing',
        spacing: 0.55,
        snapToCorners: false,
        at: 0.36,
        size: 0.34,
        stretch: 0.7,
        fill: '#a8e4ff',
        raised: false,
        glow: '#6fc3ff',
      },
      { ...lineLayer(), name: 'Outer rim', at: 0.02, width: 0.04, paint: { kind: 'solid', color: '#6a6f7c' } },
    ],
  },
  {
    id: 'jewelled',
    name: 'Jewelled',
    description: 'Silver with a vine, alternating diamonds and a pair of drawn gems, grouped.',
    make: () => [
      { ...bandFillLayer(), name: 'Silver band', paint: { kind: 'lit', color: '#9aa3ad', light: 0.9, dark: 0.75, pressed: false, highlight: null } },
      { ...lineLayer(), name: 'Vine', at: 0.5, width: 0.05, paint: { kind: 'solid', color: '#2f5d36' }, waveAmplitude: 0.18, waves: 16 },
      { ...lineLayer(), name: 'Outer rim', at: 0.02, width: 0.04, paint: { kind: 'solid', color: '#e8ecf0' } },
      { ...lineLayer(), name: 'Inner rim', at: 0.98, width: 0.04, paint: { kind: 'solid', color: '#2a2e36' } },
      {
        ...groupLayer([
          { ...repeatLayer(), name: 'Diamonds', element: 'diamond', count: 24, size: 0.32, stretch: 0.7, fill: '#d94a4a', altColors: ['#3a7bd5'], altSizes: [1, 0.7] },
          {
            ...pathLayer(GEM_POINTS),
            name: 'Gems',
            along: 0.25,
            size: 1.2,
            fill: '#3fbf7f',
            mirror: 'leftRight',
          },
        ]),
        name: 'Jewels',
      },
    ],
  },
  {
    id: 'battle-steel',
    name: 'Battle-worn steel',
    description: 'Hammered steel with dents and scratches, a pressed-in step and a ring of rivets.',
    make: () => [
      { ...bandFillLayer(), name: 'Steel band', paint: { kind: 'lit', color: '#8a8f99', light: 0.75, dark: 0.8, pressed: false, highlight: null } },
      { ...bandFillLayer(), name: 'Pressed-in step', from: 0.65, to: 1, paint: { kind: 'lit', color: '#8a8f99', light: 0.75, dark: 0.8, pressed: true, highlight: null } },
      { ...textureLayer('hammered'), name: 'Hammered', color: '#8a8f99', amount: 0.6, seed: 0x2e3d },
      { ...textureLayer('wear'), name: 'Battle wear', color: '#8a8f99' },
      { ...lineLayer(), name: 'Outer rim', at: 0.02, width: 0.04, paint: { kind: 'solid', color: '#e8ecf0' } },
      { ...lineLayer(), name: 'Inner rim', at: 0.99, width: 0.03, paint: { kind: 'solid', color: '#14161a' } },
      { ...repeatLayer(), name: 'Rivets', at: 0.33, size: 0.3, fill: '#9aa0aa' },
    ],
  },
  {
    id: 'night-sky',
    name: 'Night sky',
    description: 'Colours round the ring from dusk to midnight, with stars, haze and a glowing line.',
    make: () => [
      {
        ...bandFillLayer(),
        name: 'Sky',
        paint: {
          kind: 'ring',
          stops: [
            { angle: 0, color: '#1a1a4a' },
            { angle: 90, color: '#0b0d1e' },
            { angle: 180, color: '#3a2a6a' },
            { angle: 225, color: '#6a4a9a' },
            { angle: 270, color: '#3a2a6a' },
          ],
          followLight: true,
        },
      },
      { ...textureLayer('scatter'), name: 'Stars', color: '#ffffff', color2: '#6a5acd', amount: 1.3 },
      { ...lineLayer(), name: 'Glow line', at: 0.75, width: 0.03, paint: { kind: 'solid', color: '#cfc4ff' }, glow: '#8a7aff' },
      { ...lineLayer(), name: 'Outer rim', at: 0.02, width: 0.04, paint: { kind: 'solid', color: '#b8b0e0' } },
    ],
  },
  {
    id: 'moon-stars',
    name: 'Moon & stars',
    description: 'Midnight blue with sparkles, crescent moons and stars in turn, and a scalloped silver edge.',
    make: () => [
      { ...bandFillLayer(), name: 'Midnight', paint: { kind: 'lit', color: '#1f2a5a', light: 0.6, dark: 0.75, pressed: false, highlight: '#5a6ab0' } },
      { ...textureLayer('sparkle'), name: 'Sparkles', color: '#fff6d0', seed: 0x5a2c, amount: 0.8, scale: 0.8 },
      { ...lineLayer(), name: 'Scalloped edge', at: 0.08, width: 0.04, paint: { kind: 'solid', color: '#d8dcf0' }, waveAmplitude: 0.06, waveLength: 0.45, waveShape: 'scallop' },
      { ...repeatLayer(), name: 'Moons', element: 'crescent', count: 8, at: 0.55, size: 0.5, fill: '#f4e7a8', glow: '#fff2b0', show: [true, false] },
      { ...repeatLayer(), name: 'Stars', element: 'star', count: 8, at: 0.55, size: 0.36, fill: '#f4e7a8', glow: '#fff2b0', show: [false, true] },
      { ...lineLayer(), name: 'Inner rim', at: 0.985, width: 0.03, paint: { kind: 'solid', color: '#0a0e24' } },
    ],
  },
  {
    id: 'frostbound',
    name: 'Frostbound',
    description: 'Icy steel with frost, snowflakes and a zigzag line.',
    make: () => [
      { ...bandFillLayer(), name: 'Ice', paint: { kind: 'lit', color: '#6f93b8', light: 0.9, dark: 0.7, pressed: false, highlight: '#f0faff' } },
      { ...textureLayer('frost'), name: 'Frost', color: '#e6f6ff', seed: 0xf205 },
      { ...lineLayer(), name: 'Zigzag', at: 0.5, width: 0.035, paint: { kind: 'solid', color: '#dff4ff' }, waveAmplitude: 0.3, waveLength: 0.5, waveShape: 'zigzag', glow: '#9fd8ff' },
      { ...repeatLayer(), name: 'Snowflakes', element: 'snowflake', count: 6, at: 0.5, size: 0.62, fill: '#ffffff', outlineWidth: 0.07, raised: false, glow: '#9fd8ff' },
      { ...lineLayer(), name: 'Outer rim', at: 0.02, width: 0.04, paint: { kind: 'solid', color: '#f0faff' } },
      { ...lineLayer(), name: 'Inner rim', at: 0.985, width: 0.03, paint: { kind: 'solid', color: '#1a2a3a' } },
    ],
  },
  {
    id: 'celtic',
    name: 'Celtic knots',
    description: 'Green and gold, with knots, a woven cord and battlement edges.',
    make: () => [
      { ...bandFillLayer(), name: 'Green band', paint: { kind: 'lit', color: '#2f6a3c', light: 0.7, dark: 0.8, pressed: false, highlight: null } },
      { ...lineLayer(), name: 'Battlements', at: 0.12, width: 0.05, paint: { kind: 'solid', color: '#d9b45a' }, waveAmplitude: 0.05, waveLength: 0.3, waveShape: 'square' },
      { ...lineLayer(), name: 'Cord', at: 0.55, width: 0.08, paint: { kind: 'solid', color: '#d9b45a' }, waveAmplitude: 0.18, waveLength: 0.7, raised: true },
      { ...lineLayer(), name: 'Cord (other strand)', at: 0.55, width: 0.08, paint: { kind: 'solid', color: '#b8923a' }, waveAmplitude: 0.18, waveLength: 0.7, wavePhase: 0.5, raised: true },
      { ...repeatLayer(), name: 'Knots', element: 'knot', count: 8, at: 0.55, size: 0.7, fill: '#f0d080', detail: '#5a3a10', outlineWidth: 0.08 },
      { ...lineLayer(), name: 'Inner rim', at: 0.985, width: 0.03, paint: { kind: 'solid', color: '#10200f' } },
    ],
  },
  {
    id: 'royal',
    name: 'Royal',
    description: 'Crimson and gold: gold dust, fleurs-de-lis between gems, and a crown at the top.',
    make: () => [
      { ...bandFillLayer(), name: 'Crimson', paint: { kind: 'lit', color: '#8a1a2a', light: 0.75, dark: 0.8, pressed: false, highlight: null } },
      { ...lineLayer(), name: 'Outer gold', at: 0.06, width: 0.1, paint: { kind: 'lit', color: '#d4a64a', light: 0.95, dark: 0.8, pressed: false, highlight: '#fff6c8' } },
      { ...lineLayer(), name: 'Inner gold', at: 0.94, width: 0.1, paint: { kind: 'lit', color: '#d4a64a', light: 0.95, dark: 0.8, pressed: false, highlight: '#fff6c8' } },
      { ...repeatLayer(), name: 'Fleurs-de-lis', element: 'fleur', count: 8, at: 0.5, size: 0.8, fill: '#e2b85a', show: [false, true] },
      { ...repeatLayer(), name: 'Gems', element: 'gem', count: 8, at: 0.5, size: 0.42, stretch: 0.8, fill: '#2a5ad8', show: [true, false] },
      { ...shapeLayer(), name: 'Crown', shape: 'ornament', element: 'crown', across: 0.1, size: 1.1, stretch: 1.3, fill: '#e2b85a', outline: '#5a3a10', outlineWidth: 0.04, detail: '#a01a2a' },
    ],
  },
  {
    id: 'grim-iron',
    name: 'Grim iron',
    description: 'Rusty iron over chainmail, with skulls and paw prints in turn.',
    make: () => [
      { ...bandFillLayer(), name: 'Iron', paint: { kind: 'lit', color: '#55524f', light: 0.6, dark: 0.8, pressed: false, highlight: null } },
      { ...textureLayer('chainmail'), name: 'Chainmail', color: '#9aa0aa', from: 0.2, to: 0.8, seed: 1 },
      { ...textureLayer('rust'), name: 'Rust', color: '#8a3b12', seed: 0x2057 },
      { ...lineLayer(), name: 'Outer band', at: 0.08, width: 0.16, paint: { kind: 'lit', color: '#55524f', light: 0.7, dark: 0.8, pressed: false, highlight: null } },
      { ...lineLayer(), name: 'Inner band', at: 0.92, width: 0.16, paint: { kind: 'lit', color: '#55524f', light: 0.7, dark: 0.8, pressed: false, highlight: null } },
      { ...repeatLayer(), name: 'Skulls', element: 'skull', count: 6, at: 0.5, size: 0.75, stretch: 0.85, fill: '#e8dcc0', show: [true, false] },
      { ...repeatLayer(), name: 'Paw prints', element: 'paw', count: 6, at: 0.5, size: 0.55, fill: '#c9b48a', shaded: false, raised: false, opacity: 0.75, show: [false, true] },
    ],
  },
]
