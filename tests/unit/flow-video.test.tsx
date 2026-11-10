import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EndTitle, FilmVideo, PageHeader, PageScrollbar, ShareFilm, StartScreen, WindowToggle } from '@/components/flow/FlowPage';
import { SITE } from '@/data/flow/site';
import { FILM_VIDEO, youtubeEmbed } from '@/data/flow/video';

afterEach(cleanup);

describe('watch as a video', () => {
  it('turns any YouTube link into a privacy-friendly embed', () => {
    const embed = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1';
    for (const link of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      ' dQw4w9WgXcQ ',
    ])
      expect(youtubeEmbed(link), link).toBe(embed);
    for (const link of ['', 'not a link', 'https://vimeo.com/123', 'https://youtube.com/watch?v=short', 'https://evil.example/watch?v=dQw4w9WgXcQ'])
      expect(youtubeEmbed(link), link).toBeNull();
  });

  it('offers the video under the window, next to the line about pressing play', () => {
    const onPlay = vi.fn();
    const onWatchVideo = vi.fn();
    render(<StartScreen visible above={100} below={500} center={{ x: 400, y: 300 }} onPlay={onPlay} onWatchVideo={onWatchVideo} />);
    expect(screen.getByText('Press play to watch the scrolling film')).toBeTruthy();
    expect(screen.queryByText('dead internet')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Watch as a Video' }));
    expect(onWatchVideo).toHaveBeenCalledOnce();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('only mounts the player while open, and says the video is coming until there is a link', () => {
    const onClose = vi.fn();
    const { container, rerender } = render(<FilmVideo open={false} onClose={onClose} />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).not.toContain('on its way');
    rerender(<FilmVideo open onClose={onClose} />);
    expect(container.querySelector('dialog')!.open).toBe(true);
    // With a link (data/flow/video.ts) it's the player; without one, the note.
    const embed = youtubeEmbed(FILM_VIDEO.youtube);
    if (embed) expect(container.querySelector('iframe')!.getAttribute('src')).toBe(embed);
    else expect(container.textContent).toContain('The video version is on its way.');
    fireEvent.click(container.querySelector('.fl-video-close')!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('share', () => {
  it('opens from a Share button next to the credits', () => {
    const onShare = vi.fn();
    render(<PageHeader interactive onShare={onShare} onHowMade={vi.fn()} />);
    expect(screen.getByText('Kiroween')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(onShare).toHaveBeenCalledOnce();
  });

  it('shows a line about the film and its link, and copies the link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const onClose = vi.fn();
    const { container, rerender } = render(<ShareFilm open={false} onClose={onClose} />);
    rerender(<ShareFilm open onClose={onClose} />);
    expect(container.querySelector('dialog')!.open).toBe(true);
    expect(screen.getByText(SITE.description)).toBeTruthy();
    const link = screen.getByRole('textbox', { name: 'Link to the film' }) as HTMLInputElement;
    expect(link.value).toBe(new URL('/', window.location.href).toString());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });
    expect(writeText).toHaveBeenCalledWith(link.value);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('the window as a play/pause button', () => {
  it('pauses on a click while playing, and carries on on the next', () => {
    let playing = true;
    const onToggle = vi.fn(() => {
      playing = !playing;
    });
    const { rerender } = render(<WindowToggle playing started isPlaying={() => playing} onToggle={onToggle} />);
    const button = screen.getByRole('button', { name: 'Pause the film' });
    fireEvent.pointerDown(button);
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
    expect(playing).toBe(false);
    rerender(<WindowToggle playing={false} started isPlaying={() => playing} onToggle={onToggle} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Play the film' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play the film' }));
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(playing).toBe(true);
  });

  it('on a phone, where the touch itself already paused, the tap leaves it paused', () => {
    let playing = true;
    const onToggle = vi.fn(() => {
      playing = !playing;
    });
    render(<WindowToggle playing started isPlaying={() => playing} onToggle={onToggle} />);
    const button = screen.getByRole('button', { name: 'Pause the film' });
    fireEvent.pointerDown(button);
    // The page stops the film on touchstart, before the click arrives.
    playing = false;
    fireEvent.click(button);
    expect(onToggle).not.toHaveBeenCalled();
    expect(playing).toBe(false);
  });
});

describe('desktop polish', () => {
  it('offers watch again and share on the end title, on the site only', () => {
    const onReplay = vi.fn();
    const onShare = vi.fn();
    render(<EndTitle onReplay={onReplay} onShare={onShare} />);
    fireEvent.click(screen.getByRole('button', { name: 'Watch again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(onReplay).toHaveBeenCalledOnce();
    expect(onShare).toHaveBeenCalledOnce();
    cleanup();
    // The movie's end title has neither.
    render(<EndTitle />);
    expect(screen.queryByRole('button', { name: 'Watch again' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
  });

  it('sizes the page scroll bar thumb from the story length, and stays out of the accessibility tree', () => {
    const { container } = render(<PageScrollbar barRef={null} total={9000} viewport={1000} onSeek={vi.fn()} />);
    const bar = container.querySelector<HTMLElement>('.fl-scrollbar')!;
    expect(bar.getAttribute('aria-hidden')).toBe('true');
    expect(bar.style.getPropertyValue('--thumb')).toBe('10.000%');
    expect(bar.querySelector('.fl-scrollbar-thumb')).toBeTruthy();
  });
});
