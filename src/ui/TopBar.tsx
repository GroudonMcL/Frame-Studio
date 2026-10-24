// The top bar: project name, New / Open / Save / Export, Undo / Redo and the
// Basic / Advanced switch.

import { useRef, useState } from 'react';
import { Download, FilePlus2, FolderOpen, Image as ImageIcon, Redo2, Save, Undo2 } from 'lucide-react';
import { EXPORT_SIZES, exportPng, readProjectFile, saveProjectFile, PROJECT_EXTENSION } from '../io/files';
import { loadProject, redo, renameProject, setMode, undo, useCanRedo, useCanUndo, useProject, useUi, history } from '../state/projectStore';
import { Segmented, Select, Toggle } from './controls';
import { stageArt } from './stageArt';

export function TopBar({ onNew, onMessage }: { onNew: () => void; onMessage: (text: string, error?: boolean) => void }) {
  const project = useProject();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const mode = useUi((s) => s.mode);
  const fileInput = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [size, setSize] = useState<string>('1024');
  const [withArt, setWithArt] = useState(false);

  return (
    <header className="topbar">
      <div className="brand">
        <img src="/favicon.svg" alt="" width={26} height={26} />
        <span>Frame Studio</span>
      </div>
      <input className="project-name" aria-label="Project name" key={project.name} defaultValue={project.name} onBlur={(e) => e.target.value !== project.name && renameProject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
      <nav className="actions" aria-label="Project">
        <button type="button" className="btn" onClick={onNew}>
          <FilePlus2 size={18} /> New
        </button>
        <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
          <FolderOpen size={18} /> Open
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={`${PROJECT_EXTENSION},.json,application/json`}
          hidden
          data-testid="open-file"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            const result = await readProjectFile(file);
            if (!result.ok) return onMessage(result.error, true);
            loadProject(result.project);
            onMessage(result.warnings.length ? `Opened "${result.project.name}". ${result.warnings.join(' ')}` : `Opened "${result.project.name}".`);
          }}
        />
        <button type="button" className="btn" onClick={() => saveProjectFile(history.getState().present)} title={`Download the project as a ${PROJECT_EXTENSION} file you can open again`}>
          <Save size={18} /> Save
        </button>
        <div className="popover-anchor">
          <button type="button" className="btn primary" aria-expanded={exportOpen} onClick={() => setExportOpen((o) => !o)}>
            <ImageIcon size={18} /> Export PNG
          </button>
          {exportOpen && (
            <div className="popover" role="dialog" aria-label="Export PNG">
              <Select label="Size" value={size} options={EXPORT_SIZES.map((s) => ({ value: String(s), label: `${s} × ${s} px` }))} onChange={setSize} />
              <Toggle label="Include the sample picture" checked={withArt} onChange={setWithArt} />
              <p className="note">Without it the middle is see-through, ready to put a picture behind.</p>
              <button
                type="button"
                className="btn primary"
                onClick={async () => {
                  try {
                    await exportPng(history.getState().present, Number(size), withArt ? stageArt() : null);
                    setExportOpen(false);
                  } catch (err) {
                    onMessage(String((err as Error).message), true);
                  }
                }}
              >
                <Download size={18} /> Download
              </button>
            </div>
          )}
        </div>
      </nav>
      <div className="history" aria-label="History">
        <button type="button" className="icon-btn" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
          <Undo2 size={18} />
        </button>
        <button type="button" className="icon-btn" aria-label="Redo" title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={redo}>
          <Redo2 size={18} />
        </button>
      </div>
      <Segmented
        label="Menu style"
        value={mode}
        options={[
          { value: 'basic', label: 'Basic' },
          { value: 'advanced', label: 'Advanced' },
        ]}
        onChange={setMode}
      />
    </header>
  );
}
