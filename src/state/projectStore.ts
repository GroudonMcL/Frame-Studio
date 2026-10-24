// The open project, its undo history and every edit the editor can make.
// Components call these actions; none of them touch the project directly.

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { createProject, newId, NEW_LAYER } from '../project/defaults';
import type { EditableLayerType, FrameProject, Layer, StageSettings } from '../project/types';
import { createHistoryStore } from './history';

export const history = createHistoryStore<FrameProject>(createProject());

interface UiState {
  selectedId: string | null;
  /** Basic hides the Advanced sections; Advanced shows them and the project data view. */
  mode: 'basic' | 'advanced';
}

export const ui = createStore<UiState>(() => ({ selectedId: null, mode: 'basic' }));

export const useProject = () => useStore(history, (s) => s.present);
export const useCanUndo = () => useStore(history, (s) => s.past.length > 0 || s.pendingBase !== null);
export const useCanRedo = () => useStore(history, (s) => s.future.length > 0);
export const useUi = <T>(pick: (s: UiState) => T) => useStore(ui, pick);

const get = () => history.getState().present;

export interface EditOptions {
  /** Part of a drag: shown at once, recorded as one undo step by commit(). */
  transient?: boolean;
}

function update(fn: (p: FrameProject) => FrameProject, opts?: EditOptions): void {
  history.getState().set(fn(get()), opts);
}

function mapLayer(id: string, fn: (l: Layer) => Layer): (p: FrameProject) => FrameProject {
  return (p) => ({ ...p, layers: p.layers.map((l) => (l.id === id ? fn(l) : l)) });
}

export const select = (id: string | null) => ui.setState({ selectedId: id });
export const setMode = (mode: UiState['mode']) => ui.setState({ mode });
export const commit = () => history.getState().commit();
export const undo = () => history.getState().undo();
export const redo = () => history.getState().redo();

export function selectedLayer(): Layer | undefined {
  const id = ui.getState().selectedId;
  return get().layers.find((l) => l.id === id);
}

/** Replaces the open project (new, open, template): a fresh undo history. */
export function loadProject(project: FrameProject): void {
  history.getState().reset(project);
  select(project.layers.at(-1)?.id ?? null);
}

export function newProject(): void {
  loadProject(createProject());
}

/** Adds a layer just above the selected one (or on top), and selects it. */
export function addLayer(layerOrType: Layer | EditableLayerType): Layer {
  const layer = typeof layerOrType === 'string' ? NEW_LAYER[layerOrType]() : layerOrType;
  const sel = get().layers.findIndex((l) => l.id === ui.getState().selectedId);
  update((p) => {
    const layers = [...p.layers];
    layers.splice(sel >= 0 ? sel + 1 : layers.length, 0, layer);
    return { ...p, layers };
  });
  select(layer.id);
  return layer;
}

/** Changes a layer's settings. Locked layers can't be changed, except to unlock or show/hide them. */
export function updateLayer(id: string, patch: Partial<Layer>, opts?: EditOptions): void {
  const layer = get().layers.find((l) => l.id === id);
  if (!layer) return;
  const onlyLockOrVisibility = Object.keys(patch).every((k) => k === 'locked' || k === 'visible');
  if (layer.locked && !onlyLockOrVisibility) return;
  update(mapLayer(id, (l) => ({ ...l, ...patch }) as Layer), opts);
}

export const renameLayer = (id: string, name: string) => updateLayer(id, { name: name.trim() || 'Layer' });
export const toggleVisible = (id: string) => updateLayer(id, { visible: !get().layers.find((l) => l.id === id)?.visible });
export const toggleLocked = (id: string) => updateLayer(id, { locked: !get().layers.find((l) => l.id === id)?.locked });

export function duplicateLayer(id: string): void {
  const i = get().layers.findIndex((l) => l.id === id);
  if (i < 0) return;
  const original = get().layers[i];
  const copy = { ...structuredClone(original), id: newId(), name: `${original.name} copy`, locked: false };
  update((p) => {
    const layers = [...p.layers];
    layers.splice(i + 1, 0, copy);
    return { ...p, layers };
  });
  select(copy.id);
}

export function deleteLayer(id: string): void {
  const layers = get().layers;
  const i = layers.findIndex((l) => l.id === id);
  if (i < 0) return;
  update((p) => ({ ...p, layers: p.layers.filter((l) => l.id !== id) }));
  if (ui.getState().selectedId === id) select(layers[i - 1]?.id ?? layers[i + 1]?.id ?? null);
}

/** Moves a layer up (towards the top of the stack, drawn later) or down. */
export function moveLayer(id: string, direction: 'up' | 'down'): void {
  const i = get().layers.findIndex((l) => l.id === id);
  const j = direction === 'up' ? i + 1 : i - 1;
  if (i < 0 || j < 0 || j >= get().layers.length) return;
  update((p) => {
    const layers = [...p.layers];
    [layers[i], layers[j]] = [layers[j], layers[i]];
    return { ...p, layers };
  });
}

/** Moves a layer to a stack index (0 = bottom), for drag-and-drop in the layer list. */
export function moveLayerTo(id: string, index: number): void {
  const layers = [...get().layers];
  const i = layers.findIndex((l) => l.id === id);
  if (i < 0) return;
  const [layer] = layers.splice(i, 1);
  layers.splice(Math.max(0, Math.min(layers.length, index)), 0, layer);
  if (layers.every((l, k) => l === get().layers[k])) return;
  update((p) => ({ ...p, layers }));
}

export function updateStage(patch: Partial<StageSettings>, opts?: EditOptions): void {
  update((p) => ({ ...p, stage: { ...p.stage, ...patch } }), opts);
}

export function renameProject(name: string): void {
  update((p) => ({ ...p, name: name.trim() || 'Untitled frame' }));
}
