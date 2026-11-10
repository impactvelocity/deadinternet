import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MobileStory, REVEAL_BEATS } from '@/components/story/MobileStory';
import { StoryVideo } from '@/components/story/StoryParts';
import narration from '@/data/flow/narration.json';
import { FILM_ERAS } from '@/data/flow/scenes';

afterEach(cleanup);

describe('the phone page', () => {
  it('tells the story era by era, in the narration’s own words', () => {
    const { container } = render(<MobileStory />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dead Internet');
    const chapters = [...container.querySelectorAll('.ms-chapter')];
    expect(chapters).toHaveLength(FILM_ERAS.length);
    chapters.forEach((chapter, k) => {
      const era = FILM_ERAS[k];
      expect(chapter.querySelector('.ms-when')!.textContent).toBe(String(era.year));
      expect(chapter.querySelector('blockquote p')!.textContent).toBe(narration.chunks.find((c) => c.era === era.id)!.text);
      expect(chapter.querySelector('img')!.getAttribute('src')).toMatch(new RegExp(`^/assets/story/${era.year}-`));
    });
    // The page darkens as it goes: dark ink first, light ink by the end.
    expect(chapters[0].getAttribute('data-ink')).toBe('dark');
    expect(chapters.at(-1)!.getAttribute('data-ink')).toBe('light');
  });

  it('keeps the reveal’s words in step with the narration', () => {
    const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
    expect(squash(REVEAL_BEATS.map((b) => b.says).join(' '))).toBe(squash(narration.reveal.text));
  });

  it('ends on the upsell, whose button only goes back to the top', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(<MobileStory />);
    expect(screen.getByText('$29.99')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to keep being you' }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    scrollTo.mockRestore();
  });

  it('only loads the player once the poster is pressed', () => {
    const { container } = render(<StoryVideo />);
    expect(container.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Play the film' }));
    expect(container.querySelector('iframe')!.getAttribute('src')).toContain('youtube-nocookie.com/embed/');
  });
});
