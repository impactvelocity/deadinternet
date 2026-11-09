import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowNarration } from '@/components/flow/FlowNarration';

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Ashley narration transport', () => {
  it('waits for Play even with voice enabled, then pauses and resumes', () => {
    const { container, rerender } = render(<FlowNarration era="profile" playing={false} revealing={false} enabled />);
    const audio = container.querySelector('audio')!;
    expect(audio.preload).toBe('none');
    expect(audio.play).not.toHaveBeenCalled();
    rerender(<FlowNarration era="profile" playing revealing={false} enabled />);
    expect(audio.play).toHaveBeenCalledOnce();
    audio.currentTime = 3;
    rerender(<FlowNarration era="profile" playing={false} revealing={false} enabled />);
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.currentTime).toBe(3);
    rerender(<FlowNarration era="profile" playing revealing={false} enabled />);
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(3);
  });

  it('switches clips silently while paused and plays the selected era on Play', () => {
    const { container, rerender } = render(<FlowNarration era="profile" playing={false} revealing={false} enabled />);
    const audio = container.querySelector('audio')!;
    rerender(<FlowNarration era="wall" playing={false} revealing={false} enabled />);
    expect(audio.src).toContain('ashley-wall.mp3');
    expect(audio.play).not.toHaveBeenCalled();
    rerender(<FlowNarration era="wall" playing revealing={false} enabled />);
    expect(audio.play).toHaveBeenCalledOnce();
    rerender(<FlowNarration era="cards" playing revealing={false} enabled />);
    expect(audio.src).toContain('ashley-cards.mp3');
    expect(audio.currentTime).toBe(0);
    expect(audio.play).toHaveBeenCalledTimes(2);
    rerender(<FlowNarration era="cards" playing revealing enabled />);
    expect(audio.play).toHaveBeenCalledTimes(2);
  });

  it('obeys mute while playing and across era changes', () => {
    const { container, rerender } = render(<FlowNarration era="profile" playing revealing={false} enabled={false} />);
    const audio = container.querySelector('audio')!;
    expect(audio.play).not.toHaveBeenCalled();
    rerender(<FlowNarration era="profile" playing revealing={false} enabled />);
    expect(audio.play).toHaveBeenCalledOnce();
    rerender(<FlowNarration era="profile" playing revealing={false} enabled={false} />);
    rerender(<FlowNarration era="wall" playing revealing={false} enabled={false} />);
    expect(audio.play).toHaveBeenCalledOnce();
  });

  it('shows a retry instruction after a playback rejection', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('NotAllowedError'));
    const { rerender } = render(<FlowNarration era="profile" playing revealing={false} enabled />);
    expect(await screen.findByRole('status')).toBeTruthy();
    rerender(<FlowNarration era="profile" playing revealing={false} enabled={false} />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<FlowNarration era="profile" playing revealing={false} enabled />);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
  });
});
