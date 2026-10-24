// Picking a starting point: the 27 Token Maker frames (as one composite layer
// each), designs built from editable layers, or a blank project. The same
// dialog adds a Token Maker frame as a layer to the open project.

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { FRAME_GROUPS, FRAME_PRESETS } from '../engine/legacy/catalog';
import { createProject, LAYERED_TEMPLATES, legacyFrameLayer, projectFromFrame } from '../project/defaults';
import type { FrameProject } from '../project/types';
import { renderProject } from '../render/renderProject';
import { addLayer, history, loadProject } from '../state/projectStore';
import { stageArt } from './stageArt';

const THUMB = 112;
const thumbs = new Map<string, string>();

/** A picture of a project, drawn by the real renderer, cached by key. */
function useThumbnail(key: string, make: () => FrameProject): string | null {
  const [url, setUrl] = useState(() => thumbs.get(key) ?? null);
  useEffect(() => {
    if (url) return;
    // Spread the work out so the dialog opens at once.
    const id = setTimeout(() => {
      const c = document.createElement('canvas');
      c.width = c.height = THUMB * 2;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const project = make();
      project.stage.shape = history.getState().present.stage.shape;
      renderProject(ctx, project, THUMB * 2, { art: stageArt() });
      const data = c.toDataURL('image/png');
      thumbs.set(key, data);
      setUrl(data);
    }, 0);
    return () => clearTimeout(id);
  }, [key, make, url]);
  return url;
}

function Tile({ id, name, description, make, onPick }: { id: string; name: string; description?: string; make: () => FrameProject; onPick: () => void }) {
  const url = useThumbnail(`${id}|${history.getState().present.stage.shape}`, make);
  return (
    <button type="button" className="tile" onClick={onPick} title={description}>
      {url ? <img src={url} alt="" width={THUMB} height={THUMB} /> : <span className="tile-placeholder" style={{ width: THUMB, height: THUMB }} />}
      <span>{name}</span>
    </button>
  );
}

const frameMakers = new Map(FRAME_PRESETS.map((p) => [p.id, () => projectFromFrame(p.id)]));
const layeredMakers = new Map(LAYERED_TEMPLATES.map((t) => [t.id, () => createProject(t.make(), t.name)]));

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

  return (
    <dialog ref={ref} className="dialog templates" aria-label={mode === 'new' ? 'New project' : 'Add a Token Maker frame'} onClose={onClose} onCancel={onClose}>
      <div className="dialog-head">
        <h2>{mode === 'new' ? 'Start a new frame' : 'Add a Token Maker frame as a layer'}</h2>
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
          </>
        )}
        <h3>Token Maker frames</h3>
        <p className="note">The 27 frames from Token Maker, drawn by their own code. Each is one layer: you can change its colour and add layers over or under it.</p>
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
