/**
 * What the film says about itself: the page title and description (the
 * <head> tags in app/layout.tsx) and the share pop-up use the same words.
 */
export const SITE = {
  name: 'Dead Internet',
  title: 'Dead Internet — a scrolling short film',
  description:
    'Twenty years of the internet in one scroll, from MySpace to the endless feed, and the question of who’s still here. A short film by Dylan Jones for Kiroween.',
} as const;

/**
 * Screens too small to play the scrolling film on: phones, upright or on
 * their side. They get the film as a video and the story to read instead
 * (components/story). Keep in step with the media query in story.css.
 */
export const PHONE_QUERY = '(max-width: 600px), (max-height: 500px) and (pointer: coarse)';
