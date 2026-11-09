import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostVideo } from '@/components/flow/PostVideo';
import { FLOW_POSTS } from '@/data/flow/posts';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const props = { src: '/clip.mp4', poster: '/thumbnail.jpg', label: 'Ice bucket challenge', duration: 5 };

describe('post video playback', () => {
  it('ships the five-second challenge GIF without loading a video', () => {
    const media = FLOW_POSTS.viral[0].media!;
    expect(media.src).toBe('/assets/posts/viral-1.jpg');
    expect(media.durationSeconds).toBe(5);
    expect(media.videoSrc).toBeUndefined();
    expect(media.animatedSrc).toBe('/assets/posts/viral-1.gif');
    expect(existsSync(join(__dirname, '../../public', media.animatedSrc!))).toBe(true);
  });
  it('plays without player chrome and offers pause and replay on the video', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const { container } = render(<PostVideo {...props} />);
    const video = container.querySelector('video')!;
    expect(video.poster).toContain('/thumbnail.jpg');
    expect(video.preload).toBe('none');
    expect(play).not.toHaveBeenCalled();
    expect(screen.getByText('0:05')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Play Ice bucket challenge' }));
    expect(play).toHaveBeenCalledOnce();
    expect(video.muted).toBe(false);
    fireEvent.play(video);
    expect(video.controls).toBe(false);
    expect(screen.getByRole('button', { name: 'Pause Ice bucket challenge' })).toBeTruthy();
    expect(screen.queryByText('0:05')).toBeNull();
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    Object.defineProperty(video, 'paused', { configurable: true, value: false });
    fireEvent.click(screen.getByRole('button'));
    expect(pause).toHaveBeenCalledOnce();
    fireEvent.pause(video);
    expect(screen.getByRole('button', { name: 'Play Ice bucket challenge' })).toBeTruthy();
    fireEvent.play(video);
    Object.defineProperty(video, 'ended', { configurable: true, value: true });
    video.currentTime = 5;
    fireEvent.ended(video);
    fireEvent.click(screen.getByRole('button', { name: 'Play Ice bucket challenge' }));
    expect(video.currentTime).toBe(0);
    expect(play).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('plays scripted watch actions muted and pauses when the action ends', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const { container, rerender } = render(<PostVideo {...props} watching />);
    expect(play).toHaveBeenCalledOnce();
    expect(container.querySelector('video')!.muted).toBe(true);
    rerender(<PostVideo {...props} watching={false} />);
    expect(pause).toHaveBeenCalledOnce();
  });

  it('offers retry when the browser rejects playback', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('unavailable'));
    render(<PostVideo {...props} />);
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
  });
});
