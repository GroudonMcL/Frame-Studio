// @vitest-environment node
import { createProject, lineLayer, legacyFrameLayer, repeatLayer } from '../project/defaults';
import { bandGeometry } from './band';
import { dragLayer, pickLayer } from './hitTest';
import { repeatPlacements } from './layers';

const size = 400;

describe('picking and dragging on the canvas', () => {
  const frame = legacyFrameLayer('gilded');
  const beads = { ...repeatLayer(), count: 8, snapToCorners: false };
  const project = createProject([frame, beads]);
  const g = bandGeometry(project.stage, size);
  const bead = repeatPlacements(beads, g)[2].p;

  it('picks the top-most layer under the pointer', () => {
    expect(pickLayer(project, size, bead)?.id).toBe(beads.id);
    // Between two beads, on the band: the frame below.
    const between = repeatPlacements({ ...beads, offset: 0.5 }, g)[2].p;
    expect(pickLayer(project, size, between)?.id).toBe(frame.id);
    expect(pickLayer(project, size, { x: 0, y: 0 })).toBeNull();
  });

  it('skips hidden and locked layers', () => {
    expect(pickLayer({ ...project, layers: [frame, { ...beads, visible: false }] }, size, bead)?.id).toBe(frame.id);
    expect(pickLayer({ ...project, layers: [frame, { ...beads, locked: true }] }, size, bead)?.id).toBe(frame.id);
  });

  it('dragging inwards moves a line across the band', () => {
    const line = lineLayer();
    const top = (across: number) => ({ x: 0, y: -(g.R - (g.outer + (g.inner - g.outer) * across)) });
    const patch = dragLayer(line, project, size, top(0.5), top(0.75)) as { at: number };
    expect(patch.at).toBeCloseTo(0.75, 2);
  });

  it('dragging round the token slides repeated shapes along', () => {
    const r = g.R - (g.outer + g.inner) / 2;
    const quarter = dragLayer(beads, project, size, { x: 0, y: -r }, { x: r * Math.sin(Math.PI / 8), y: -r * Math.cos(Math.PI / 8) }) as { offset: number; at: number };
    // 1/16 of a turn with 8 beads is half a gap.
    expect(quarter.offset).toBeCloseTo(0.5, 2);
    expect(quarter.at).toBeCloseTo(beads.at, 2);
  });

  it('Token Maker frames are not moved by dragging', () => {
    expect(dragLayer(frame, project, size, { x: 0, y: -150 }, { x: 0, y: -120 })).toBeNull();
  });
});
