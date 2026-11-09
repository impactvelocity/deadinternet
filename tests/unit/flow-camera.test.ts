import { describe, expect, it } from 'vitest';
import { cameraAt, FIELD, GRID_SIZE, PAGE, PAGE_WINDOW, WINDOW_PLACEMENT } from '@/lib/flow/camera';
import { FLOW_TIMING, REVEAL_PHASES } from '@/lib/flow/timeline';

describe('flow reveal camera', () => {
  it('takes over with the browser window exactly where it sat on the page', () => {
    const cam = cameraAt('sandbox', 0);
    expect(cam.z * WINDOW_PLACEMENT.scale).toBeCloseTo(1, 9);
    expect(WINDOW_PLACEMENT.x * cam.z + cam.tx).toBeCloseTo(PAGE_WINDOW.x, 6);
    expect(WINDOW_PLACEMENT.y * cam.z + cam.ty).toBeCloseTo(PAGE_WINDOW.y, 6);
  });

  it('never jumps between phases', () => {
    for (let i = 1; i < REVEAL_PHASES.length; i++) {
      const a = cameraAt(REVEAL_PHASES[i - 1], 1);
      const b = cameraAt(REVEAL_PHASES[i], 0);
      expect(b.z).toBeCloseTo(a.z, 9);
      expect(b.tx).toBeCloseTo(a.tx, 6);
      expect(b.ty).toBeCloseTo(a.ty, 6);
    }
  });

  it('only ever pulls back, to the end of the film', () => {
    let last = Infinity;
    for (const phase of REVEAL_PHASES) {
      for (let u = 0; u <= 1; u += 0.05) {
        const { z } = cameraAt(phase, u);
        expect(z, phase).toBeLessThanOrEqual(last + 1e-9);
        last = z;
      }
    }
    // The ending packs about twice as many dots across the screen as the rows did.
    expect(cameraAt('end', 1).z).toBeLessThan(cameraAt('dots', 1).z * 0.6);
  });

  it('keeps moving at the same speed from the session grid into the field', () => {
    const dt = 0.1;
    const before = cameraAt('servers', 1 - dt / FLOW_TIMING.reveal.servers);
    const boundary = cameraAt('farm', 0);
    const after = cameraAt('farm', dt / FLOW_TIMING.reveal.farm);
    const incoming = (Math.log(boundary.z) - Math.log(before.z)) / dt;
    const outgoing = (Math.log(after.z) - Math.log(boundary.z)) / dt;
    expect(incoming).toBeLessThan(-0.0001);
    expect(outgoing).toBeCloseTo(incoming, 6);
  });

  it('keeps the pattern field under the whole page at the farthest zoom', () => {
    const cam = cameraAt('end', 1);
    const left = FIELD.x * cam.z + cam.tx;
    const top = FIELD.y * cam.z + cam.ty;
    expect(left).toBeLessThanOrEqual(0);
    expect(top).toBeLessThanOrEqual(0);
    expect(left + FIELD.w * cam.z).toBeGreaterThanOrEqual(PAGE.w);
    expect(top + FIELD.h * cam.z).toBeGreaterThanOrEqual(PAGE.h);
    expect(FIELD.x).toBeLessThan(0);
    expect(FIELD.x + FIELD.w).toBeGreaterThan(GRID_SIZE.w);
  });
});
