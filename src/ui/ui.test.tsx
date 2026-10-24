import 'fake-indexeddb/auto';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { FRAME_PRESETS } from '../engine/legacy/catalog';
import { createProject, LAYERED_TEMPLATES } from '../project/defaults';
import { history, loadProject } from '../state/projectStore';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { TemplateDialog } from './TemplateDialog';

// jsdom has no <dialog> methods.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};

const rows = () => within(screen.getByRole('listbox', { name: /Layers/ })).getAllByRole('option');

describe('editor panels', () => {
  beforeEach(() => loadProject(createProject(LAYERED_TEMPLATES[0].make())));

  it('lists layers top first and shows the selected one’s settings', async () => {
    render(
      <>
        <LayersPanel onAddFrame={() => {}} />
        <PropertiesPanel />
      </>,
    );
    expect(rows().map((r) => r.textContent)).toEqual(expect.arrayContaining([expect.stringMatching(/^Beads/)]));
    expect(rows()[0].textContent).toMatch(/^Beads/);
    await userEvent.click(rows()[1]);
    expect(screen.getByText('Line', { selector: '.layer-kind' })).toBeInTheDocument();
  });

  it('hide, lock, duplicate, delete and reorder from the panel', async () => {
    render(<LayersPanel onAddFrame={() => {}} />);
    const top = () => history.getState().present.layers.at(-1)!;
    await userEvent.click(screen.getByRole('button', { name: 'Hide Beads' }));
    expect(top().visible).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Lock Beads' }));
    expect(top().locked).toBe(true);
    await userEvent.click(rows()[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(top().name).toBe('Beads copy');
    await userEvent.click(screen.getByRole('button', { name: 'Move down' }));
    expect(history.getState().present.layers.at(-2)!.name).toBe('Beads copy');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(history.getState().present.layers.map((l) => l.name)).not.toContain('Beads copy');
  });

  it('renames with a double click', async () => {
    render(<LayersPanel onAddFrame={() => {}} />);
    await userEvent.dblClick(rows()[0]);
    const box = screen.getByRole('textbox', { name: 'Layer name' });
    await userEvent.clear(box);
    await userEvent.type(box, 'Studs{Enter}');
    expect(history.getState().present.layers.at(-1)!.name).toBe('Studs');
  });

  it('adds layers from the menu', async () => {
    render(<LayersPanel onAddFrame={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add layer' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Repeated shapes/ }));
    expect(history.getState().present.layers).toHaveLength(6);
  });

  it('changing a setting changes the project, and undo brings it back', async () => {
    render(<PropertiesPanel />);
    const before = history.getState().present;
    const number = screen.getByLabelText('Number value');
    await userEvent.clear(number);
    await userEvent.type(number, '36{Enter}');
    const beads = history.getState().present.layers.at(-1)!;
    expect(beads.type === 'repeat' && beads.count).toBe(36);
    history.getState().undo();
    expect(history.getState().present).toBe(before);
  });

  it('the template picker offers all 27 Token Maker frames', () => {
    render(<TemplateDialog mode="new" onClose={() => {}} />);
    for (const f of FRAME_PRESETS) expect(screen.getByRole('button', { name: f.name })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Blank project/ })).toBeInTheDocument();
  });

  it('picking a frame in "add" mode adds it as a layer', async () => {
    render(<TemplateDialog mode="addFrame" onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Wizard' }));
    expect(history.getState().present.layers.at(-1)).toMatchObject({ type: 'legacyFrame', presetId: 'wizard' });
  });
});

describe('the app', () => {
  it('opens with a frame and Basic mode hides the data view', async () => {
    render(<App />);
    expect(await screen.findByRole('img', { name: /Preview of/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('Project data')).toBeNull();
    await userEvent.click(screen.getByRole('radio', { name: 'Advanced' }));
    expect(screen.getByText('Advanced: project data')).toBeInTheDocument();
  });
});
