// The canvas: a live preview drawn by renderProject, with the selected
// layer outlined on a separate overlay (never exported). Click a layer to
// pick it; drag it in or out to move it across the band, or round the token
// to slide repeated shapes along it.

import { useEffect, useRef, useState } from 'react';
import { SHAPES } from '../engine/legacy/catalog';
import type { Point } from '../engine/legacy/shapes';
import type { FrameProject, Layer } from '../project/types';
import { bandGeometry, outlineAt } from '../render/band';
import { dragLayer, pickLayer } from '../render/hitTest';
import { repeatPlacements } from '../render/layers';
import { renderProject } from '../render/renderProject';
import { commit, select, updateLayer, updateStage, useProject, useUi } from '../state/projectStore';
import { ColorField, Segmented, Slider, Toggle } from './controls';
import { stageArt } from './stageArt';


function drawSelection(ctx: CanvasRenderingContext2D, project: FrameProject, layer: Layer, size: number): void {
  const g = bandGeometry(project.stage, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = 'rgba(240, 196, 112, 0.95)';
  const outline = (across: number) => {
    const poly = outlineAt(g, across);
    if (!poly.length) return;
    ctx.beginPath();
    poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
  };
  switch (layer.type) {
    case 'repeat':
      for (const { p, h } of repeatPlacements(layer, g)) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, (h * Math.max(1, layer.stretch)) / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case 'line':
      outline(layer.at - layer.width / 2);
      outline(layer.at + layer.width / 2);
      break;
    case 'bandFill':
      outline(layer.from);
      outline(layer.to);
      break;
    case 'legacyFrame':
      outline(0);
      outline(1);
      break;
  }
  ctx.restore();
}

export function Stage() {
  const project = useProject();
  const selectedId = useUi((s) => s.selectedId);
  const advanced = useUi((s) => s.mode === 'advanced');
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const [side, setSide] = useState(480);
  const drag = useRef<{ layer: Layer; start: Point } | null>(null);
  const selected = project.layers.find((l) => l.id === selectedId);

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
    if (selected && selected.visible) drawSelection(ctx, project, selected, px);
  }, [project, selected, px]);

  const toPoint = (e: React.PointerEvent): Point => {
    const r = overlay.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width - 0.5) * px, y: ((e.clientY - r.top) / r.height - 0.5) * px };
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
            className="overlay"
            data-testid="overlay"
            onPointerDown={(e) => {
              const pt = toPoint(e);
              const hit = pickLayer(project, px, pt);
              select(hit?.id ?? null);
              if (hit) {
                drag.current = { layer: hit, start: pt };
                e.currentTarget.setPointerCapture(e.pointerId);
              }
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              const patch = dragLayer(d.layer, project, px, d.start, toPoint(e));
              if (patch) updateLayer(d.layer.id, patch, { transient: true });
            }}
            onPointerUp={() => {
              if (drag.current) commit();
              drag.current = null;
            }}
            onPointerCancel={() => {
              if (drag.current) commit();
              drag.current = null;
            }}
          />
        </div>
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
          <Toggle label="Show sample picture" checked={project.stage.showArt} onChange={(showArt) => updateStage({ showArt })} />
          {advanced && project.stage.showArt && <ColorField label="Backing colour" value={project.stage.backingColor} onChange={(backingColor, t) => updateStage({ backingColor }, { transient: t })} />}
        </div>
      </div>
    </section>
  );
}
