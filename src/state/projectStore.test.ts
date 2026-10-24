import { createProject, NEW_LAYER } from '../project/defaults';
import type { Layer } from '../project/types';
import {
  addLayer,
  commit,
  deleteLayer,
  duplicateLayer,
  history,
  loadProject,
  moveLayer,
  moveLayerTo,
  redo,
  renameLayer,
  toggleLocked,
  toggleVisible,
  ui,
  undo,
  updateLayer,
} from './projectStore';

const layers = () => history.getState().present.layers;
const names = () => layers().map((l) => l.name);
const named = (name: string): Layer => ({ ...NEW_LAYER.line(), name });

beforeEach(() => loadProject(createProject([named('A'), named('B'), named('C')])));

describe('project store', () => {
  it('adds a layer above the selected one and selects it', () => {
    ui.setState({ selectedId: layers()[0].id });
    const added = addLayer('repeat');
    expect(layers()[1].id).toBe(added.id);
    expect(ui.getState().selectedId).toBe(added.id);
  });

  it('renames, hides and locks', () => {
    const id = layers()[0].id;
    renameLayer(id, '  Rim ');
    toggleVisible(id);
    toggleLocked(id);
    expect(layers()[0]).toMatchObject({ name: 'Rim', visible: false, locked: true });
  });

  it('locked layers ignore edits but can still be shown, hidden and unlocked', () => {
    const id = layers()[0].id;
    toggleLocked(id);
    updateLayer(id, { name: 'Changed' });
    expect(layers()[0].name).toBe('A');
    toggleVisible(id);
    expect(layers()[0].visible).toBe(false);
    toggleLocked(id);
    expect(layers()[0].locked).toBe(false);
  });

  it('reorders', () => {
    moveLayer(layers()[0].id, 'up');
    expect(names()).toEqual(['B', 'A', 'C']);
    moveLayer(layers()[2].id, 'up');
    expect(names()).toEqual(['B', 'A', 'C']);
    moveLayerTo(layers()[2].id, 0);
    expect(names()).toEqual(['C', 'B', 'A']);
  });

  it('duplicates with a new id, right above the original', () => {
    const original = layers()[1];
    duplicateLayer(original.id);
    expect(names()).toEqual(['A', 'B', 'B copy', 'C']);
    expect(layers()[2].id).not.toBe(original.id);
    expect({ ...layers()[2], id: '', name: '' }).toEqual({ ...original, id: '', name: '' });
  });

  it('deletes and selects a neighbour', () => {
    ui.setState({ selectedId: layers()[1].id });
    deleteLayer(layers()[1].id);
    expect(names()).toEqual(['A', 'C']);
    expect(ui.getState().selectedId).toBe(layers()[0].id);
  });

  it('undo and redo step through structured project states', () => {
    const before = history.getState().present;
    deleteLayer(layers()[0].id);
    addLayer('bandFill');
    undo();
    undo();
    expect(history.getState().present).toBe(before);
    redo();
    expect(names()).toEqual(['B', 'C']);
  });

  it('a slider drag is one undo step', () => {
    const id = layers()[0].id;
    for (const at of [0.1, 0.2, 0.3]) updateLayer(id, { at } as Partial<Layer>, { transient: true });
    commit();
    expect(history.getState().past).toHaveLength(1);
    undo();
    expect((layers()[0] as { at: number }).at).toBe(0.5);
  });

  it('loading a project starts a fresh history', () => {
    addLayer('line');
    loadProject(createProject());
    expect(history.getState().past).toHaveLength(0);
  });
});
