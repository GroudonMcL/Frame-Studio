// Keeps src/engine/legacy/ in step with token-maker's src/render/ (DESIGN.md §3).
//   npm run engine:check -- ../token-maker   reports files that differ
//   npm run engine:sync  -- ../token-maker   copies them over and records the new hashes
// Without a path it only checks the copies against src/engine/legacy/SOURCE.json,
// so a change made here by mistake is caught (the unit tests do the same).
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const here = 'src/engine/legacy';
const manifestPath = join(here, 'SOURCE.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
  repo: string;
  commit: string;
  from: string;
  files: Record<string, string>;
};
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

const [mode = 'check', tokenMaker] = process.argv.slice(2);
let problems = 0;
for (const [file, recorded] of Object.entries(manifest.files)) {
  const local = join(here, file);
  if (hash(local) !== recorded) {
    console.log(`changed here: ${local} (engine files must not be edited; change token-maker and sync)`);
    problems++;
  }
  if (!tokenMaker) continue;
  const upstream = join(tokenMaker, manifest.from, file);
  if (!existsSync(upstream)) {
    console.log(`missing in token-maker: ${upstream}`);
    problems++;
  } else if (hash(upstream) !== hash(local)) {
    if (mode === 'sync') {
      copyFileSync(upstream, local);
      manifest.files[file] = hash(local);
      console.log(`updated: ${file}`);
    } else {
      console.log(`differs from token-maker: ${file}`);
      problems++;
    }
  }
}
if (mode === 'sync' && tokenMaker) {
  manifest.commit = execSync('git rev-parse HEAD', { cwd: tokenMaker }).toString().trim();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Recorded token-maker commit ${manifest.commit}. Run npm test to check nothing broke.`);
} else {
  console.log(problems ? `${problems} problem(s).` : 'Engine files match.');
  process.exitCode = problems ? 1 : 0;
}
