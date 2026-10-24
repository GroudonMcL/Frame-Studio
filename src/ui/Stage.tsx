// The canvas: a live preview drawn by renderProject, with the selection and
// editing handles on a separate overlay (never exported). Click a layer to
// pick it; drag it in or out to move it across the band, or round the token
// to slide repeated shapes along it. Shapes and paths get handles to move,
// resize and turn them, and paths can be drawn and their points edited.

import { useEffect, useRef, useState } from 'react';
import { SHAPES } from '../engine/legacy/catalog';
import type { FrameGeometry } from '../engine/legacy/frameKit';
import type { Point } from '../engine/legacy/shapes';
import { findLayer, flatten, isLocked, isShown } from '../project/tree';
import type { FrameProject, Layer, PathLayer, PlacedLayer } from '../project/types';
import { bandGeometry, outlineAt } from '../render/band';
import {
  dragLayer,
  movePathPart,
  pathHandles,
  pathLocal,
  pickLayer,
  pickPathPart,
  placeAt,
  rotateBy,
  scaleBy,
  toggleSmooth,
  transformHandles,
  type PathPart,
} from '../render/hitTest';
import { lineOutline, repeatPlacements } from '../render/layers';
import { placements, localBounds, toCanvas } from '../render/placed';
import { renderProject } from '../render/renderProject';
import { commit, finishDrawing, select, setPathEdit, setPathPoints, updateLayer, updateStage, useProject, useUi, type PathEdit } from '../state/projectStore';
import { ColorField, Segmented, Slider, Toggle } from './controls';
import { LightDial } from './LightDial';
import { stageArt } from './stageArt';

const GOLD = 'rgba(240, 196, 112, 0.95)';

function strokeOutline(ctx: CanvasRenderingContext2D, poly: Point[]): void {
  if (!poly.length) return;
  ctx.beginPath();
  poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
}

/** The dashed outline showing where a layer is. */
function outlineLayer(ctx: CanvasRenderingContext2D, layer: Layer, g: FrameGeometry): void {
  switch (layer.type) {
    case 'repeat':
      for (const { p, h } of repeatPlacements(layer, g)) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, (h * Math.max(1, layer.stretch)) / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case 'line':
      if (layer.waveAmplitude > 0) strokeOutline(ctx, lineOutline(layer, g));
      else {
        strokeOutline(ctx, outlineAt(g, layer.at - layer.width / 2));
        strokeOutline(ctx, outlineAt(g, layer.at + layer.width / 2));
      }
      break;
    case 'bandFill':
      strokeOutline(ctx, outlineAt(g, layer.from));
      strokeOutline(ctx, outlineAt(g, layer.to));
      break;
    case 'legacyFrame':
      strokeOutline(ctx, outlineAt(g, 0));
      strokeOutline(ctx, outlineAt(g, 1));
      break;
    case 'shape':
    case 'path': {
      const b = localBounds(layer);
      for (const t of placements(layer, g)) {
        strokeOutline(
          ctx,
          [
            { x: b.minX, y: b.minY },
            { x: b.maxX, y: b.minY },
            { x: b.maxX, y: b.maxY },
            { x: b.minX, y: b.maxY },
          ].map((p) => toCanvas(t, p)),
        );
      }
      break;
    }
    case 'group':
      for (const child of flatten(layer.children)) if (child.visible) outlineLayer(ctx, child, g);
      break;
  }
}

function dot(ctx: CanvasRenderingContext2D, p: Point, r: number, fill: string, square = false): void {
  ctx.beginPath();
  if (square) ctx.rect(p.x - r, p.y - r, r * 2, r * 2);
  else ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

function drawOverlay(ctx: CanvasRenderingContext2D, project: FrameProject, ids: string[], primary: Layer | undefined, edit: PathEdit | null, size: number, zoom: number): void {
  const g = bandGeometry(project.stage, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.lineWidth = 1.5 * zoom;
  ctx.setLineDash([5 * zoom, 4 * zoom]);
  ctx.strokeStyle = GOLD;
  for (const id of ids) {
    const layer = findLayer(project.layers, id);
    if (layer && isShown(project.layers, id)) outlineLayer(ctx, layer, g);
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = '#1a1208';
  ctx.lineWidth = 1.2 * zoom;
  if (primary && (primary.type === 'shape' || primary.type === 'path') && isShown(project.layers, primary.id) && !isLocked(project.layers, primary.id)) {
    if (primary.type === 'path' && edit) {
      // Points (squares) and curve handles (circles) of the path itself.
      const handles = pathHandles(primary, g);
      ctx.strokeStyle = GOLD;
      handles.forEach((h) => {
        for (const c of [h.in, h.out]) {
          if (!c) continue;
          ctx.beginPath();
          ctx.moveTo(h.at.x, h.at.y);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
        }
      });
      ctx.strokeStyle = '#1a1208';
      handles.forEach((h, i) => {
        if (h.in) dot(ctx, h.in, 3.5 * zoom, '#ffffff');
        if (h.out) dot(ctx, h.out, 3.5 * zoom, '#ffffff');
        const first = i === 0 && edit.drawing && primary.points.length >= 3;
        dot(ctx, h.at, (first ? 5.5 : 4.5) * zoom, i === edit.point ? '#ffd27a' : first ? '#7ad3ff' : '#ffffff', true);
      });
    } else {
      const h = transformHandles(primary, g, zoom);
      if (h) {
        ctx.strokeStyle = GOLD;
        ctx.beginPath();
        ctx.moveTo(h.stem.x, h.stem.y);
        ctx.lineTo(h.rotate.x, h.rotate.y);
        ctx.stroke();
        ctx.strokeStyle = '#1a1208';
        dot(ctx, h.anchor, 3 * zoom, GOLD);
        dot(ctx, h.scale, 5 * zoom, '#ffffff', true);
        dot(ctx, h.rotate, 5.5 * zoom, '#ffffff');
      }
    }
  }
  ctx.restore();
}

type Drag =
  | { kind: 'move'; layer: Layer; start: Point }
  | { kind: 'scale' | 'rotate'; layer: PlacedLayer; anchor: Point; start: Point }
  | { kind: 'pathPart'; layer: PathLayer; part: PathPart };

export function Stage() {
  const project = useProject();
  const selectedId = useUi((s) => s.selectedId);
  const selectedIds = useUi((s) => s.selectedIds);
  const pathEdit = useUi((s) => s.pathEdit);
  const advanced = useUi((s) => s.mode === 'advanced');
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const [side, setSide] = useState(480);
  const drag = useRef<Drag | null>(null);
  const selected = findLayer(project.layers, selectedId);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setSide(Math.max(160, Math.floor(Math.min(el.clientWidth, el.clientHeight) - 32)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dpr = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
  const px = Math.round(side * dpr);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    renderProject(ctx, project, px, { art: project.stage.showArt ? stageArt() : null });
  }, [project, px]);

  useEffect(() => {
    const ctx = overlay.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, px, px);
    drawOverlay(ctx, project, selectedIds, selected, pathEdit, px, dpr);
  }, [project, selected, selectedIds, pathEdit, px, dpr]);

  const toPoint = (e: React.PointerEvent | React.MouseEvent): Point => {
    const r = overlay.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width - 0.5) * px, y: ((e.clientY - r.top) / r.height - 0.5) * px };
  };
  const g = bandGeometry(project.stage, px);
  const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) <= 9 * dpr;
  const editable = (l: Layer | undefined): l is Layer => !!l && isShown(project.layers, l.id) && !isLocked(project.layers, l.id);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toPoint(e);
    const capture = () => e.currentTarget.setPointerCapture(e.pointerId);
    const sel = selected;

    // Drawing or editing a path's points.
    if (sel?.type === 'path' && pathEdit && editable(sel)) {
      const part = pickPathPart(sel, g, pt, pathEdit.point, 8 * dpr);
      if (pathEdit.drawing && part?.part === 'point' && part.point === 0 && sel.points.length >= 3) {
        finishDrawing(true);
        return;
      }
      if (part) {
        setPathEdit({ ...pathEdit, point: part.point });
        drag.current = { kind: 'pathPart', layer: sel, part };
        capture();
        return;
      }
      if (pathEdit.drawing) {
        if (sel.points.length === 0) {
          // The first point anchors the path where it was clicked.
          updateLayer(sel.id, { ...placeAt(sel, g, pt), points: [{ x: 0, y: 0, handle: null }] });
          setPathEdit({ drawing: true, point: 0 });
        } else {
          const l = pathLocal(sel, g, pt);
          if (l) {
            setPathPoints(sel.id, [...sel.points, { ...l, handle: null }]);
            setPathEdit({ drawing: true, point: sel.points.length });
          }
        }
        return;
      }
    }

    // The resize and turn handles of a shape or path.
    if ((sel?.type === 'shape' || sel?.type === 'path') && editable(sel) && !pathEdit) {
      const h = transformHandles(sel, g, dpr);
      if (h && near(pt, h.scale)) {
        drag.current = { kind: 'scale', layer: sel, anchor: h.anchor, start: pt };
        capture();
        return;
      }
      if (h && near(pt, h.rotate)) {
        drag.current = { kind: 'rotate', layer: sel, anchor: h.anchor, start: pt };
        capture();
        return;
      }
    }

    const hit = pickLayer(project, px, pt);
    if (!hit || hit.id !== selectedId || e.ctrlKey || e.metaKey) select(hit?.id ?? null);
    if (hit) {
      drag.current = { kind: 'move', layer: hit, start: pt };
      capture();
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const pt = toPoint(e);
    let patch: Partial<Layer> | null = null;
    if (d.kind === 'move') patch = dragLayer(d.layer, project, px, d.start, pt);
    else if (d.kind === 'scale') patch = scaleBy(d.layer, d.anchor, d.start, pt);
    else if (d.kind === 'rotate') patch = rotateBy(d.layer, d.anchor, d.start, pt, e.shiftKey);
    else if (d.kind === 'pathPart') {
      const points = movePathPart(d.layer, g, d.part, pt);
      if (points) patch = { points } as Partial<Layer>;
    }
    if (patch) updateLayer(d.layer.id, patch, { transient: true });
  };

  const endDrag = () => {
    if (drag.current) commit();
    drag.current = null;
  };

  return (
    <section className="stage" aria-label="Canvas">
      <div className="stage-well" ref={wrap}>
        <div className="stage-canvas" style={{ width: side, height: side }}>
          <canvas ref={canvas} width={px} height={px} aria-label={`Preview of ${project.name}`} role="img" data-testid="preview" />
          <canvas
            ref={overlay}
            width={px}
            height={px}
            className={`overlay${pathEdit?.drawing ? ' drawing' : ''}`}
            data-testid="overlay"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={(e) => {
              const sel = selected;
              if (sel?.type !== 'path' || !pathEdit || pathEdit.drawing || !editable(sel)) return;
              const part = pickPathPart(sel, g, toPoint(e), pathEdit.point, 8 * dpr);
              if (part?.part === 'point') setPathPoints(sel.id, toggleSmooth(sel.points, part.point, sel.closed));
            }}
          />
        </div>
        {pathEdit?.drawing && (
          <p className="stage-hint" role="status">
            Click to add points{selected?.type === 'path' && selected.points.length >= 3 ? '; click the first point or press Enter to finish' : ''}.
          </p>
        )}
      </div>
      <div className="stage-bar" aria-label="Preview settings">
        <Segmented label="Token shape" value={project.stage.shape} options={SHAPES.map((s) => ({ value: s.id, label: s.name }))} onChange={(shape) => updateStage({ shape })} />
        <div className="stage-sliders">
          <Slider
            label="Band thickness"
            hint="Designs follow the band, so try them thick and thin."
            value={project.stage.thickness}
            min={0.04}
            max={0.4}
            step={0.005}
            scale={100}
            unit="%"
            onChange={(thickness, t) => updateStage({ thickness }, { transient: t })}
            onCommit={commit}
          />
          {advanced && (
            <Slider
              label="Outer spacing"
              value={project.stage.outerSpacing}
              min={0}
              max={0.3}
              step={0.005}
              scale={100}
              unit="%"
              onChange={(outerSpacing, t) => updateStage({ outerSpacing }, { transient: t })}
              onCommit={commit}
            />
          )}
          <LightDial value={project.stage.light} />
          <Toggle label="Show sample picture" checked={project.stage.showArt} onChange={(showArt) => updateStage({ showArt })} />
          {advanced && project.stage.showArt && <ColorField label="Backing colour" value={project.stage.backingColor} onChange={(backingColor, t) => updateStage({ backingColor }, { transient: t })} />}
        </div>
      </div>
    </section>
  );
}
