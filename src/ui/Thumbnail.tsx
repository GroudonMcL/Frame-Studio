// A tile with a picture of a project drawn by the real renderer (template
// and texture libraries). Pictures are made one at a time, after the dialog
// opens, and kept for the session.

import { useEffect, useState } from 'react';
import type { FrameProject } from '../project/types';
import { renderProject } from '../render/renderProject';
import { history } from '../state/projectStore';
import { stageArt } from './stageArt';

export const THUMB = 112;
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
      renderProject(ctx, project, THUMB * 2, { art: project.stage.showArt ? stageArt() : null });
      const data = c.toDataURL('image/png');
      thumbs.set(key, data);
      setUrl(data);
    }, 0);
    return () => clearTimeout(id);
  }, [key, make, url]);
  return url;
}

export function Tile({ id, name, description, badge, make, onPick }: { id: string; name: string; description?: string; badge?: string; make: () => FrameProject; onPick: () => void }) {
  const url = useThumbnail(`${id}|${history.getState().present.stage.shape}`, make);
  return (
    <button type="button" className="tile" onClick={onPick} title={description}>
      {url ? <img src={url} alt="" width={THUMB} height={THUMB} /> : <span className="tile-placeholder" style={{ width: THUMB, height: THUMB }} />}
      <span>{name}</span>
      {/* Named "Paladin Editable": the visible words, in reading order. */}
      {badge && ' '}
      {badge && <span className="tile-badge">{badge}</span>}
    </button>
  );
}

