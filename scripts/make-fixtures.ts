// Writes fixture files for the current schema version, each with the picture
// this version draws (160 px), into src/project/fixtures/v<version>/. Run it
// before a phase changes the format (npm run make-fixtures), so the next
// version can check that these files still open and draw the same. The
// designs are the templates that show off what the version added.
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sampleArt } from '../src/engine/legacy/sampleArt';
import { createProject, LAYERED_TEMPLATES } from '../src/project/defaults';
import { serializeProject } from '../src/project/migrate';
import { SCHEMA_VERSION, type FrameProject, type StageSettings } from '../src/project/types';
import { setCanvasFactory, type Ctx } from '../src/render/canvas';
import { renderProject } from '../src/render/renderProject';

const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);

const [, , ...wanted] = process.argv;
/** file name, template id, stage changes */
const DESIGNS: [string, string, Partial<StageSettings>][] = wanted.length
  ? wanted.map((w) => {
      const [file, id, shape = 'circle', light = '225', showArt = 'false'] = w.split(':');
      return [file, id, { shape: shape as StageSettings['shape'], light: Number(light), showArt: showArt === 'true' }];
    })
  : [];

const dir = join(process.cwd(), 'src', 'project', 'fixtures', `v${SCHEMA_VERSION}`);
mkdirSync(dir, { recursive: true });
for (const [file, id, stage] of DESIGNS) {
  const t = LAYERED_TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`No template ${id}`);
  const project: FrameProject = createProject(t.make(), t.name);
  project.stage = { ...project.stage, ...stage };
  writeFileSync(join(dir, `${file}.framestudio.json`), serializeProject(project));
  const c = createCanvas(160, 160);
  renderProject(c.getContext('2d') as unknown as Ctx, project, 160, { art: project.stage.showArt ? sampleArt(make, 200) : null });
  writeFileSync(join(dir, `${file}.png`), c.toBuffer('image/png'));
  console.log(`${dir}/${file}`);
}
