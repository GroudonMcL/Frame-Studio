// Copies Frame Studio's project reader and renderer into token-maker, so
// Token Maker opens .framestudio.json files with the same code (DESIGN.md §10).
//   npm run share:check  -- ../token-maker   reports files that differ
//   npm run share:export -- ../token-maker   copies them and records this commit and the hashes
// In token-maker, a test checks src/frameStudio/ against its SOURCE.json, so
// the copies are never edited there; change Frame Studio and export again.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { bundleFiles, sha256, TARGET } from './share-bundle';

const [mode = 'check', tokenMaker] = process.argv.slice(2);
if (!tokenMaker) {
  console.log('Give the path to token-maker, e.g. npm run share:check -- ../token-maker');
  process.exit(1);
}
const target = join(tokenMaker, TARGET);
const files = bundleFiles();
let problems = 0;
for (const f of files) {
  const there = join(target, f.path);
  const same = existsSync(there) && sha256(readFileSync(there, 'utf8')) === f.sha256;
  if (same) continue;
  if (mode === 'export') {
    mkdirSync(dirname(there), { recursive: true });
    writeFileSync(there, f.text);
    console.log(`updated: ${f.path}`);
  } else {
    console.log(`${existsSync(there) ? 'differs' : 'missing'} in token-maker: ${f.path}`);
    problems++;
  }
}
// Files that Frame Studio no longer has.
const wanted = new Set(files.map((f) => f.path));
for (const dir of existsSync(target) ? readdirSync(target, { withFileTypes: true }).filter((d) => d.isDirectory()) : []) {
  for (const name of readdirSync(join(target, dir.name))) {
    const path = `${dir.name}/${name}`;
    if (wanted.has(path) || !name.endsWith('.ts')) continue;
    if (mode === 'export') {
      rmSync(join(target, path));
      console.log(`removed: ${path}`);
    } else {
      console.log(`no longer in Frame Studio: ${path}`);
      problems++;
    }
  }
}
if (mode === 'export') {
  const commit = execSync('git rev-parse HEAD').toString().trim();
  const manifest = { repo: 'https://github.com/GroudonMcL/Frame-Studio', commit, from: 'src', files: Object.fromEntries(files.map((f) => [f.path, f.sha256])) };
  writeFileSync(join(target, 'SOURCE.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Recorded Frame Studio commit ${commit}. In token-maker, run npm test.`);
} else {
  console.log(problems ? `${problems} problem(s).` : 'Token Maker has the current Frame Studio code.');
  process.exitCode = problems ? 1 : 0;
}
