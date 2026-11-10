import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EndTitle, PageHeader } from '@/components/flow/FlowPage';
import { HowItsMade } from '@/components/flow/HowItsMade';
import { FILM_ERAS } from '@/data/flow/scenes';

afterEach(cleanup);

describe("how it's made", () => {
  it('opens from the header and from the end title (not in the movie)', () => {
    const onHowMade = vi.fn();
    render(<PageHeader interactive onShare={vi.fn()} onHowMade={onHowMade} />);
    fireEvent.click(screen.getByRole('button', { name: 'How it’s made' }));
    expect(onHowMade).toHaveBeenCalledOnce();
    cleanup();
    render(<EndTitle onHowMade={onHowMade} />);
    fireEvent.click(screen.getByRole('button', { name: 'How it’s made' }));
    expect(onHowMade).toHaveBeenCalledTimes(2);
    cleanup();
    render(<EndTitle />);
    expect(screen.queryByRole('button', { name: 'How it’s made' })).toBeNull();
  });

  it('only mounts its contents while open, and draws the same post in every era\'s tokens', () => {
    const onClose = vi.fn();
    const onPlayFrom = vi.fn();
    const { container, rerender } = render(<HowItsMade open={false} onClose={onClose} onPlayFrom={onPlayFrom} />);
    expect(container.querySelector('.fl-made-demo')).toBeNull();
    rerender(<HowItsMade open onClose={onClose} onPlayFrom={onPlayFrom} />);
    expect(container.querySelector('dialog')!.open).toBe(true);
    const demos = [...container.querySelectorAll<HTMLElement>('.fl-made-demo')];
    expect(demos.map((d) => d.closest('li')!.style.getPropertyValue('--f-font'))).toEqual(FILM_ERAS.map((e) => e.tokens.font));
    expect(container.querySelector('.fl-made-year')!.textContent).toBe(String(FILM_ERAS[0].year));
    // Each era can start the film from there.
    fireEvent.click(container.querySelectorAll('.fl-made-play')[2]);
    expect(onPlayFrom).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
