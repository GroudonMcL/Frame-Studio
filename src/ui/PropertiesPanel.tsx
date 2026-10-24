// Settings for the selected layer. Each layer type has its own controls; the
// ones most people need come first and the technical ones sit in Advanced.

import { PenTool, Plus, Shuffle, Trash2 } from 'lucide-react';
import { FRAME_PRESETS } from '../engine/legacy/catalog';
import { frameAccent } from '../engine/legacy/frames';
import { LAYER_TYPE_NAMES, TEXTURES } from '../project/defaults';
import { findLayer, locate } from '../project/tree';
import {
  BLEND_MODES,
  CLIP_MODES,
  DEFAULT_LIGHT,
  ELEMENT_KINDS,
  MIRROR_MODES,
  SHAPE_KINDS,
  TEXTURE_KINDS,
  TEXTURE_PLACES,
  type BlendMode,
  type ClipMode,
  type GradientStop,
  type Layer,
  type MirrorMode,
  type Paint,
  type PathLayer,
  type PlacedLayer,
  type RingStop,
  type ShapeKind,
  type TextureLayer,
  type TexturePlace,
} from '../project/types';
import { bandGeometry } from '../render/band';
import { litFor } from '../render/paint';
import { TEXTURE_NAMES } from '../render/textures';
import { ELEMENT_NAMES } from '../render/elements';
import { switchPlace, toggleSmooth } from '../render/hitTest';
import { commit, finishDrawing, setPathEdit, setPathPoints, ungroup, updateLayer, useProject, useUi } from '../state/projectStore';
import { ColorField, ColorList, Fold, OptionalColor, PercentList, Select, Slider, Toggle } from './controls';
import { DataView } from './DataView';

const BLEND_NAMES: Record<BlendMode, string> = {
  'source-over': 'Normal',
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  'soft-light': 'Soft light',
  lighter: 'Add (glow)',
  color: 'Colour',
};

const CLIP_NAMES: Record<ClipMode, string> = {
  none: 'Not clipped',
  band: 'Only inside the band',
  below: 'Only on the layer below',
};

const MIRROR_NAMES: Record<MirrorMode, string> = {
  none: 'No mirror',
  leftRight: 'Left and right (a pair)',
  topBottom: 'Top and bottom (a pair)',
  four: 'All four sides',
};

const SHAPE_NAMES: Record<ShapeKind, string> = {
  circle: 'Circle or oval',
  rectangle: 'Rectangle',
  polygon: 'Polygon',
  star: 'Star',
};

const WHERE_NAMES: Record<TexturePlace, string> = {
  everywhere: 'Everywhere',
  shaded: 'Mostly on the shaded side',
  lit: 'Mostly on the lit side',
};

type Set<L extends Layer> = (patch: Partial<L>, transient?: boolean) => void;

function setterFor<L extends Layer>(layer: L): Set<L> {
  return (patch, transient) => updateLayer(layer.id, patch as Partial<Layer>, { transient });
}

/** A slider bound to one numeric setting of a layer. */
function num<L extends Layer>(layer: L, set: Set<L>, key: keyof L & string, label: string, min: number, max: number, extra: Partial<Parameters<typeof Slider>[0]> = {}) {
  return (
    <Slider
      key={key}
      label={label}
      value={layer[key] as number}
      min={min}
      max={max}
      disabled={layer.locked}
      onChange={(v, transient) => set({ [key]: v } as Partial<L>, transient)}
      onCommit={commit}
      {...extra}
    />
  );
}

const pct = { scale: 100, unit: '%', step: 0.005 };

export function PropertiesPanel() {
  const project = useProject();
  const selectedId = useUi((s) => s.selectedId);
  const advanced = useUi((s) => s.mode === 'advanced');
  const layer = findLayer(project.layers, selectedId);
  const inLockedGroup = !!layer && !!locate(project.layers, layer.id)?.ancestors.some((g) => g.locked);

  return (
    <aside className="panel properties" aria-label="Properties">
      <h2 className="panel-title">Properties</h2>
      {!layer ? (
        <p className="muted">Pick a layer in the list or on the canvas to change it.</p>
      ) : (
        <div className="props" key={layer.id}>
          <p className="layer-kind">
            {LAYER_TYPE_NAMES[layer.type]}
            {(layer.locked || inLockedGroup) && <span className="badge">{layer.locked ? 'Locked' : 'In a locked group'}</span>}
          </p>
          <LayerControls layer={inLockedGroup ? ({ ...layer, locked: true } as Layer) : layer} light={project.stage.light} />
          {advanced && layer.type !== 'unsupported' && (
            <Fold title="Advanced: layer" defaultOpen>
              {layer.type !== 'group' && num(layer, setterFor(layer), 'opacity', 'Opacity', 0, 1, pct)}
              <Select
                label="Blend mode"
                value={layer.blend}
                disabled={layer.locked}
                options={BLEND_MODES.map((b) => ({ value: b, label: BLEND_NAMES[b] }))}
                onChange={(blend) => updateLayer(layer.id, { blend })}
              />
              <Select
                label="Clip"
                hint="Show this layer only inside the band, or only where the layer below it has paint."
                value={layer.clip}
                disabled={layer.locked}
                options={CLIP_MODES.map((c) => ({ value: c, label: CLIP_NAMES[c] }))}
                onChange={(clip) => updateLayer(layer.id, { clip })}
              />
              <AdvancedControls layer={layer} />
            </Fold>
          )}
        </div>
      )}
      {advanced && <DataView />}
    </aside>
  );
}

function LayerControls({ layer, light }: { layer: Layer; light: number }) {
  const disabled = layer.locked;
  switch (layer.type) {
    case 'legacyFrame': {
      const set = setterFor(layer);
      const accent = frameAccent(layer.style);
      return (
        <>
          <p className="note">
            A Token Maker frame, drawn by its original code. It is one layer: its colour{accent ? ' and highlights colour' : ''} can be changed, but its parts can't
            be edited one by one yet.
          </p>
          {light !== DEFAULT_LIGHT && (
            <p className="note warning" role="note">
              This frame is always lit from the top left: Token Maker's drawing code can't follow the light you moved. Your own layers do follow it.
            </p>
          )}
          <Select
            label="Frame"
            value={layer.presetId}
            disabled={disabled}
            options={FRAME_PRESETS.map((p) => ({ value: p.id, label: `${p.name} (${p.group})` }))}
            onChange={(presetId) => {
              const p = FRAME_PRESETS.find((f) => f.id === presetId)!;
              set({ presetId, style: p.style, color: p.color, accent: null, name: layer.name === FRAME_PRESETS.find((f) => f.id === layer.presetId)?.name ? p.name : layer.name });
            }}
          />
          <ColorField label="Colour" value={layer.color} disabled={disabled} onChange={(color, t) => set({ color }, t)} />
          {accent && (
            <ColorField
              label="Highlights colour"
              hint="The colour of the frame's own details (beads, eyes, stars…)."
              value={layer.accent ?? accent}
              disabled={disabled}
              onChange={(c, t) => set({ accent: c }, t)}
            />
          )}
        </>
      );
    }
    case 'bandFill': {
      const set = setterFor(layer);
      return (
        <>
          <PaintEditor paint={layer.paint} disabled={disabled} onChange={(paint, t) => set({ paint }, t)} />
          {num(layer, set, 'from', 'Starts at (outer edge = 0%)', -0.5, 1.5, pct)}
          {num(layer, set, 'to', 'Ends at (inner edge = 100%)', -0.5, 1.5, pct)}
        </>
      );
    }
    case 'line': {
      const set = setterFor(layer);
      return (
        <>
          <PaintEditor paint={layer.paint} disabled={disabled} onChange={(paint, t) => set({ paint }, t)} />
          {num(layer, set, 'at', 'Position across the band', -0.5, 1.5, pct)}
          {num(layer, set, 'width', 'Width', 0.005, 1, pct)}
          <Select
            label="Style"
            value={layer.dash}
            disabled={disabled}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
              { value: 'dotted', label: 'Dotted' },
            ]}
            onChange={(dash) => set({ dash })}
          />
          <OptionalColor label="Glow" value={layer.glow} fallback="#6fc3ff" disabled={disabled} onChange={(glow, t) => set({ glow }, t)} />
          <Toggle
            label="Wavy"
            hint="The line wanders in and out as it goes round, for vines and knotwork."
            checked={layer.waveAmplitude > 0}
            disabled={disabled}
            onChange={(on) => set({ waveAmplitude: on ? 0.2 : 0 })}
          />
          {layer.waveAmplitude > 0 && (
            <>
              {num(layer, set, 'waveAmplitude', 'Wave height', 0.01, 1, { ...pct, hint: 'How far it wanders, as a share of the band width.' })}
              {num(layer, set, 'waves', 'Waves all the way round', 1, 64, { step: 1 })}
              {num(layer, set, 'wavePhase', 'Slide the waves', 0, 1, pct)}
            </>
          )}
        </>
      );
    }
    case 'texture':
      return <TextureControls layer={layer} />;
    case 'shape':
    case 'path':
      return <PlacedControls layer={layer} />;
    case 'group':
      return (
        <>
          <p className="note">
            {layer.children.length === 0
              ? 'An empty group. Drag layers onto it in the list, or pick several layers (Ctrl+click) and press Group.'
              : `Holds ${layer.children.length} layer${layer.children.length === 1 ? '' : 's'}. Hiding, locking or fading the group does the same to all of them.`}
          </p>
          {num(layer, setterFor(layer), 'opacity', 'Opacity', 0, 1, pct)}
          <button type="button" className="btn small" disabled={disabled} onClick={() => ungroup(layer.id)}>
            Ungroup
          </button>
        </>
      );
    case 'repeat': {
      const set = setterFor(layer);
      return (
        <>
          <Select label="Shape" value={layer.element} disabled={disabled} options={ELEMENT_KINDS.map((k) => ({ value: k, label: ELEMENT_NAMES[k] }))} onChange={(element) => set({ element })} />
          <ColorField label="Colour" value={layer.fill} disabled={disabled} onChange={(fill, t) => set({ fill }, t)} />
          <Select
            label="How many"
            value={layer.mode}
            disabled={disabled}
            options={[
              { value: 'count', label: 'A set number' },
              { value: 'spacing', label: 'As many as fit' },
            ]}
            onChange={(mode) => set({ mode })}
          />
          {layer.mode === 'count'
            ? num(layer, set, 'count', 'Number', 1, 96, { step: 1 })
            : num(layer, set, 'spacing', 'Spacing', 0.1, 6, { step: 0.05, scale: 100, unit: '%', hint: 'Distance between centres, as a share of the band width.' })}
          {num(layer, set, 'size', 'Size', 0.02, 1.5, pct)}
          {num(layer, set, 'at', 'Position across the band', -0.5, 1.5, pct)}
          {num(layer, set, 'rotation', 'Rotation', -180, 180, { step: 1, unit: '°' })}
          {num(layer, set, 'offset', 'Slide along', 0, 1, pct)}
          <Toggle label="Raised (small shadow)" checked={layer.raised} disabled={disabled} onChange={(raised) => set({ raised })} />
          <Toggle
            label="One on every corner"
            hint="Rounds the number so square and hexagon corners each get one."
            checked={layer.snapToCorners}
            disabled={disabled}
            onChange={(snapToCorners) => set({ snapToCorners })}
          />
          <Fold title="Patterns" defaultOpen={layer.altColors.length > 0 || layer.altSizes.length > 0 || layer.alternateSides > 0}>
            <ColorList
              label="Alternate colours"
              hint="Colours taken in turn after the main one: light, dark, light, dark…"
              values={layer.altColors}
              disabled={disabled}
              onChange={(altColors, t) => set({ altColors }, t)}
            />
            <PercentList
              label="Alternate sizes"
              hint="Sizes taken in turn, e.g. 100, 60 for big, small, big, small. Leave empty for all the same."
              values={layer.altSizes}
              disabled={disabled}
              onChange={(altSizes) => set({ altSizes })}
            />
            {num(layer, set, 'alternateSides', 'Alternate sides', 0, 1, { ...pct, hint: 'Every other one moves inwards and points the other way, like leaves on a vine. 0 = off.' })}
          </Fold>
        </>
      );
    }
    case 'unsupported':
      return (
        <p className="note warning">
          This layer was made by a newer Frame Studio (kind “{layer.originalType}”). It is kept and saved as it was, but this version can't draw or edit it.
        </p>
      );
  }
}

/** Technical settings, shown only in Advanced mode. */
function AdvancedControls({ layer }: { layer: Layer }) {
  const disabled = layer.locked;
  if (layer.type === 'shape' || layer.type === 'path') return <PlacedAdvanced layer={layer} />;
  if (layer.type !== 'repeat') return null;
  const set = setterFor(layer);
  return (
    <>
      {num(layer, set, 'stretch', 'Width ÷ height', 0.2, 3, { step: 0.05 })}
      <OptionalColor label="Outline" value={layer.outline} fallback="#1a1008" disabled={disabled} onChange={(outline, t) => set({ outline }, t)} />
      {num(layer, set, 'outlineWidth', layer.element === 'rune' ? 'Stroke width' : 'Outline width', 0, 0.4, pct)}
      <OptionalColor label="Glow" value={layer.glow} fallback="#6fc3ff" disabled={disabled} onChange={(glow, t) => set({ glow }, t)} />
      {num(layer, set, 'accentEvery', 'Bigger one every… (0 = off)', 0, 24, { step: 1 })}
      {layer.accentEvery > 0 && num(layer, set, 'accentScale', 'Bigger by', 0.2, 4, { step: 0.05, scale: 100, unit: '%' })}
      {layer.accentEvery > 0 && <OptionalColor label="Own colour for the bigger ones" value={layer.accentColor} fallback="#3d8c6a" disabled={disabled} onChange={(accentColor, t) => set({ accentColor }, t)} />}
      {layer.accentEvery > 0 && num(layer, set, 'skipAroundAccent', 'Leave gaps beside the bigger ones', 0, 4, { step: 1, hint: 'How many to leave out on each side of every bigger one.' })}
      {(layer.element === 'rune' || layer.element === 'note') && num(layer, set, 'seed', layer.element === 'rune' ? 'Rune pattern' : 'Note pattern', 0, 999, { step: 1 })}
    </>
  );
}

const PAINT_KINDS: { value: Paint['kind']; label: string }[] = [
  { value: 'lit', label: 'Metal (lit from the top left)' },
  { value: 'solid', label: 'Flat colour' },
  { value: 'linear', label: 'Gradient across the token' },
  { value: 'acrossBand', label: 'Gradient across the band' },
  { value: 'ring', label: 'Colours round the ring' },
];

function colorOf(paint: Paint): string {
  return 'color' in paint ? paint.color : paint.stops[0].color;
}

/** Ring colours that start out looking like the metal lighting: the lit table sampled every 30°. */
function ringFromLit(color: string, light: number, dark: number, pressed: boolean): RingStop[] {
  const t = litFor(color, light, dark);
  const table = pressed ? t.step : t.band;
  return Array.from({ length: 12 }, (_x, i) => ({ angle: i * 30, color: table[i * 30] }));
}

function convert(paint: Paint, kind: Paint['kind']): Paint {
  const c = colorOf(paint);
  const stops: GradientStop[] = paint.kind === 'linear' || paint.kind === 'acrossBand' ? paint.stops : [{ at: 0, color: c }, { at: 1, color: '#000000' }];
  switch (kind) {
    case 'ring':
      return { kind, stops: paint.kind === 'lit' ? ringFromLit(c, paint.light, paint.dark, paint.pressed) : ringFromLit(c, 0.85, 0.8, false), followLight: true };
    case 'solid':
      return { kind, color: c };
    case 'lit':
      return { kind, color: c, light: 0.85, dark: 0.8, pressed: false };
    case 'linear':
      return { kind, angle: 45, stops };
    case 'acrossBand':
      return { kind, stops };
  }
}

export function PaintEditor({ paint, disabled, onChange }: { paint: Paint; disabled: boolean; onChange: (p: Paint, transient?: boolean) => void }) {
  const advanced = useUi((s) => s.mode === 'advanced');
  return (
    <>
      <Select label="Paint" value={paint.kind} disabled={disabled} options={PAINT_KINDS} onChange={(k) => onChange(convert(paint, k))} />
      {(paint.kind === 'solid' || paint.kind === 'lit') && <ColorField label="Colour" value={paint.color} disabled={disabled} onChange={(color, t) => onChange({ ...paint, color }, t)} />}
      {paint.kind === 'lit' && (
        <>
          <Toggle label="Pressed in (lit from the other side)" checked={paint.pressed} disabled={disabled} onChange={(pressed) => onChange({ ...paint, pressed })} />
          {advanced && (
            <>
              <Slider label="Highlight" value={paint.light} min={0} max={1} disabled={disabled} {...pct} onChange={(light, t) => onChange({ ...paint, light }, t)} onCommit={commit} />
              <Slider label="Shade" value={paint.dark} min={0} max={1} disabled={disabled} {...pct} onChange={(dark, t) => onChange({ ...paint, dark }, t)} onCommit={commit} />
            </>
          )}
        </>
      )}
      {paint.kind === 'ring' && <RingStops paint={paint} disabled={disabled} onChange={onChange} />}
      {paint.kind === 'linear' && (
        <Slider label="Angle" value={paint.angle} min={-180} max={180} step={1} unit="°" disabled={disabled} onChange={(angle, t) => onChange({ ...paint, angle }, t)} onCommit={commit} />
      )}
      {(paint.kind === 'linear' || paint.kind === 'acrossBand') && (
        <div className="stops">
          {paint.stops.map((s, i) => (
            <div className="stop" key={i}>
              <ColorField label={`Colour ${i + 1}`} value={s.color} disabled={disabled} onChange={(color, t) => onChange({ ...paint, stops: paint.stops.map((x, k) => (k === i ? { ...x, color } : x)) }, t)} />
              {advanced && (
                <Slider
                  label={`Colour ${i + 1} position`}
                  value={s.at}
                  min={0}
                  max={1}
                  disabled={disabled}
                  {...pct}
                  onChange={(at, t) => onChange({ ...paint, stops: paint.stops.map((x, k) => (k === i ? { ...x, at } : x)) }, t)}
                  onCommit={commit}
                />
              )}
              {paint.stops.length > 2 && (
                <button type="button" className="icon-btn" aria-label={`Remove colour ${i + 1}`} disabled={disabled} onClick={() => onChange({ ...paint, stops: paint.stops.filter((_x, k) => k !== i) })}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          {paint.stops.length < 8 && (
            <button
              type="button"
              className="btn small"
              disabled={disabled}
              onClick={() => {
                const last = paint.stops[paint.stops.length - 1];
                const spread = paint.stops.map((s, k) => ({ ...s, at: k / paint.stops.length }));
                onChange({ ...paint, stops: [...spread, { at: 1, color: last.color }] });
              }}
            >
              <Plus size={16} /> Add a colour
            </button>
          )}
        </div>
      )}
    </>
  );
}

const ringCss = (stops: RingStop[]) => {
  // CSS measures conic angles from the top; ours start at the right.
  const sorted = [...stops].sort((a, b) => a.angle - b.angle);
  const all = [...sorted, { angle: sorted[0].angle + 360, color: sorted[0].color }];
  return `conic-gradient(from 90deg, ${all.map((s) => `${s.color} ${s.angle}deg`).join(', ')})`;
};

/** The colours of a ring paint, each at an angle round the token. */
function RingStops({ paint, disabled, onChange }: { paint: Extract<Paint, { kind: 'ring' }>; disabled: boolean; onChange: (p: Paint, transient?: boolean) => void }) {
  const setStop = (i: number, patch: Partial<RingStop>, transient?: boolean) => onChange({ ...paint, stops: paint.stops.map((x, k) => (k === i ? { ...x, ...patch } : x)) }, transient);
  const addStop = () => {
    // Halfway across the widest gap.
    const sorted = [...paint.stops].sort((a, b) => a.angle - b.angle);
    let best = { gap: -1, angle: 0, color: sorted[0].color };
    sorted.forEach((s, i) => {
      const next = sorted[(i + 1) % sorted.length];
      const gap = (((next.angle - s.angle) % 360) + 360) % 360 || 360;
      if (gap > best.gap) best = { gap, angle: Math.round((s.angle + gap / 2) % 360), color: s.color };
    });
    onChange({ ...paint, stops: [...paint.stops, { angle: best.angle, color: best.color }] });
  };
  return (
    <div className="stops" role="group" aria-label="Colours round the ring">
      <div className="ring-preview" aria-hidden="true" style={{ background: ringCss(paint.stops) }} />
      <p className="note">Each colour sits at an angle round the token (0° right, 90° bottom, 180° left, 270° top) and blends into the next.</p>
      {paint.stops.map((s, i) => (
        <div className="stop" key={i}>
          <ColorField label={`Colour ${i + 1}`} value={s.color} disabled={disabled} onChange={(color, t) => setStop(i, { color }, t)} />
          <Slider label={`Colour ${i + 1} angle`} value={s.angle} min={0} max={359} step={1} unit="°" disabled={disabled} onChange={(angle, t) => setStop(i, { angle }, t)} onCommit={commit} />
          {paint.stops.length > 2 && (
            <button type="button" className="icon-btn" aria-label={`Remove colour ${i + 1}`} disabled={disabled} onClick={() => onChange({ ...paint, stops: paint.stops.filter((_x, k) => k !== i) })}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
      {paint.stops.length < 36 && (
        <button type="button" className="btn small" disabled={disabled} onClick={addStop}>
          <Plus size={16} /> Add a colour
        </button>
      )}
      <Toggle
        label="Turn with the light"
        hint="On: the colours are for a light at the top left and turn when you move the light. Off: they stay where they are."
        checked={paint.followLight}
        disabled={disabled}
        onChange={(followLight) => onChange({ ...paint, followLight })}
      />
    </div>
  );
}

const TEXTURE_COLOUR_LABEL: Partial<Record<TextureLayer['kind'], [string, string]>> = {
  scatter: ['Star colour', 'The colour of the stars.'],
  cracks: ['Glow colour', 'The colour the cracks glow.'],
};

function TextureControls({ layer }: { layer: TextureLayer }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  const [colourLabel, colourHint] = TEXTURE_COLOUR_LABEL[layer.kind] ?? ['Colour', 'Its marks are lighter and darker shades of this: match it to the band underneath.'];
  return (
    <>
      <Select
        label="Texture"
        value={layer.kind}
        disabled={disabled}
        options={TEXTURE_KINDS.map((k) => ({ value: k, label: TEXTURE_NAMES[k] }))}
        onChange={(kind) => {
          const preset = TEXTURES.find((t) => t.layer.kind === kind)!.layer;
          const named = layer.name === 'Texture' || TEXTURES.some((t) => t.layer.name === layer.name);
          set({ kind, seed: preset.seed ?? layer.seed, color2: kind === 'scatter' ? (layer.color2 ?? preset.color2 ?? null) : layer.color2, ...(named ? { name: preset.name } : {}) });
        }}
      />
      <ColorField label={colourLabel} hint={colourHint} value={layer.color} disabled={disabled} onChange={(color, t) => set({ color }, t)} />
      {layer.kind === 'scatter' && <OptionalColor label="Haze" hint="Soft clouds of colour behind the stars." value={layer.color2} fallback="#6a5acd" disabled={disabled} onChange={(color2, t) => set({ color2 }, t)} />}
      {num(layer, set, 'amount', 'How many', 0.1, 3, { ...pct, step: 0.05, hint: '100% is as many as Token Maker draws.' })}
      {num(layer, set, 'scale', 'Size', 0.2, 3, { ...pct, step: 0.05, hint: '100% is the size Token Maker draws them.' })}
      {num(layer, set, 'strength', 'Strength', 0, 2, { ...pct, step: 0.05, hint: 'How strongly it shows. 100% is as strong as in Token Maker.' })}
      <Select
        label="Where"
        hint="Keep it to the side away from the light (like Stamped's marbling), the side facing it, or all the way round. Follows the light dial."
        value={layer.where}
        disabled={disabled}
        options={TEXTURE_PLACES.map((w) => ({ value: w, label: WHERE_NAMES[w] }))}
        onChange={(where) => set({ where })}
      />
      <div className="row">
        {num(layer, set, 'seed', 'Variation', 0, 99999, { step: 1, hint: 'Each number gives a different arrangement of the same texture.' })}
        <button type="button" className="icon-btn" aria-label="Shuffle" title="Try another variation" disabled={disabled} onClick={() => set({ seed: Math.floor(Math.random() * 99999) })}>
          <Shuffle size={16} />
        </button>
      </div>
      {num(layer, set, 'from', 'Starts at (outer edge = 0%)', -0.5, 1.5, pct)}
      {num(layer, set, 'to', 'Ends at (inner edge = 100%)', -0.5, 1.5, pct)}
    </>
  );
}

/** A nominal render size for converting placements (they are the same at every size). */
const NOMINAL = 1000;

function PlacedControls({ layer }: { layer: PlacedLayer }) {
  const project = useProject();
  const pathEdit = useUi((s) => s.pathEdit);
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <>
      {layer.type === 'shape' ? (
        <>
          <Select label="Shape" value={layer.shape} disabled={disabled} options={SHAPE_KINDS.map((k) => ({ value: k, label: SHAPE_NAMES[k] }))} onChange={(shape) => set({ shape })} />
          {(layer.shape === 'polygon' || layer.shape === 'star') && num(layer, set, 'sides', layer.shape === 'star' ? 'Points' : 'Sides', 3, 16, { step: 1 })}
          {layer.shape === 'star' && num(layer, set, 'innerRatio', 'Inner points', 0.1, 0.95, pct)}
          {layer.shape === 'rectangle' && num(layer, set, 'corner', 'Round the corners', 0, 1, pct)}
        </>
      ) : (
        <PathPoints layer={layer} editing={pathEdit} />
      )}
      <OptionalColor label="Fill" value={layer.fill} fallback="#5fa8d3" disabled={disabled} onChange={(fill, t) => set({ fill }, t)} />
      {layer.fill !== null && <Toggle label="Shaded by the light" checked={layer.shaded} disabled={disabled} onChange={(shaded) => set({ shaded })} />}
      <OptionalColor label="Outline" value={layer.outline} fallback="#1a1008" disabled={disabled} onChange={(outline, t) => set({ outline }, t)} />
      {layer.outline !== null && num(layer, set, 'outlineWidth', 'Outline width', 0.005, 0.4, pct)}
      <Select
        label="Mirror"
        hint="Adds mirrored copies on the other side of the token, like a matching pair of decorations."
        value={layer.mirror}
        disabled={disabled}
        options={MIRROR_MODES.map((m) => ({ value: m, label: MIRROR_NAMES[m] }))}
        onChange={(mirror) => set({ mirror })}
      />
      <Toggle label="Raised (small shadow)" checked={layer.raised} disabled={disabled} onChange={(raised) => set({ raised })} />
      <Toggle
        label="Place freely"
        hint="Off: it sits on the band and follows every token shape and thickness. On: it stays where you put it, whatever the band does."
        checked={layer.place === 'free'}
        disabled={disabled}
        onChange={() => set(switchPlace(layer, bandGeometry(project.stage, NOMINAL)))}
      />
      <p className="note">Drag it on the canvas to move it; drag the corner handle to resize and the round handle to turn it.</p>
    </>
  );
}

function PlacedAdvanced({ layer }: { layer: PlacedLayer }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <>
      {layer.place === 'band' ? (
        <>
          {num(layer, set, 'along', 'Round the token (from the top)', 0, 1, pct)}
          {num(layer, set, 'across', 'Position across the band', -0.5, 1.5, pct)}
          {num(layer, set, 'size', 'Height (band widths)', 0.05, 5, { step: 0.01, scale: 100, unit: '%' })}
        </>
      ) : (
        <>
          {num(layer, set, 'x', 'Left / right', -1.2, 1.2, pct)}
          {num(layer, set, 'y', 'Up / down', -1.2, 1.2, pct)}
          {num(layer, set, 'size', 'Height (of the token’s half-width)', 0.02, 2, { step: 0.005, scale: 100, unit: '%' })}
        </>
      )}
      {num(layer, set, 'stretch', 'Width ÷ height', 0.1, 5, { step: 0.05 })}
      {num(layer, set, 'rotation', 'Rotation', -180, 180, { step: 1, unit: '°' })}
      <OptionalColor label="Glow" value={layer.glow} fallback="#6fc3ff" disabled={disabled} onChange={(glow, t) => set({ glow }, t)} />
    </>
  );
}

function PathPoints({ layer, editing }: { layer: PathLayer; editing: { drawing: boolean; point: number | null } | null }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  const point = editing?.point ?? null;
  return (
    <>
      {editing?.drawing ? (
        <p className="note" role="status">
          {layer.points.length === 0
            ? 'Click on the canvas to place the first point.'
            : layer.points.length < 3
              ? 'Keep clicking to add points.'
              : 'Keep clicking to add points. Click the first point (or press Enter) to finish.'}
        </p>
      ) : (
        <p className="note">
          {layer.points.length} point{layer.points.length === 1 ? '' : 's'}.{' '}
          {editing ? 'Drag points and their round handles; double-click a point to make it smooth or sharp.' : ''}
        </p>
      )}
      <div className="row">
        <button
          type="button"
          className={`btn small${editing ? ' primary' : ''}`}
          disabled={disabled}
          aria-pressed={!!editing}
          onClick={() => (editing?.drawing ? (finishDrawing(false), setPathEdit(null)) : setPathEdit(editing ? null : { drawing: layer.points.length === 0, point: null }))}
        >
          <PenTool size={16} /> {editing ? 'Done editing' : 'Edit points'}
        </button>
        {editing && !editing.drawing && (
          <button type="button" className="btn small" disabled={disabled} onClick={() => setPathEdit({ drawing: true, point: null })}>
            Add points
          </button>
        )}
      </div>
      {editing && point !== null && point < layer.points.length && (
        <div className="row">
          <button type="button" className="btn small" disabled={disabled} onClick={() => setPathPoints(layer.id, toggleSmooth(layer.points, point, layer.closed))}>
            {layer.points[point].handle ? 'Make point sharp' : 'Make point smooth'}
          </button>
          <button
            type="button"
            className="btn small"
            disabled={disabled}
            onClick={() => {
              setPathPoints(
                layer.id,
                layer.points.filter((_p, i) => i !== point),
              );
              setPathEdit({ ...editing, point: null });
            }}
          >
            <Trash2 size={16} /> Delete point
          </button>
        </div>
      )}
      <Toggle label="Closed shape" hint="Joins the last point back to the first so the shape can be filled." checked={layer.closed} disabled={disabled} onChange={(closed) => set({ closed })} />
    </>
  );
}
