// Saving and opening project files, and exporting pictures. The PNG comes
// from renderProject, the same renderer as the preview.

import { parseProject, serializeProject, type ParseResult } from '../project/migrate';
import type { FrameProject } from '../project/types';
import type { RenderSource } from '../engine/legacy/render';
import { renderProject } from '../render/renderProject';

export const PROJECT_EXTENSION = '.framestudio.json';
export const EXPORT_SIZES = [256, 512, 1024, 2048] as const;

/** A safe file name from the project's name. */
export function fileNameFor(name: string, extension: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 _-]+/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return (base || 'frame') + extension;
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function saveProjectFile(project: FrameProject): void {
  download(new Blob([serializeProject(project)], { type: 'application/json' }), fileNameFor(project.name, PROJECT_EXTENSION));
}

export async function readProjectFile(file: File): Promise<ParseResult> {
  if (file.size > 5_000_000) return { ok: false, error: 'That file is too big to be a Frame Studio project.' };
  return parseProject(await file.text());
}

/** Draws the project at `size` px. `art` adds the sample picture (off by default: a see-through frame). */
export function renderToCanvas(project: FrameProject, size: number, art: RenderSource | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw pictures.');
  renderProject(ctx, { ...project, stage: { ...project.stage, showArt: !!art } }, size, { art });
  return canvas;
}

export async function exportPng(project: FrameProject, size: number, art: RenderSource | null): Promise<void> {
  const canvas = renderToCanvas(project, size, art);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The picture could not be made.');
  download(blob, fileNameFor(project.name, '.png'));
}
