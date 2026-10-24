// The layer list: top of the stack first, like Photoshop. Pick, rename (double
// click or F2), show/hide, lock, reorder (buttons, Alt+arrows or drag),
// duplicate and delete.

import { useState, type DragEvent } from 'react';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Lock, LockOpen, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { LAYER_TYPE_NAMES } from '../project/defaults';
import type { EditableLayerType, Layer } from '../project/types';
import { addLayer, deleteLayer, duplicateLayer, moveLayer, moveLayerTo, renameLayer, select, toggleLocked, toggleVisible, useProject, useUi } from '../state/projectStore';

const ADDABLE: { type: EditableLayerType; hint: string }[] = [
  { type: 'bandFill', hint: 'Colour all or part of the band: flat, metal or a gradient.' },
  { type: 'line', hint: 'A line running round the band: rims, grooves, glowing lines.' },
  { type: 'repeat', hint: 'One shape repeated round the band: beads, studs, gems, runes, leaves.' },
];

export function LayersPanel({ onAddFrame }: { onAddFrame: () => void }) {
  const project = useProject();
  const selectedId = useUi((s) => s.selectedId);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const selected = project.layers.find((l) => l.id === selectedId);
  const topFirst = [...project.layers].reverse();

  const onDrop = (e: DragEvent, target: Layer) => {
    e.preventDefault();
    if (dragId && dragId !== target.id) moveLayerTo(dragId, project.layers.findIndex((l) => l.id === target.id));
    setDragId(null);
  };

  return (
    <aside className="panel layers" aria-label="Layers">
      <div className="panel-head">
        <h2 className="panel-title">Layers</h2>
        <div className="add-menu">
          <button type="button" className="btn small primary" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            <Plus size={16} /> Add layer
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              {ADDABLE.map(({ type, hint }) => (
                <button
                  key={type}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    addLayer(type);
                    setMenuOpen(false);
                  }}
                >
                  <strong>{LAYER_TYPE_NAMES[type]}</strong>
                  <span>{hint}</span>
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onAddFrame();
                }}
              >
                <strong>Token Maker frame…</strong>
                <span>Add one of the 27 existing frames as a layer.</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {topFirst.length === 0 ? (
        <p className="muted">No layers yet. Add one, or start from a template with New.</p>
      ) : (
        <ul className="layer-list" role="listbox" aria-label="Layers, top first">
          {topFirst.map((layer) => {
            const isSel = layer.id === selectedId;
            return (
              <li
                key={layer.id}
                role="option"
                aria-selected={isSel}
                tabIndex={isSel ? 0 : -1}
                className={`layer-row${isSel ? ' selected' : ''}${layer.visible ? '' : ' hidden-layer'}${dragId === layer.id ? ' dragging' : ''}`}
                draggable={renaming !== layer.id}
                onDragStart={() => setDragId(layer.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, layer)}
                onDragEnd={() => setDragId(null)}
                onClick={() => select(layer.id)}
                onDoubleClick={() => setRenaming(layer.id)}
                onKeyDown={(e) => {
                  if (renaming) return;
                  if (e.key === 'F2') setRenaming(layer.id);
                  if (e.altKey && e.key === 'ArrowUp') moveLayer(layer.id, 'up');
                  if (e.altKey && e.key === 'ArrowDown') moveLayer(layer.id, 'down');
                }}
              >
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                  aria-pressed={!layer.visible}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisible(layer.id);
                  }}
                >
                  {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                {renaming === layer.id ? (
                  <input
                    className="rename"
                    aria-label="Layer name"
                    autoFocus
                    defaultValue={layer.name}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      renameLayer(layer.id, e.target.value);
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                  />
                ) : (
                  <span className="layer-name">
                    {layer.name}
                    <small>{LAYER_TYPE_NAMES[layer.type]}</small>
                  </span>
                )}
                {layer.type === 'unsupported' && <TriangleAlert size={16} aria-label="Can't be drawn by this version" />}
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
                  aria-pressed={layer.locked}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLocked(layer.id);
                  }}
                >
                  {layer.locked ? <Lock size={16} /> : <LockOpen size={16} className="faint" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <div className="layer-actions" aria-label="Selected layer">
          <button type="button" className="icon-btn" aria-label="Move up" title="Move up (Alt+↑)" disabled={project.layers.at(-1)?.id === selected.id} onClick={() => moveLayer(selected.id, 'up')}>
            <ArrowUp size={18} />
          </button>
          <button type="button" className="icon-btn" aria-label="Move down" title="Move down (Alt+↓)" disabled={project.layers[0]?.id === selected.id} onClick={() => moveLayer(selected.id, 'down')}>
            <ArrowDown size={18} />
          </button>
          <button type="button" className="icon-btn" aria-label="Rename" title="Rename (F2)" onClick={() => setRenaming(selected.id)}>
            Aa
          </button>
          <button type="button" className="icon-btn" aria-label="Duplicate" title="Duplicate (Ctrl+D)" onClick={() => duplicateLayer(selected.id)}>
            <Copy size={18} />
          </button>
          <button type="button" className="icon-btn danger" aria-label="Delete" title="Delete (Del)" onClick={() => deleteLayer(selected.id)}>
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}
