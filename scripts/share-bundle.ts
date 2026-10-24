// What Token Maker gets of Frame Studio (DESIGN.md §10): the project reader
// and the renderer, copied into token-maker's src/frameStudio/ with a
// manifest of hashes, as the engine is copied the other way (§3). One
// change is made while copying: imports of the engine copy
// (../engine/legacy/x) point at token-maker's own src/render/x, which is
// the code the engine was copied from.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The folders copied, relative to src/. */
export const SHARED_DIRS = ['project', 'render', 'share'] as const;
/** Where they go in token-maker. */
export const TARGET = 'src/frameStudio';

export interface BundleFile {
  /** Path inside the bundle, e.g. render/band.ts. */
  path: string;
  text: string;
  sha256: string;
}

const isShared = (name: string) => name.endsWith('.ts') && !name.endsWith('.test.ts');

/** Points imports of the engine copy at token-maker's own render folder (two levels up from a bundle folder). */
export const rewriteImports = (text: string) => text.replace(/(from\s+['"])\.\.\/engine\/legacy\//g, '$1../../render/');

export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** Every shared file as it should be in token-maker, sorted by path. */
export function bundleFiles(srcRoot = 'src'): BundleFile[] {
  return SHARED_DIRS.flatMap((dir) =>
    readdirSync(join(srcRoot, dir))
      .filter(isShared)
      .sort()
      .map((name) => {
        const text = rewriteImports(readFileSync(join(srcRoot, dir, name), 'utf8'));
        return { path: `${dir}/${name}`, text, sha256: sha256(text) };
      }),
  );
}

/** Every relative import in a bundle file, resolved to a path from token-maker's src/ (without the .ts). */
export function importsOf(file: BundleFile): string[] {
  const dir = ['frameStudio', ...file.path.split('/').slice(0, -1)];
  return [...file.text.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => {
    const parts = [...dir];
    for (const seg of m[1].split('/')) {
      if (seg === '..') parts.pop();
      else if (seg !== '.') parts.push(seg);
    }
    return parts.join('/');
  });
}
