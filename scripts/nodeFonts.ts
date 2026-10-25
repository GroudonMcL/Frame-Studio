// The fonts text layers use, for drawing in node (tests and scripts); the
// browser loads the same files through @fontsource.
import { GlobalFonts } from '@napi-rs/canvas';
import { join } from 'node:path';

let done = false;
export function registerShippedFonts(): void {
  if (done) return;
  done = true;
  const files = join(process.cwd(), 'node_modules', '@fontsource');
  GlobalFonts.registerFromPath(join(files, 'grenze', 'files', 'grenze-latin-600-normal.woff2'), 'Grenze');
  GlobalFonts.registerFromPath(join(files, 'atkinson-hyperlegible', 'files', 'atkinson-hyperlegible-latin-700-normal.woff2'), 'Atkinson Hyperlegible');
}
