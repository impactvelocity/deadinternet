/**
 * The glass in front of the site: the screen it is being watched on, which
 * gets newer with every era (lib/flow/display.ts). An old CRT for 2005, a
 * washed-out LCD, glossy glass, then nothing at all.
 *
 * Strengths are CSS custom properties written every frame by the lab
 * (`paintDisplay`); the layers and their motion live in flow.css under
 * "Screen display". It sits over the whole screen, cursor included, and
 * takes no clicks. It also rounds the screen's corners: a round CRT tube in
 * 2005, sharpening to the plain screen by 2024.
 */
import type { Ref } from 'react';
import { type DisplayLook, isClear } from '@/lib/flow/display';

const KEYS = ['scan', 'tube', 'flicker', 'grain', 'panel', 'glare'] as const satisfies readonly (keyof DisplayLook)[];
/** Fringe steps (design px): text shadows repaint the whole feed when they change, so change them rarely. */
const FRINGE_STEP = 0.15;
/** The screen's own corner radius (design px) once the old screens are gone. */
export const SCREEN_RADIUS = 12;
/** Radius steps (design px): reshaping the screen repaints its shadow, so step rather than glide. */
const RADIUS_STEP = 2;
/** Scanline pitch in real px. Drawn at screen pixels, not design px, so a small window can't alias them into bands. */
const SCAN_PITCH = 3;

export function ScreenDisplay({ displayRef }: { displayRef: Ref<HTMLDivElement> }) {
  return (
    <div ref={displayRef} aria-hidden className="fl-display" data-display="off">
      <div className="fl-d-grain" />
      <div className="fl-d-panel" />
      <div className="fl-d-glare" />
      <div className="fl-d-scan" />
      <div className="fl-d-flicker" />
      <div className="fl-d-roll" />
      <div className="fl-d-tube" />
    </div>
  );
}

/** The screen's corner radius in design px for `look`. */
export function screenRadius(look: DisplayLook): number {
  return SCREEN_RADIUS + Math.round(look.corner / RADIUS_STEP) * RADIUS_STEP;
}

/**
 * Write `look` to the overlay, the corner radius to the screen, and the
 * colour fringe to the screen's text.
 * `pxPerUnit` is how many real px one screen design px covers right now (the
 * page fit times the window's growth). Skips writes that change nothing.
 */
export function paintDisplay(overlay: HTMLElement | null, screen: HTMLElement | null, look: DisplayLook, pxPerUnit: number) {
  if (!overlay) return;
  const off = isClear(look);
  if (!off && pxPerUnit > 0) {
    // Keep the scanlines on whole device pixels as the window grows.
    const k = Number(overlay.dataset.k);
    if (!(Math.abs(pxPerUnit / k - 1) < 5e-4)) {
      const dpr = window.devicePixelRatio || 1;
      overlay.dataset.k = String(pxPerUnit);
      overlay.style.setProperty('--d-k', pxPerUnit.toFixed(5));
      overlay.style.setProperty('--d-pitch', `${Math.max(2, Math.round(SCAN_PITCH * dpr)) / dpr}px`);
    }
  }
  const values = KEYS.map((key) => look[key].toFixed(3));
  const fringe = Math.round(look.fringe / FRINGE_STEP) * FRINGE_STEP;
  const radius = screenRadius(look);
  const key = off ? 'off' : `${values.join(',')}|${fringe.toFixed(2)}|${radius}`;
  if (overlay.dataset.look === key) return;
  overlay.dataset.look = key;
  overlay.dataset.display = off ? 'off' : 'on';
  KEYS.forEach((name, i) => overlay.style.setProperty(`--d-${name}`, values[i]));
  if (screen) {
    screen.dataset.fringe = fringe > 0 ? 'on' : 'off';
    screen.style.setProperty('--d-fringe', fringe.toFixed(2));
    screen.style.borderRadius = `${radius}px`;
  }
}
