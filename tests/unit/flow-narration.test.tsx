import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowNarration } from '@/components/flow/FlowNarration';
import script from '@/data/flow/narration.json';
import { PLAY_SPEED } from '@/lib/flow/playback';
import * as voiceEffects from '@/lib/flow/voice-effects';

const position = { current: 0 };
const clock = { position, eraStart: 0 };
let tick: FrameRequestCallback;

beforeEach(() => {
  position.current = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { tick = callback; return 1; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Ashley narration transport', () => {
  it('waits for Play even with voice enabled, then pauses and resumes', () => {
    const { container, rerender } = render(<FlowNarration {...clock} era="profile" playing={false} revealing={false} enabled />);
    const audio = container.querySelector('audio')!;
    expect(audio.preload).toBe('auto');
    expect(container.querySelector('[data-flow-audio-preload]')?.getAttribute('src')).toBe(script.chunks[1].src);
    expect(audio.play).not.toHaveBeenCalled();
    rerender(<FlowNarration {...clock} era="profile" playing revealing={false} enabled />);
    expect(audio.play).toHaveBeenCalledOnce();
    audio.currentTime = 3;
    position.current = 3 * PLAY_SPEED;
    rerender(<FlowNarration {...clock} era="profile" playing={false} revealing={false} enabled />);
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.currentTime).toBe(3);
    rerender(<FlowNarration {...clock} era="profile" playing revealing={false} enabled />);
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(3);
  });

  it('switches clips silently while paused and plays the selected era on Play', () => {
    const { container, rerender } = render(<FlowNarration {...clock} era="profile" playing={false} revealing={false} enabled />);
    const audio = container.querySelector('audio')!;
    rerender(<FlowNarration {...clock} era="wall" playing={false} revealing={false} enabled />);
    expect(audio.src).toContain(script.chunks.find((c) => c.era === 'wall')!.src);
    expect(audio.play).not.toHaveBeenCalled();
    rerender(<FlowNarration {...clock} era="wall" playing revealing={false} enabled />);
    expect(audio.play).toHaveBeenCalledOnce();
    rerender(<FlowNarration {...clock} era="cards" playing revealing={false} enabled />);
    expect(audio.src).toContain(script.chunks.find((c) => c.era === 'cards')!.src);
    expect(audio.currentTime).toBe(0);
    expect(audio.play).toHaveBeenCalledTimes(2);
    rerender(<FlowNarration {...clock} era="cards" playing revealing enabled />);
    expect(audio.src).toContain(script.reveal.src);
    expect(audio.play).toHaveBeenCalledTimes(3);
  });

  it('plays the reveal voice from the reveal clock and follows seeking and pause', () => {
    const eraStart = 50000;
    position.current = eraStart;
    const { container, rerender } = render(<FlowNarration {...clock} eraStart={eraStart} era="dead" playing revealing enabled />);
    const audio = container.querySelector('audio')!;
    expect(audio.src).toContain(script.reveal.src);
    expect(audio.currentTime).toBe(0);
    expect(audio.play).toHaveBeenCalledOnce();
    position.current = eraStart + 5 * PLAY_SPEED;
    act(() => tick(16));
    expect(audio.currentTime).toBe(5);
    rerender(<FlowNarration {...clock} eraStart={eraStart} era="dead" playing={false} revealing enabled />);
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.currentTime).toBe(5);
  });

  it('starts the opportunity clean, glitches by clip time, and restores clean reveal audio', async () => {
    const graph = { setRobot: vi.fn(), resume: vi.fn().mockResolvedValue(undefined), dispose: vi.fn() };
    const create = vi.spyOn(voiceEffects, 'createVoiceEffects').mockReturnValue(graph);
    const { rerender, unmount } = render(<FlowNarration {...clock} era="machine" playing revealing={false} enabled />);
    expect(graph.setRobot).toHaveBeenLastCalledWith(false);
    expect(graph.resume).toHaveBeenCalledOnce();
    rerender(<FlowNarration {...clock} era="dead" playing revealing={false} enabled />);
    expect(graph.setRobot).toHaveBeenLastCalledWith(false);
    // A flicker on "selling it"...
    position.current = 3.5 * PLAY_SPEED;
    act(() => tick(16));
    expect(graph.setRobot).toHaveBeenLastCalledWith(true);
    position.current = 3.8 * PLAY_SPEED;
    act(() => tick(32));
    expect(graph.setRobot).toHaveBeenLastCalledWith(false);
    // ...and "having friends again" goes fully robotic.
    position.current = 11.8 * PLAY_SPEED;
    act(() => tick(48));
    expect(graph.setRobot).toHaveBeenLastCalledWith(true);
    // Seeking back to the opening restores the normal voice.
    position.current = 0;
    act(() => tick(64));
    expect(graph.setRobot).toHaveBeenLastCalledWith(false);
    expect(create).toHaveBeenCalledOnce();
    rerender(<FlowNarration {...clock} era="dead" playing revealing enabled />);
    expect(graph.setRobot).toHaveBeenLastCalledWith(false);
    unmount();
    await Promise.resolve();
    expect(graph.dispose).toHaveBeenCalledOnce();
  });

  it('obeys mute while playing and across era changes', () => {
    const { container, rerender } = render(<FlowNarration {...clock} era="profile" playing revealing={false} enabled={false} />);
    const audio = container.querySelector('audio')!;
    expect(audio.play).not.toHaveBeenCalled();
    rerender(<FlowNarration {...clock} era="profile" playing revealing={false} enabled />);
    expect(audio.play).toHaveBeenCalledOnce();
    rerender(<FlowNarration {...clock} era="profile" playing revealing={false} enabled={false} />);
    rerender(<FlowNarration {...clock} era="wall" playing revealing={false} enabled={false} />);
    expect(audio.play).toHaveBeenCalledOnce();
  });

  it('shows a retry instruction after a playback rejection', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('NotAllowedError'));
    const { rerender } = render(<FlowNarration {...clock} era="profile" playing revealing={false} enabled />);
    expect(await screen.findByRole('status')).toBeTruthy();
    rerender(<FlowNarration {...clock} era="profile" playing revealing={false} enabled={false} />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<FlowNarration {...clock} era="profile" playing revealing={false} enabled />);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
  });

  it('seeks within a clip and always plays at 1×', () => {
    const eraStart = 1000;
    position.current = eraStart + 2 * PLAY_SPEED;
    const { container, rerender } = render(<FlowNarration {...clock} eraStart={eraStart} era="profile" playing={false} revealing={false} enabled />);
    const audio = container.querySelector('audio')!;
    expect(audio.currentTime).toBe(2);
    position.current = eraStart + 4 * PLAY_SPEED;
    act(() => tick(16));
    expect(audio.currentTime).toBe(4);
    rerender(<FlowNarration {...clock} eraStart={eraStart} era="profile" playing revealing={false} enabled />);
    expect(audio.playbackRate).toBe(1);
    expect(audio.currentTime).toBe(4);
    expect(audio.play).toHaveBeenCalledOnce();
  });

  it('holds silence after narration, including pause/resume and voice toggles', () => {
    const { container, rerender } = render(<FlowNarration {...clock} era="profile" playing revealing={false} enabled />);
    const audio = container.querySelector('audio')!;
    position.current = (script.chunks[0].durationSeconds + 1) * PLAY_SPEED;
    act(() => tick(16));
    expect(audio.currentTime).toBe(script.chunks[0].durationSeconds);
    expect(audio.pause).toHaveBeenCalled();
    rerender(<FlowNarration {...clock} era="profile" playing={false} revealing={false} enabled={false} />);
    rerender(<FlowNarration {...clock} era="profile" playing revealing={false} enabled />);
    expect(audio.play).toHaveBeenCalledOnce();
    position.current = 2 * PLAY_SPEED;
    act(() => tick(32));
    expect(audio.currentTime).toBe(2);
    expect(audio.play).toHaveBeenCalledTimes(2);
  });

  it('unmutes at the current story position instead of resuming stale audio', () => {
    const { container, rerender } = render(<FlowNarration {...clock} era="profile" playing revealing={false} enabled={false} />);
    position.current = 3 * PLAY_SPEED;
    rerender(<FlowNarration {...clock} era="profile" playing revealing={false} enabled />);
    expect(container.querySelector('audio')!.currentTime).toBe(3);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });

  it('lets a slightly late final syllable finish before the quiet beat', () => {
    const { container } = render(<FlowNarration {...clock} era="profile" playing revealing={false} enabled />);
    const audio = container.querySelector('audio')!;
    const duration = script.chunks[0].durationSeconds;
    audio.currentTime = duration - 0.05;
    position.current = (duration + 0.05) * PLAY_SPEED;
    vi.mocked(audio.pause).mockClear();
    act(() => tick(16));
    expect(audio.pause).not.toHaveBeenCalled();
    position.current = (duration + 0.3) * PLAY_SPEED;
    act(() => tick(32));
    expect(audio.pause).toHaveBeenCalledOnce();
  });

});
