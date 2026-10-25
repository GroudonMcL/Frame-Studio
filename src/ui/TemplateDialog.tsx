// Picking a starting point: designs built from editable layers, Token Maker
// frames converted into editable layers, the 27 Token Maker frames as their
// original code draws them (one composite layer each), or a blank project.
// The same dialog adds a Token Maker frame to the open project, as editable
// layers (a group) or as the original.

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { FRAME_GROUPS, FRAME_PRESETS } from '../engine/legacy/catalog';
import { canConvert, differenceNote, editableGroup, editableProject } from '../project/convert';
import { createProject, LAYERED_TEMPLATES, legacyFrameLayer, projectFromFrame } from '../project/defaults';
import { THEMED_TEMPLATES, themedProject } from '../project/themedTemplates';
import { addLayer, loadProject } from '../state/projectStore';
import { THUMB, Tile } from './Thumbnail';

const frameMakers = new Map(FRAME_PRESETS.map((p) => [p.id, () => projectFromFrame(p.id)]));
const editableMakers = new Map(FRAME_PRESETS.filter((p) => canConvert(p.style)).map((p) => [p.id, () => editableProject(p.id)!]));
const layeredMakers = new Map(LAYERED_TEMPLATES.map((t) => [t.id, () => createProject(t.make(), t.name)]));

const editableNote = (style: (typeof FRAME_PRESETS)[number]['style']) => `Editable layers drawn to look like the Token Maker frame. ${differenceNote(style)}`.trim();

export function TemplateDialog({ mode, onClose }: { mode: 'new' | 'addFrame'; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);

  const pickFrame = (presetId: string) => {
    if (mode === 'new') loadProject(projectFromFrame(presetId));
    else addLayer(legacyFrameLayer(presetId));
    onClose();
  };
  const pickEditable = (presetId: string) => {
    if (mode === 'new') loadProject(editableProject(presetId)!);
    else addLayer(editableGroup(presetId)!);
    onClose();
  };

  return (
    <dialog ref={ref} className="dialog templates" aria-label={mode === 'new' ? 'New project' : 'Add a Token Maker frame'} onClose={onClose} onCancel={onClose}>
      <div className="dialog-head">
        <h2>{mode === 'new' ? 'Start a new frame' : 'Add a Token Maker frame'}</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="dialog-body">
        {mode === 'new' && (
          <>
            <h3>Built from editable layers</h3>
            <p className="note">Every part of these can be changed: colours, positions, how many beads…</p>
            <div className="tiles">
              <button
                type="button"
                className="tile"
                onClick={() => {
                  loadProject(createProject());
                  onClose();
                }}
              >
                <span className="tile-placeholder blank" style={{ width: THUMB, height: THUMB }}>
                  Blank
                </span>
                <span>Blank project</span>
              </button>
              {LAYERED_TEMPLATES.map((t) => (
                <Tile
                  key={t.id}
                  id={`layered:${t.id}`}
                  name={t.name}
                  description={t.description}
                  make={layeredMakers.get(t.id)!}
                  onPick={() => {
                    loadProject(createProject(t.make(), t.name));
                    onClose();
                  }}
                />
              ))}
            </div>
            <section aria-label="Themed borders">
              <h3>Themed borders</h3>
              <p className="note">Ready-made borders in popular styles (metal and enamel, wreaths, gothic, elemental, clockwork, knotwork…), every part editable. A few come with their own lighting (Lighting… over the canvas).</p>
              <div className="tiles">
                {THEMED_TEMPLATES.map((t) => (
                  <Tile
                    key={t.id}
                    id={`themed:${t.id}`}
                    name={t.name}
                    description={t.description}
                    make={() => themedProject(t)}
                    onPick={() => {
                      loadProject(themedProject(t));
                      onClose();
                    }}
                  />
                ))}
              </div>
            </section>
          </>
        )}
        <section aria-label="Token Maker frames as editable layers">
          <h3>Token Maker frames, as editable layers</h3>
          <p className="note">
            These frames are rebuilt from layers you can change one by one, and they follow the light. They look like the originals; hover over a frame to see
            any small difference.{mode === 'addFrame' ? ' They are added as a group.' : ''}
          </p>
          <div className="tiles">
            {FRAME_PRESETS.filter((p) => canConvert(p.style)).map((p) => (
              <Tile key={p.id} id={`editable:${p.id}`} name={p.name} badge="Editable" description={editableNote(p.style)} make={editableMakers.get(p.id)!} onPick={() => pickEditable(p.id)} />
            ))}
          </div>
        </section>
        <h3>Token Maker frames, as the originals</h3>
        <p className="note">
          All 27 frames, drawn by Token Maker's own code. Each is one layer: you can change its colour and add layers over or under it. Frames marked Editable above can
          also be turned into layers later, from their Properties.
        </p>
        {FRAME_GROUPS.map((group) => (
          <section key={group} aria-label={group}>
            <h4>{group}</h4>
            <div className="tiles">
              {FRAME_PRESETS.filter((p) => p.group === group).map((p) => (
                <Tile key={p.id} id={`frame:${p.id}`} name={p.name} make={frameMakers.get(p.id)!} onPick={() => pickFrame(p.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </dialog>
  );
}
