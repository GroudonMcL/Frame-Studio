import 'fake-indexeddb/auto';
import { createProject, LAYERED_TEMPLATES } from '../project/defaults';
import { loadAutosave, saveNow, startAutosave } from './autosave';
import { addLayer, loadProject } from './projectStore';

describe('autosave', () => {
  it('saves and restores the project', async () => {
    const p = createProject(LAYERED_TEMPLATES[1].make(), 'Saved one');
    await saveNow(p);
    expect(await loadAutosave()).toEqual(p);
  });

  it('saves shortly after a change', async () => {
    loadProject(createProject([], 'Watch me'));
    const stop = startAutosave();
    addLayer('repeat');
    await new Promise((r) => setTimeout(r, 600));
    stop();
    const saved = await loadAutosave();
    expect(saved?.name).toBe('Watch me');
    expect(saved?.layers[0].type).toBe('repeat');
  });
});
