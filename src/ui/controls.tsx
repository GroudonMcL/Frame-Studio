// Small form controls used by every panel. A slider drag is shown live and
// becomes one undo step when it ends (onChange(v, true) while dragging, then
// onCommit), as in token-maker.

import { useId, useState, type ReactNode } from 'react';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { isValidHex } from '../engine/legacy/color';
import { commit } from '../state/projectStore';

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor} title={hint}>
        {label}
      </label>
      <div className="field-control">{children}</div>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** How the value is shown and typed: e.g. percent shows 0.25 as 25. */
  scale?: number;
  unit?: string;
  hint?: string;
  disabled?: boolean;
  onChange: (value: number, transient: boolean) => void;
  onCommit: () => void;
}

export function Slider({ label, value, min, max, step = 0.01, scale = 1, unit = '', hint, disabled, onChange, onCommit }: SliderProps) {
  const id = useId();
  const shown = Math.round(value * scale * 100) / 100;
  const [typed, setTyped] = useState<string | null>(null);
  const applyTyped = () => {
    if (typed === null) return;
    const v = Number(typed);
    if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v / scale)), false);
    setTyped(null);
  };
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value), true)}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
      />
      <span className="number">
        <input
          aria-label={`${label} value`}
          inputMode="decimal"
          disabled={disabled}
          value={typed ?? String(shown)}
          onChange={(e) => setTyped(e.target.value)}
          onBlur={applyTyped}
          onKeyDown={(e) => e.key === 'Enter' && applyTyped()}
        />
        {unit}
      </span>
    </Field>
  );
}

/** Dragging in the browser's colour picker is shown live and becomes one undo step when the picker closes. */
export function ColorField({ label, value, onChange, disabled, hint }: { label: string; value: string; onChange: (v: string, transient?: boolean) => void; disabled?: boolean; hint?: string }) {
  const id = useId();
  const [typed, setTyped] = useState<string | null>(null);
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <input id={id} type="color" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value, true)} onBlur={commit} />
      <input
        className="hex"
        aria-label={`${label} hex code`}
        disabled={disabled}
        value={typed ?? value}
        onChange={(e) => {
          setTyped(e.target.value);
          const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
          if (isValidHex(v)) onChange(v.toLowerCase());
        }}
        onBlur={() => setTyped(null)}
      />
    </Field>
  );
}

/** A colour that can be switched off (null). */
export function OptionalColor({ label, value, fallback, onChange, disabled, hint }: { label: string; value: string | null; fallback: string; onChange: (v: string | null, transient?: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <>
      <Toggle label={label} checked={value !== null} disabled={disabled} hint={hint} onChange={(on) => onChange(on ? fallback : null)} />
      {value !== null && <ColorField label={`${label} colour`} value={value} disabled={disabled} onChange={onChange} />}
    </>
  );
}

export function Select<T extends string>({ label, value, options, onChange, disabled, hint }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean; hint?: string }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({ label, checked, onChange, disabled, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <label className="toggle" title={hint}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A folding group of settings; "Advanced" ones only show in Advanced mode. */
export function Fold({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="fold" open={defaultOpen}>
      <summary>
        <ChevronRight size={16} aria-hidden="true" className="fold-chevron" />
        {title}
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}

/** A short list of colours that can grow and shrink (alternating colours). */
export function ColorList({ label, values, onChange, disabled, hint, max = 8, fallback = '#3a7bd5' }: { label: string; values: string[]; onChange: (v: string[], transient?: boolean) => void; disabled?: boolean; hint?: string; max?: number; fallback?: string }) {
  return (
    <div className="list-field" role="group" aria-label={label}>
      <p className="field-label" title={hint}>
        {label}
      </p>
      {values.map((c, i) => (
        <div className="stop" key={i}>
          <ColorField label={`${label} ${i + 1}`} value={c} disabled={disabled} onChange={(v, t) => onChange(values.map((x, k) => (k === i ? v : x)), t)} />
          <button type="button" className="icon-btn" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} disabled={disabled} onClick={() => onChange(values.filter((_x, k) => k !== i))}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {values.length < max && (
        <button type="button" className="btn small" disabled={disabled} onClick={() => onChange([...values, fallback])}>
          <Plus size={16} /> Add
        </button>
      )}
    </div>
  );
}

/** A list of numbers typed as "100, 60" (shown and typed as percentages). */
export function PercentList({ label, values, onChange, disabled, hint }: { label: string; values: number[]; onChange: (v: number[]) => void; disabled?: boolean; hint?: string }) {
  const id = useId();
  const shown = values.map((v) => Math.round(v * 100)).join(', ');
  const [typed, setTyped] = useState<string | null>(null);
  const apply = () => {
    if (typed === null) return;
    const list = typed
      .split(/[,;\s]+/)
      .filter(Boolean)
      .map(Number)
      .filter((v) => Number.isFinite(v) && v > 0)
      .slice(0, 8)
      .map((v) => Math.min(500, Math.max(5, v)) / 100);
    setTyped(null);
    onChange(list.length > 1 ? list : []);
  };
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <input
        id={id}
        className="wide-text"
        placeholder="e.g. 100, 60"
        disabled={disabled}
        value={typed ?? shown}
        onChange={(e) => setTyped(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
      />
      <span className="number">%</span>
    </Field>
  );
}
