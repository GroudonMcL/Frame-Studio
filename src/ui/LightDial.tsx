// The light-direction dial in the stage bar (owner's decision after Phase 1).
// Drag the sun round the dial, or use the arrow keys; Shift snaps to 15°.
// Stored as stage.light: the direction the light comes from, in degrees
// (0 right, 90 below, 225 top left).

import { useId, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { DEFAULT_LIGHT } from '../project/types';
import { commit, updateStage } from '../state/projectStore';
import { HelpTip } from './controls';
import { helpFor, hintId } from './help';

const NAMES = ['right', 'bottom right', 'bottom', 'bottom left', 'left', 'top left', 'top', 'top right'];

/** "top left" etc. for a light direction. */
const lightName = (deg: number) => NAMES[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

const norm = (d: number) => Math.round((((d % 360) + 360) % 360) * 10) / 10;

export function LightDial({ value }: { value: number }) {
  const dial = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const help = hintId(useId());
  const fromPointer = (e: React.PointerEvent) => {
    const r = dial.current!.getBoundingClientRect();
    const deg = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    return norm(e.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg));
  };
  const a = (value * Math.PI) / 180;
  return (
    <div className="light-control">
      <span className="field-label">
        Light
        <HelpTip id={help} text={helpFor('Light direction')!} />
      </span>
      <div
        ref={dial}
        className="light-dial"
        role="slider"
        tabIndex={0}
        aria-label="Light direction"
        aria-describedby={help}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(value)}
        aria-valuetext={`${Math.round(value)}°, from the ${lightName(value)}`}
        title="Where the light comes from. Drag the sun round; Shift snaps to 15°."
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateStage({ light: fromPointer(e) }, { transient: true });
        }}
        onPointerMove={(e) => dragging.current && updateStage({ light: fromPointer(e) }, { transient: true })}
        onPointerUp={() => {
          dragging.current = false;
          commit();
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 15 : 5;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') updateStage({ light: norm(value + step) });
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') updateStage({ light: norm(value - step) });
          else return;
          e.preventDefault();
        }}
      >
        <svg viewBox="-24 -24 48 48" width="48" height="48" aria-hidden="true">
          <circle r="21" className="dial-ring" />
          <circle r="9" className="dial-token" />
          <line x1="0" y1="0" x2={Math.cos(a) * 15} y2={Math.sin(a) * 15} className="dial-ray" />
          <circle cx={Math.cos(a) * 17} cy={Math.sin(a) * 17} r="4.5" className="dial-sun" />
        </svg>
      </div>
      <span className="light-value">from the {lightName(value)}</span>
      {value !== DEFAULT_LIGHT ? (
        <button type="button" className="icon-btn" aria-label="Light from the top left again" title="Back to the top left (Token Maker's light)" onClick={() => updateStage({ light: DEFAULT_LIGHT })}>
          <RotateCcw size={16} />
        </button>
      ) : (
        // Keeps the button's room, so moving the light never changes the bar's layout (or the canvas's size).
        <span className="icon-btn" aria-hidden="true" />
      )}
    </div>
  );
}
