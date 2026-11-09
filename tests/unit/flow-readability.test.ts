import { describe, expect, it } from 'vitest';
import { FLOW_ERAS } from '@/data/flow/eras';

function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map((n) => parseInt(n, 16) / 255)
    .map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + .05) / (dark + .05);
}

describe('era readability', () => {
  it('keeps text, metadata and links readable on cards and comment surfaces', () => {
    for (const { id, tokens: t } of FLOW_ERAS) {
      for (const background of [t.surface, t.soft]) {
        for (const color of [t.text, t.muted, t.accent, t.name ?? t.text]) {
          expect(contrast(color, background), `${id}: ${color} on ${background}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(contrast(t.panelText, t.panel), `${id}: panel heading`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.accentText, t.accent), `${id}: filled button`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
