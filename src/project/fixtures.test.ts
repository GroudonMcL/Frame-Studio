// @vitest-environment node
// Version-1 project files (saved by Phase 1, in fixtures/v1/) must still open
// and draw exactly as Phase 1 drew them. pixels.json holds a fingerprint of
// each picture as Phase 1 rendered it at 160 px (the .png files show them).
// If @napi-rs/canvas is upgraded and these change, check the pictures by eye
// before regenerating the fingerprints.
import { createCanvas } from '@napi-rs/canvas';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sampleArt } from '../engine/legacy/sampleArt';
import { setCanvasFactory, type Ctx } from '../render/canvas';
import { renderProject } from '../render/renderProject';
import { parseProject } from './migrate';
import { DEFAULT_LIGHT, SCHEMA_VERSION } from './types';

const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);

const dir = join(__dirname, 'fixtures', 'v1');
const pixels: Record<string, string> = JSON.parse(readFileSync(join(dir, 'pixels.json'), 'utf8'));
const files = readdirSync(dir).filter((f) => f.endsWith('.framestudio.json'));

describe('version-1 project files', () => {
  it('there are fixtures for every one', () => {
    expect(files.sort()).toEqual(Object.keys(pixels).sort());
  });

  it.each(files)('%s opens as the current version with the light at the top left', (file) => {
    const text = readFileSync(join(dir, file), 'utf8');
    expect(JSON.parse(text).schemaVersion).toBe(1);
    const r = parseProject(text);
    if (!r.ok) throw new Error(r.error);
    expect(r.warnings).toEqual([]);
    expect(r.project.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.project.stage.light).toBe(DEFAULT_LIGHT);
    for (const l of r.project.layers) expect(l.clip).toBe('none');
  });

  it.each(files)('%s draws exactly as it did in version 1', (file) => {
    const r = parseProject(readFileSync(join(dir, file), 'utf8'));
    if (!r.ok) throw new Error(r.error);
    const c = createCanvas(160, 160);
    const ctx = c.getContext('2d') as unknown as Ctx;
    renderProject(ctx, r.project, 160, { art: r.project.stage.showArt ? sampleArt(make, 200) : null });
    expect(createHash('sha256').update(ctx.getImageData(0, 0, 160, 160).data).digest('hex')).toBe(pixels[file]);
  });
});
