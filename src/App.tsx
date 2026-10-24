import { useEffect, useState } from 'react';
import { loadAutosave, startAutosave } from './state/autosave';
import { findLayer, isLocked } from './project/tree';
import { deleteLayer, duplicateLayer, groupSelected, loadProject, redo, ui, undo, ungroup, history } from './state/projectStore';
import { projectFromFrame } from './project/defaults';
import { LayersPanel } from './ui/LayersPanel';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { pathEditKey } from './ui/pathKeys';
import { Stage } from './ui/Stage';
import { TemplateDialog } from './ui/TemplateDialog';
import { TextureDialog } from './ui/TextureDialog';
import { TopBar } from './ui/TopBar';

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function App() {
  const [ready, setReady] = useState(false);
  const [dialog, setDialog] = useState<'new' | 'addFrame' | 'texture' | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Pick up where the last visit left off; a first visit starts with Stamped.
  useEffect(() => {
    let stop = () => {};
    void loadAutosave().then((saved) => {
      loadProject(saved ?? projectFromFrame('stamped'));
      stop = startAutosave();
      setReady(true);
    });
    return () => stop();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !isTyping(e.target)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y' && !isTyping(e.target)) {
        e.preventDefault();
        redo();
      } else if (!isTyping(e.target) && pathEditKey(e)) {
        e.preventDefault();
      } else if (!isTyping(e.target) && ui.getState().selectedId) {
        const id = ui.getState().selectedId!;
        const layers = history.getState().present.layers;
        const layer = findLayer(layers, id);
        if (mod && e.key.toLowerCase() === 'g') {
          e.preventDefault();
          if (e.shiftKey) ungroup(id);
          else groupSelected();
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && layer && !isLocked(layers, id)) {
          e.preventDefault();
          deleteLayer(id);
        } else if (mod && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          duplicateLayer(id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), message.error ? 9000 : 5000);
    return () => clearTimeout(id);
  }, [message]);

  if (!ready) return <div className="loading">Loading Frame Studio…</div>;

  return (
    <div className="app">
      <TopBar onNew={() => setDialog('new')} onMessage={(text, error = false) => setMessage({ text, error })} />
      <main className="workspace">
        <LayersPanel onAddFrame={() => setDialog('addFrame')} onAddTexture={() => setDialog('texture')} />
        <Stage />
        <PropertiesPanel />
      </main>
      {message && (
        <div className={`toast${message.error ? ' error' : ''}`} role={message.error ? 'alert' : 'status'}>
          {message.text}
        </div>
      )}
      {dialog === 'texture' && <TextureDialog onClose={() => setDialog(null)} />}
      {(dialog === 'new' || dialog === 'addFrame') && <TemplateDialog mode={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
