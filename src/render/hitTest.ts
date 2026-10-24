// Picking layers on the canvas, and turning a drag into new layer settings.
// Points are in pixels with the origin at the token's centre.

import type { Point } from '../engine/legacy/shapes';
import type { FrameProject, Layer } from '../project/types';
import { acrossOfPoint, bandGeometry, bandWidthPx } from './band';
import { repeatPlacements } from './layers';

/** The top-most visible, unlocked layer under a point, or null. */
export function pickLayer(project: FrameProject, size: number, pt: Point): Layer | null {
  const g = bandGeometry(project.stage, size);
  const across = acrossOfPoint(g, pt);
  const slack = 4 / Math.max(1, bandWidthPx(g));
  for (let i = project.layers.length - 1; i >= 0; i--) {
    const layer = project.layers[i];
    if (!layer.visible || layer.locked) continue;
    switch (layer.type) {
      case 'repeat': {
        const hit = repeatPlacements(layer, g).some(({ p, h }) => Math.hypot(pt.x - p.x, pt.y - p.y) <= (h * Math.max(1, layer.stretch)) / 2 + 3);
        if (hit) return layer;
        break;
      }
      case 'line':
        if (Math.abs(across - layer.at) <= layer.width / 2 + slack) return layer;
        break;
      case 'bandFill':
        if (across >= Math.min(layer.from, layer.to) - slack && across <= Math.max(layer.from, layer.to) + slack) return layer;
        break;
      case 'legacyFrame':
        if (across >= -slack && across <= 1 + slack) return layer;
        break;
      case 'unsupported':
        break;
    }
  }
  return null;
}

/**
 * New settings for a layer dragged from `start` to `now`, given its settings
 * when the drag began. Dragging in or out moves it across the band; dragging
 * round the token slides a repeat's elements along it.
 */
export function dragLayer(layer: Layer, project: FrameProject, size: number, start: Point, now: Point): Partial<Layer> | null {
  const g = bandGeometry(project.stage, size);
  const dAcross = acrossOfPoint(g, now) - acrossOfPoint(g, start);
  const clamp = (v: number) => Math.round(Math.min(1.5, Math.max(-0.5, v)) * 1000) / 1000;
  switch (layer.type) {
    case 'repeat': {
      const n = Math.max(1, repeatPlacements(layer, g).length);
      const turn = (Math.atan2(now.y, now.x) - Math.atan2(start.y, start.x)) / (Math.PI * 2);
      const wrapped = ((turn % 1) + 1.5) % 1 - 0.5;
      // One gap is 1/n of the way round; offset is measured in gaps.
      const offset = (((layer.offset + wrapped * n) % 1) + 1) % 1;
      return { at: clamp(layer.at + dAcross), offset: Math.round(offset * 1000) / 1000 };
    }
    case 'line':
      return { at: clamp(layer.at + dAcross) };
    case 'bandFill':
      return { from: clamp(layer.from + dAcross), to: clamp(layer.to + dAcross) };
    default:
      return null;
  }
}
