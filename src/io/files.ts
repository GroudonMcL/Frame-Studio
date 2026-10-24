// Saving and opening project and library files, and exporting pictures. Every
// picture comes from renderProject, the same renderer as the preview.

import { SHAPES } from '../engine/legacy/catalog';
import type { RenderSource } from '../engine/legacy/render';
import { parseProject, serializeProject, type ParseResult } from '../project/migrate';
import { LIBRARY_EXTENSION, PROJECT_EXTENSION, serializeLibrary, type LayerSet } from '../project/transfer';
import type { FrameProject } from '../project/types';
import { renderProject } from '../render/renderProject';

export { LIBRARY_EXTENSION, PROJECT_EXTENSION };
export const EXPORT_SIZES = [256, 512, 1024, 2048] as const;
/** Any size between these can be typed in. */
export const MIN_EXPORT = 16;
export const MAX_EXPORT = 4096;
/** Each picture on a sheet of every shape is at most this big, so the sheet stays a sensible size. */
export const MAX_SHEET_CELL = 1024;
/** The preview picture saved in a project file. */
export const PREVIEW_SIZE = 256;

export const clampExportSize = (n: number) => Math.round(Math.min(MAX_EXPORT, Math.max(MIN_EXPORT, Number.isFinite(n) ? n : 1024)));

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

/** The project file with a small see-through picture of the design in it, for apps that list designs (Token Maker). */
export function saveProjectWithPreview(project: FrameProject): void {
  const preview = renderToCanvas(project, PREVIEW_SIZE, null).toDataURL('image/png');
  download(new Blob([serializeProject(project, { preview })], { type: 'application/json' }), fileNameFor(project.name, PROJECT_EXTENSION));
}

export async function readProjectFile(file: File): Promise<ParseResult> {
  if (file.size > 5_000_000) return { ok: false, error: 'That file is too big to be a Frame Studio project.' };
  return parseProject(await file.text());
}

export function saveLibraryFile(sets: LayerSet[], name: string): void {
  download(new Blob([serializeLibrary(sets)], { type: 'application/json' }), fileNameFor(name, LIBRARY_EXTENSION));
}

export async function readTextFile(file: File, limit = 20_000_000): Promise<string | null> {
  return file.size > limit ? null : file.text();
}

function canvasOf(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw pictures.');
  return { canvas, ctx };
}

/** Draws the project at `size` px. `art` adds the sample picture (off by default: a see-through frame). */
export function renderToCanvas(project: FrameProject, size: number, art: RenderSource | null): HTMLCanvasElement {
  const { canvas, ctx } = canvasOf(size, size);
  renderProject(ctx, { ...project, stage: { ...project.stage, showArt: !!art } }, size, { art });
  return canvas;
}

/** The design on every token shape, side by side (circle first), each `cell` px, on a see-through sheet. */
export function renderSheet(project: FrameProject, cell: number, art: RenderSource | null): HTMLCanvasElement {
  const gap = Math.round(cell / 16);
  const { canvas, ctx } = canvasOf(SHAPES.length * cell + (SHAPES.length - 1) * gap, cell);
  SHAPES.forEach((s, i) => {
    ctx.save();
    ctx.translate(i * (cell + gap), 0);
    renderProject(ctx, { ...project, stage: { ...project.stage, shape: s.id, showArt: !!art } }, cell, { art });
    ctx.restore();
  });
  return canvas;
}

async function downloadCanvas(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The picture could not be made.');
  download(blob, name);
}

export async function exportPng(project: FrameProject, size: number, art: RenderSource | null): Promise<void> {
  await downloadCanvas(renderToCanvas(project, clampExportSize(size), art), fileNameFor(project.name, '.png'));
}

export async function exportSheet(project: FrameProject, cell: number, art: RenderSource | null): Promise<void> {
  await downloadCanvas(renderSheet(project, Math.min(MAX_SHEET_CELL, clampExportSize(cell)), art), fileNameFor(`${project.name} every shape`, '.png'));
}
