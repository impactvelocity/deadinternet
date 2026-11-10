'use client';
/**
 * Decides who gets the scrolling film. It needs a wide screen and a scroll
 * bar to play on, so phones (PHONE_QUERY) get the story page instead
 * (components/story), which the server always renders and CSS shows only to
 * them. The film is loaded in the browser alone and only when it will be
 * shown, so a phone never downloads or runs it.
 */
import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';
import { PHONE_QUERY } from '@/data/flow/site';

const FlowLab = dynamic(() => import('./FlowLab').then((m) => m.FlowLab), { ssr: false });

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const isPhone = () => typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;
/** Unknown on the server: neither is drawn until the browser says which. */
const unknown = () => null;

export function FilmGate() {
  const phone = useSyncExternalStore<boolean | null>(subscribe, isPhone, unknown);
  return phone === false ? <FlowLab /> : null;
}
