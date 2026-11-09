import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowMusic } from '@/components/flow/FlowMusic';
import narration from '@/data/flow/narration.json';
import { FILM_ERAS, FILM_POSTS } from '@/data/flow/scenes';
import { MUSIC, musicCues, musicGain } from '@/lib/flow/music';
import { PLAY_SPEED } from '@/lib/flow/playback';
import { compileTimeline } from '@/lib/flow/timeline';
import { fakeMeasure } from '../fixtures/flow-measure';

const timeline = compileTimeline(FILM_ERAS, FILM_POSTS, fakeMeasure(FILM_ERAS, FILM_POSTS));
const cues = musicCues(timeline);

describe('score levels', () => {
  it('ships the track, long enough to run under the whole film from the first word', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'public', MUSIC.src))).toBe(true);
    expect(MUSIC.durationSeconds).toBeGreaterThanOrEqual(timeline.total / PLAY_SPEED);
  });

  it('fades in with the voice and stays soft under every spoken line', () => {
    expect(musicGain(0, cues)).toBe(0);
    expect(musicGain(MUSIC.fadeIn * PLAY_SPEED, cues)).toBeCloseTo(MUSIC.soft, 9);
    const speechEnds = timeline.revealStart + (narration.reveal.sandboxDurationSeconds + narration.reveal.subscription.durationSeconds) * PLAY_SPEED;
    expect(cues.swellFrom).toBeGreaterThanOrEqual(speechEnds - 1e-6);
    for (const s of [...timeline.eraStarts.slice(1), timeline.revealStart, speechEnds]) {
      expect(musicGain(s, cues)).toBeCloseTo(MUSIC.soft, 9);
    }
  });

  it('swells after the last line and is loudest from the end card to the end', () => {
    const card = timeline.reveal.find((r) => r.phase === 'end')!;
    expect(cues.swellTo).toBe(card.s0);
    let previous = musicGain(cues.swellFrom, cues);
    for (let i = 1; i <= 40; i++) {
      const next = musicGain(cues.swellFrom + ((cues.swellTo - cues.swellFrom) * i) / 40, cues);
      expect(next).toBeGreaterThan(previous);
      previous = next;
    }
    // Most of the rise lands in the final stretch, just before the end.
    const half = musicGain((cues.swellFrom + cues.swellTo) / 2, cues);
    expect(half).toBeLessThanOrEqual(MUSIC.loud * 0.5 + 1e-9);
    expect(musicGain(cues.swellTo, cues)).toBeCloseTo(MUSIC.loud, 9);
    expect(musicGain(timeline.total, cues)).toBeCloseTo(MUSIC.loud, 9);
  });
});

describe('score transport', () => {
  const position = { current: 0 };
  const props = { position, cues, total: timeline.total };
  let tick: FrameRequestCallback;

  beforeEach(() => {
    position.current = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { tick = callback; return 1; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('starts with Play, follows the story clock and pauses with it', () => {
    position.current = 10 * PLAY_SPEED;
    const { container, rerender } = render(<FlowMusic {...props} playing={false} enabled />);
    const audio = container.querySelector<HTMLAudioElement>('[data-flow-music]')!;
    expect(audio.getAttribute('src')).toBe(MUSIC.src);
    expect(audio.play).not.toHaveBeenCalled();
    expect(audio.currentTime).toBe(10);
    rerender(<FlowMusic {...props} playing enabled />);
    expect(audio.play).toHaveBeenCalledOnce();
    expect(audio.volume).toBeCloseTo(MUSIC.soft, 9);
    position.current = 12 * PLAY_SPEED;
    act(() => tick(16));
    expect(audio.currentTime).toBe(12);
    rerender(<FlowMusic {...props} playing={false} enabled />);
    expect(audio.pause).toHaveBeenCalled();
  });

  it('sets the level once, through Web Audio, leaving the element at full volume', () => {
    const levels: number[] = [];
    class FakeContext {
      currentTime = 0;
      destination = {};
      createGain() {
        const node = { gain: { value: 0, setValueAtTime: (v: number) => levels.push(v), setTargetAtTime: (v: number) => levels.push(v) }, connect: (to: unknown) => to };
        return node;
      }
      createMediaElementSource() { return { connect: (to: unknown) => to, disconnect() {} }; }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }
    vi.stubGlobal('AudioContext', FakeContext);
    try {
      position.current = 30 * PLAY_SPEED;
      const { container, rerender } = render(<FlowMusic {...props} playing={false} enabled />);
      const audio = container.querySelector<HTMLAudioElement>('[data-flow-music]')!;
      rerender(<FlowMusic {...props} playing enabled />);
      act(() => tick(16));
      expect(audio.volume).toBe(1);
      expect(levels.at(-1)).toBeCloseTo(MUSIC.soft, 9);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('stays silent with sound off and before the timeline exists', () => {
    const { container, rerender } = render(<FlowMusic {...props} playing enabled={false} />);
    const audio = container.querySelector<HTMLAudioElement>('[data-flow-music]')!;
    expect(audio.preload).toBe('none');
    rerender(<FlowMusic {...props} cues={null} playing enabled />);
    expect(audio.play).not.toHaveBeenCalled();
    rerender(<FlowMusic {...props} playing enabled />);
    expect(audio.play).toHaveBeenCalledOnce();
  });

  it('lets the last notes ring out if the film ever ends before the track', () => {
    // The film is cut to the score, but a shorter cut shouldn't chop the music.
    const total = (MUSIC.durationSeconds - 2) * PLAY_SPEED;
    position.current = total - PLAY_SPEED;
    const { container, rerender } = render(<FlowMusic {...props} total={total} playing enabled />);
    const audio = container.querySelector<HTMLAudioElement>('[data-flow-music]')!;
    position.current = total;
    act(() => tick(16));
    rerender(<FlowMusic {...props} total={total} playing={false} enabled />);
    expect(audio.pause).not.toHaveBeenCalled();
    expect(audio.volume).toBeCloseTo(MUSIC.loud, 9);
    // Scrubbing away from the end stops it.
    position.current = total / 2;
    act(() => tick(16));
    expect(audio.pause).toHaveBeenCalled();
  });
});
