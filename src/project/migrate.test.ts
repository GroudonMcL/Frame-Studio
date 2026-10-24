import { FRAME_PRESETS } from '../engine/legacy/catalog';
import { bandFillLayer, createProject, GEM_POINTS, TEXTURES, textureFromPreset, textureLayer, groupLayer, LAYERED_TEMPLATES, NEW_LAYER, pathLayer, projectFromFrame, repeatLayer, shapeLayer } from './defaults';
import { parseProject, serializeProject } from './migrate';
import { SCHEMA_VERSION, type FrameProject } from './types';

const roundTrip = (p: FrameProject) => {
  const r = parseProject(serializeProject(p));
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe('project files', () => {
  it('a saved and reopened project is the same project', () => {
    for (const make of [() => createProject(LAYERED_TEMPLATES[0].make()), () => projectFromFrame('warlock'), () => createProject(Object.values(NEW_LAYER).map((m) => m()))]) {
      const p = make();
      const r = roundTrip(p);
      expect(r.project).toEqual(p);
      expect(r.warnings).toEqual([]);
    }
  });

  it('every Token Maker frame survives a round trip', () => {
    for (const f of FRAME_PRESETS) expect(roundTrip(projectFromFrame(f.id)).project.layers[0]).toMatchObject({ type: 'legacyFrame', presetId: f.id, style: f.style });
  });

  it('carries a format name and version', () => {
    const json = JSON.parse(serializeProject(createProject()));
    expect(json.format).toBe('frame-studio-project');
    expect(json.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('refuses files that are not projects, with a reason', () => {
    for (const bad of ['not json', '{}', '[]', JSON.stringify({ format: 'frame-studio-project' })]) {
      const r = parseProject(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(10);
    }
  });

  it('refuses a project from a newer version instead of guessing', () => {
    const r = parseProject({ ...createProject(), schemaVersion: SCHEMA_VERSION + 1 });
    expect(r.ok).toBe(false);
  });

  it('keeps a layer kind it does not know, unchanged, and writes it back', () => {
    const p = { ...createProject(), layers: [{ id: 'x1', name: 'Future', type: 'sparkleField', visible: true, locked: false, opacity: 1, blend: 'source-over', density: 7, nested: { a: [1, 2] } }] };
    const r = parseProject(JSON.stringify(p));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.project.layers[0]).toMatchObject({ type: 'unsupported', originalType: 'sparkleField', data: { density: 7, nested: { a: [1, 2] } } });
    expect(r.warnings.join(' ')).toMatch(/Future/);
    expect(JSON.parse(serializeProject(r.project)).layers[0]).toEqual(p.layers[0]);
  });

  it('bad values fall back to defaults; numbers are kept in range', () => {
    const r = parseProject({
      format: 'frame-studio-project',
      schemaVersion: 1,
      stage: { shape: 'blob', thickness: 99 },
      layers: [{ type: 'repeat', count: -4, fill: 'red', size: 'big', element: 'dragon' }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.project.stage.shape).toBe('circle');
    expect(r.project.stage.thickness).toBe(0.6);
    const l = r.project.layers[0];
    if (l.type !== 'repeat') throw new Error('expected a repeat');
    expect(l.count).toBe(1);
    expect(l.fill).toBe('#e0c070');
    expect(l.element).toBe('bead');
    expect(l.id).toBeTruthy();
  });

  it('gives clashing layer ids fresh ones', () => {
    const a = NEW_LAYER.line();
    const r = parseProject({ ...createProject(), layers: [a, { ...a }] });
    if (!r.ok) throw new Error();
    expect(new Set(r.project.layers.map((l) => l.id)).size).toBe(2);
  });

  it('version 2: shapes, paths, groups and the new options survive a round trip', () => {
    const p = createProject([
      { ...shapeLayer(), shape: 'star', sides: 7, mirror: 'four', place: 'free', x: 0.1, y: -0.2, clip: 'band' },
      { ...pathLayer(GEM_POINTS.map((q, i) => (i === 2 ? { ...q, handle: { x: 0.2, y: -0.1 } } : q))), closed: false },
      groupLayer([{ ...repeatLayer(), altColors: ['#123456'], altSizes: [1, 0.5], skipAroundAccent: 1, accentEvery: 9, alternateSides: 0.2 }, groupLayer([])]),
      { ...NEW_LAYER.line(), waveAmplitude: 0.2, waves: 9, wavePhase: 0.25, clip: 'below' } as ReturnType<typeof NEW_LAYER.line>,
    ]);
    p.stage.light = 45;
    const r = roundTrip(p);
    expect(r.project).toEqual(p);
    expect(r.warnings).toEqual([]);
  });

  it('migrates a version-1 file: light from the top left, nothing clipped, no waves or patterns', () => {
    const v1 = {
      format: 'frame-studio-project',
      schemaVersion: 1,
      name: 'Old',
      stage: { shape: 'square', thickness: 0.2, outerSpacing: 0.1, showArt: false, backingColor: '#000000' },
      layers: [
        { id: 'a', name: 'L', type: 'line', visible: true, locked: false, opacity: 1, blend: 'source-over', at: 0.3, width: 0.1, paint: { kind: 'solid', color: '#ffffff' }, dash: 'solid', glow: null },
        { id: 'b', name: 'R', type: 'repeat', visible: true, locked: false, opacity: 1, blend: 'source-over', element: 'bead', count: 5 },
      ],
    };
    const r = parseProject(JSON.stringify(v1));
    if (!r.ok) throw new Error(r.error);
    expect(r.project.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.project.stage.light).toBe(225);
    expect(r.project.layers[0]).toMatchObject({ clip: 'none', waveAmplitude: 0, at: 0.3 });
    expect(r.project.layers[1]).toMatchObject({ clip: 'none', altColors: [], altSizes: [], skipAroundAccent: 0, alternateSides: 0, count: 5 });
  });

  it('keeps unknown layers inside groups, and writes them back unchanged', () => {
    const future = { id: 'f1', name: 'Future', type: 'sparkleField', visible: true, locked: false, opacity: 1, blend: 'source-over', density: 3 };
    const p = { ...createProject(), layers: [{ ...groupLayer([]), children: [future] }] };
    const r = parseProject(JSON.stringify(p));
    if (!r.ok) throw new Error(r.error);
    const g = r.project.layers[0];
    expect(g.type === 'group' && g.children[0]).toMatchObject({ type: 'unsupported', originalType: 'sparkleField' });
    expect(JSON.parse(serializeProject(r.project)).layers[0].children[0]).toEqual(future);
  });

  it('ids must be unique across groups too; bad shape and path values fall back', () => {
    const a = NEW_LAYER.line();
    const r = parseProject({
      ...createProject(),
      layers: [a, { ...groupLayer([{ ...a }]) }, { type: 'shape', shape: 'blob', sides: 99, mirror: 'sideways', place: 'nowhere' }, { type: 'path', points: [{ x: 'a', y: 2, handle: 7 }, 'junk'] }],
    });
    if (!r.ok) throw new Error(r.error);
    const g = r.project.layers[1];
    expect(g.type === 'group' && g.children[0].id).not.toBe(a.id);
    expect(r.project.layers[2]).toMatchObject({ type: 'shape', shape: 'polygon', sides: 24, mirror: 'none', place: 'band' });
    expect(r.project.layers[3]).toMatchObject({ type: 'path', points: [{ x: 0, y: 2, handle: null }] });
  });

  it('a light outside 0–359° is turned back into range', () => {
    const r = parseProject({ ...createProject(), stage: { ...createProject().stage, light: -90 } });
    expect(r.ok && r.project.stage.light).toBe(270);
  });

  it('version 3: texture layers and the ring paint survive a round trip', () => {
    const p = createProject([
      { ...bandFillLayer(), paint: { kind: 'ring', stops: [{ angle: 0, color: '#ff0000' }, { angle: 120, color: '#00ff00' }, { angle: 240, color: '#0000ff' }], followLight: false } },
      ...TEXTURES.map(textureFromPreset),
      { ...textureLayer('scatter'), from: 0.2, to: 0.8, amount: 2, scale: 0.5, strength: 1.5, where: 'lit', seed: 42, color2: null },
    ]);
    const r = roundTrip(p);
    expect(r.project).toEqual(p);
    expect(r.warnings).toEqual([]);
    expect(JSON.parse(serializeProject(p)).schemaVersion).toBe(3);
  });

  it('a version-2 file opens as version 3 unchanged', () => {
    const p = createProject([bandFillLayer()]);
    const v2 = { ...JSON.parse(serializeProject(p)), schemaVersion: 2 };
    const r = parseProject(JSON.stringify(v2));
    if (!r.ok) throw new Error(r.error);
    expect(r.project).toEqual(p);
  });

  it('bad texture and ring values fall back; numbers are kept in range', () => {
    const p = JSON.parse(serializeProject(createProject([bandFillLayer(), textureLayer('wood')])));
    p.layers[0].paint = { kind: 'ring', stops: [{ angle: 400, color: '#ABCDEF' }, { angle: -90, color: 'nope' }] };
    Object.assign(p.layers[1], { kind: 'lava', amount: 99, scale: -1, strength: 'lots', where: 'somewhere', color: 'red', color2: 5, seed: -3 });
    const r = parseProject(p);
    if (!r.ok) throw new Error(r.error);
    const [band, tex] = r.project.layers;
    expect(band.type === 'bandFill' && band.paint).toEqual({ kind: 'ring', stops: [{ angle: 40, color: '#abcdef' }, { angle: 270, color: '#ffffff' }], followLight: true });
    expect(tex).toMatchObject({ type: 'texture', kind: 'marble', amount: 4, scale: 0.1, strength: 1, where: 'shaded', color: textureLayer('marble').color, color2: null, seed: 0 });
  });

  it('a ring paint with fewer than two colours falls back to the default paint', () => {
    const p = JSON.parse(serializeProject(createProject([bandFillLayer()])));
    p.layers[0].paint = { kind: 'ring', stops: [{ angle: 10, color: '#ffffff' }] };
    const r = parseProject(p);
    if (!r.ok) throw new Error(r.error);
    expect(r.project.layers[0].type === 'bandFill' && r.project.layers[0].paint.kind).toBe('lit');
  });
});
