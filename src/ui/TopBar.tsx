// The top bar: project name, New / Open / Save / Export, Undo / Redo, the
// Basic / Advanced switch and Help (the welcome card). On a narrow screen the
// buttons show only their icons; their names are still read out.

import { useEffect, useRef, useState } from 'react';
import { CircleHelp, Download, FilePlus2, FolderOpen, Image as ImageIcon, Redo2, Save, Undo2 } from 'lucide-react';
import {
  clampExportSize,
  EXPORT_SIZES,
  exportPng,
  exportSheet,
  MAX_EXPORT,
  MAX_SHEET_CELL,
  MIN_EXPORT,
  PROJECT_EXTENSION,
  readProjectFile,
  saveProjectFile,
  saveProjectWithPreview,
} from '../io/files';
import { loadProject, redo, renameProject, setMode, undo, useCanRedo, useCanUndo, useProject, useUi, history } from '../state/projectStore';
import { Field, Select, Segmented, Toggle } from './controls';
import { helpFor, hintId } from './help';
import { stageArt } from './stageArt';

type ExportKind = 'png' | 'sheet' | 'project';
const EXPORT_KINDS: { value: ExportKind; label: string }[] = [
  { value: 'png', label: 'Picture (PNG)' },
  { value: 'sheet', label: 'Sheet of every shape (PNG)' },
  { value: 'project', label: 'Project file with a preview' },
];

export function TopBar({ onNew, onHelp, onMessage }: { onNew: () => void; onHelp: () => void; onMessage: (text: string, error?: boolean) => void }) {
  const project = useProject();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const mode = useUi((s) => s.mode);
  const fileInput = useRef<HTMLInputElement>(null);
  const exportButton = useRef<HTMLButtonElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [kind, setKind] = useState<ExportKind>('png');
  const [size, setSize] = useState<string>('1024');
  const [custom, setCustom] = useState('1000');
  const [withArt, setWithArt] = useState(false);
  const px = size === 'custom' ? clampExportSize(Number(custom)) : Number(size);
  const closeExport = () => {
    setExportOpen(false);
    exportButton.current?.focus();
  };
  useEffect(() => {
    if (!exportOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeExport();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exportOpen]);

  return (
    <header className="topbar">
      <div className="brand">
        <img src="/favicon.svg" alt="" width={26} height={26} />
        <span>Frame Studio</span>
      </div>
      <input className="project-name" aria-label="Project name" key={project.name} defaultValue={project.name} onBlur={(e) => e.target.value !== project.name && renameProject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
      <nav className="actions" aria-label="Project">
        <button type="button" className="btn" onClick={onNew} title="Start a new design from a template or a blank page">
          <FilePlus2 size={18} aria-hidden="true" /> <span className="btn-label">New</span>
        </button>
        <button type="button" className="btn" onClick={() => fileInput.current?.click()} title={`Open a ${PROJECT_EXTENSION} project file`}>
          <FolderOpen size={18} aria-hidden="true" /> <span className="btn-label">Open</span>
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
          <Save size={18} aria-hidden="true" /> <span className="btn-label">Save</span>
        </button>
        <div className="popover-anchor">
          <button
            ref={exportButton}
            type="button"
            className="btn primary"
            aria-expanded={exportOpen}
            aria-haspopup="dialog"
            title="Download a picture of the design, a sheet of it on every shape, or the project file with a preview"
            onClick={() => setExportOpen((o) => !o)}
          >
            <ImageIcon size={18} aria-hidden="true" /> <span className="btn-label">Export</span>
          </button>
          {exportOpen && (
            <div className="popover" role="dialog" aria-label="Export">
              <Select label="Export as" value={kind} options={EXPORT_KINDS} onChange={setKind} />
              {kind !== 'project' && (
                <>
                  <Select
                    label="Picture size"
                    hint={kind === 'sheet' ? `How big each shape is on the sheet (at most ${MAX_SHEET_CELL} px).` : undefined}
                    value={size}
                    options={[...EXPORT_SIZES.map((s) => ({ value: String(s), label: `${s} × ${s} px` })), { value: 'custom', label: 'Another size…' }]}
                    onChange={setSize}
                  />
                  {size === 'custom' && (
                    <Field label="Size in pixels" htmlFor="export-size">
                      <input
                        id="export-size"
                        className="wide-text"
                        type="number"
                        min={MIN_EXPORT}
                        max={MAX_EXPORT}
                        step={1}
                        value={custom}
                        aria-describedby={helpFor('Size in pixels') ? hintId('export-size') : undefined}
                        onChange={(e) => setCustom(e.target.value)}
                        onBlur={() => setCustom(String(clampExportSize(Number(custom))))}
                      />
                    </Field>
                  )}
                  <Toggle label="Include the sample picture" checked={withArt} onChange={setWithArt} />
                </>
              )}
              <p className="note">
                {kind === 'png' && `A ${px} × ${px} px picture. ${withArt ? '' : 'The middle and the corners are see-through.'}`}
                {kind === 'sheet' && `The design on all five token shapes, side by side, each ${Math.min(px, MAX_SHEET_CELL)} px.`}
                {kind === 'project' && `The ${PROJECT_EXTENSION} file, with a small picture of the design in it, for Token Maker's frame list.`}
              </p>
              <button
                type="button"
                className="btn primary"
                onClick={async () => {
                  const p = history.getState().present;
                  const art = withArt ? stageArt() : null;
                  try {
                    if (kind === 'png') await exportPng(p, px, art);
                    else if (kind === 'sheet') await exportSheet(p, px, art);
                    else saveProjectWithPreview(p);
                    closeExport();
                  } catch (err) {
                    onMessage(String((err as Error).message), true);
                  }
                }}
              >
                <Download size={18} aria-hidden="true" /> Download
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
      <button type="button" className="icon-btn" aria-label="Help" title="Show the welcome card with tips again" onClick={onHelp}>
        <CircleHelp size={18} />
      </button>
    </header>
  );
}
