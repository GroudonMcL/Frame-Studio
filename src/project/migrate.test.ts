import { FRAME_PRESETS } from '../engine/legacy/catalog';
import { createProject, LAYERED_TEMPLATES, NEW_LAYER, projectFromFrame } from './defaults';
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
});
