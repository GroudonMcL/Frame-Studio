// Phase 5: every control has a help tip (one plain sentence), and screen
// readers hear it as the control's description. Each kind of layer and paint
// is shown in Advanced mode with every section open, plus the stage bar and
// the export menu; a control without a tip fails the test with its label.
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { bandFillLayer, createProject, NEW_EFFECT, groupLayer, legacyFrameLayer, lineLayer, pathLayer, repeatLayer, shapeLayer, textureLayer, GEM_POINTS } from '../project/defaults';
import { EFFECT_KINDS, TEXTURE_KINDS, type Effect, type Layer, type Paint } from '../project/types';
import { loadProject, select, setMode } from '../state/projectStore';
import { PropertiesPanel } from './PropertiesPanel';
import { Stage } from './Stage';
import { TopBar } from './TopBar';

const PAINTS: Paint[] = [
  { kind: 'lit', color: '#806040', light: 0.8, dark: 0.8, pressed: false, highlight: '#ffeecc' },
  { kind: 'solid', color: '#806040' },
  { kind: 'linear', angle: 45, stops: [{ at: 0, color: '#ffffff', opacity: 1 }, { at: 1, color: '#000000', opacity: 1 }, { at: 1, color: '#000000', opacity: 1 }], followLight: true },
  { kind: 'acrossBand', stops: [{ at: 0, color: '#ffffff', opacity: 1 }, { at: 1, color: '#000000', opacity: 1 }] },
  { kind: 'ring', stops: [{ angle: 0, color: '#ffffff' }, { angle: 180, color: '#000000' }, { angle: 90, color: '#ff0000' }], followLight: true },
];

const LAYERS: [string, Layer][] = [
  ['Token Maker frame', legacyFrameLayer('paladin')],
  ...PAINTS.map((paint): [string, Layer] => [`band fill (${paint.kind})`, { ...bandFillLayer(), paint }]),
  ['wavy glowing line', { ...lineLayer(), waveAmplitude: 0.2, glow: '#6fc3ff' }],
  ['repeat with every option', { ...repeatLayer(), accentEvery: 3, accentColor: '#ff0000', outline: '#000000', glow: '#ffffff', altColors: ['#ffffff'], altSizes: [1, 0.5], show: [true, false], alternateSides: 0.2 }],
  ['repeat of runes, spaced', { ...repeatLayer(), element: 'rune', mode: 'spacing' }],
  ...TEXTURE_KINDS.map((kind): [string, Layer] => [`texture (${kind})`, { ...textureLayer(kind), color2: '#6a5acd' }]),
  ...(['circle', 'rectangle', 'polygon', 'star'] as const).map((shape): [string, Layer] => [`shape (${shape})`, { ...shapeLayer(), shape, glow: '#ffffff' }]),
  ['free path', { ...pathLayer(GEM_POINTS), place: 'free' }],
  ['group', groupLayer([lineLayer()])],
  ['layer with every effect', { ...bandFillLayer(), effects: [...EFFECT_KINDS.map((k) => NEW_EFFECT[k]()), { ...NEW_EFFECT.bevel(), surface: 'hammered' } as Effect, { ...NEW_EFFECT.glow(), inner: true } as Effect] }],
  ['group with effects', { ...groupLayer([lineLayer()]), effects: [NEW_EFFECT.shadow()] }],
  ['faceted shape that cuts a hole', { ...shapeLayer(), faceted: true, blend: 'destination-out' }],
];

/** Every control in `root` with no help tip, by its label. */
function withoutHelp(root: HTMLElement): string[] {
  root.querySelectorAll('details').forEach((d) => (d.open = true));
  const missing: string[] = [];
  const controls = root.querySelectorAll<HTMLElement>('input:not([type="file"]), select, [role="radiogroup"], [role="slider"]');
  for (const c of controls) {
    // The number box beside a slider and the hex box beside a colour belong to the same control.
    if (c.matches('.number input, .hex, .rename, .project-name')) continue;
    const label = (c.id && root.querySelector(`label[for="${c.id}"]`)?.textContent) || c.getAttribute('aria-label') || c.closest('label')?.textContent || c.outerHTML.slice(0, 80);
    const describedBy = c.getAttribute('aria-describedby') ?? c.closest('[aria-describedby]')?.getAttribute('aria-describedby');
    const tip = describedBy ? document.getElementById(describedBy) : null;
    if (!tip?.textContent?.trim()) missing.push(label);
  }
  return missing;
}

describe('help tips', () => {
  beforeEach(() => setMode('advanced'));
  afterEach(() => setMode('basic'));

  it.each(LAYERS)('every control of a %s has one', (_name, layer) => {
    loadProject(createProject([layer]));
    select(layer.id);
    const { container } = render(<PropertiesPanel />);
    expect(withoutHelp(container)).toEqual([]);
  });

  it('every control under the canvas and in the top bar has one', async () => {
    loadProject(createProject([lineLayer()]));
    const { container } = render(
      <>
        <TopBar onNew={() => {}} onHelp={() => {}} onMessage={() => {}} />
        <Stage />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    await userEvent.selectOptions(screen.getByLabelText('Picture size'), 'custom');
    expect(withoutHelp(container)).toEqual([]);
    // One plain sentence each.
    for (const tip of container.querySelectorAll('.help-text')) expect(tip.textContent).toMatch(/^[A-Z0-9].*[.]$/);
  });
});
