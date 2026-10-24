// @vitest-environment node
// Phase 5: the code copied into token-maker (scripts/share-bundle.ts) must
// stand on its own there: every import is another copied file or one of
// token-maker's src/render/ files that the engine copy came from, and
// nothing from the editor (state, ui, io, React) comes along.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bundleFiles, importsOf, rewriteImports } from './share-bundle';

const engine = JSON.parse(readFileSync('src/engine/legacy/SOURCE.json', 'utf8')) as { files: Record<string, string> };
// render.ts is token-maker's own (Frame Studio has a stand-in for its one type).
const tokenMakerRender = new Set([...Object.keys(engine.files), 'render.ts'].map((f) => `render/${f.replace(/\.ts$/, '')}`));

describe('the bundle for Token Maker', () => {
  const files = bundleFiles();
  const inBundle = new Set(files.map((f) => `frameStudio/${f.path.replace(/\.ts$/, '')}`));

  it('holds the reader, the renderer and the share entry point, without tests', () => {
    const paths = files.map((f) => f.path);
    expect(paths).toEqual(expect.arrayContaining(['project/migrate.ts', 'project/types.ts', 'render/renderProject.ts', 'share/frameDesign.ts']));
    expect(paths.some((p) => p.endsWith('.test.ts'))).toBe(false);
  });

  it('every import resolves inside the bundle or to token-maker’s render folder', () => {
    for (const f of files) {
      for (const target of importsOf(f)) {
        expect(inBundle.has(target) || tokenMakerRender.has(target), `${f.path} imports ${target}`).toBe(true);
      }
      expect(f.text, f.path).not.toMatch(/from\s+['"](react|zustand|idb-keyval|lucide-react)['"]/);
      expect(f.text, f.path).not.toMatch(/from\s+['"][^'"]*engine\/legacy/);
    }
  });

  it('rewrites only imports of the engine copy', () => {
    expect(rewriteImports("import { x } from '../engine/legacy/frameKit';\nimport { y } from './band';")).toBe("import { x } from '../../render/frameKit';\nimport { y } from './band';");
    expect(rewriteImports("import type { T } from '../engine/legacy/render';")).toBe("import type { T } from '../../render/render';");
  });
});
