# Implementation Plan: scroll-story-polish

## Overview

The rebuild proceeds from the inside out. First the test tooling is installed and the old `components/`, `scenes/`, `data/`, and `lib/` files are removed. Next come the pure `lib/story` core and the `data/` registries, each checked by Vitest + fast-check property tests. Then the audio and client runtime modules (ProgressStore, DiscreteStore, FrameApplier, autoplay), followed by the React components (OS frames, browser chrome, Site_Pages, reveal world, cursor, controls). The last step wires everything into `ScrollStory` and `app/page.tsx`. All code is TypeScript and follows the Next.js 16.4.5 conventions in `node_modules/next/dist/docs/`. Images are referenced through the Asset_Manifest and render as same-size placeholders until the Owner adds approved files.

## Tasks

- [x] 1. Set up test tooling and clear the old implementation
  - [x] 1.1 Install test dependencies and configure Vitest
    - Add dev dependencies: `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `fast-check`
    - Add `"test": "vitest --run"` to `package.json` scripts
    - Create `vitest.config.mts` following `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md` (react plugin, tsconfig paths, `environment: 'jsdom'`, include `tests/**/*.test.{ts,tsx}`)
    - Create `tests/properties/` and `tests/unit/` and one trivial passing test so `npm test` runs
    - Make sure `eslint.config.mjs` and `tsconfig.json` accept the test files and config
    - _Requirements: 15.1, 15.2, 15.3_

  - [x] 1.2 Delete the old implementation and stub the page
    - Delete `components/AutoPlayBar.tsx`, `BrowserChrome.tsx`, `FeedPost.tsx`, `MuteButton.tsx`, `ScriptedCursor.tsx`, `ScrollFilm.tsx`; all of `scenes/`; `data/cursor-script.ts`, `data/posts.ts`, `data/scenes.ts`; `lib/audio.ts`, `lib/autoplay.ts`, `lib/gsap-config.ts`
    - Replace `app/page.tsx` with a minimal Server Component that renders an empty `<main>` so `npm run build` and `npm run lint` pass during the rebuild
    - _Requirements: 15.2, 15.3_

- [x] 2. Implement pure foundation utilities
  - [x] 2.1 Implement seeded randomness in `lib/story/rng.ts`
    - `mulberry32(seed)` returning a deterministic generator in [0, 1) and `seededPick(seed, items)`
    - _Requirements: 15.5_

  - [ ]* 2.2 Write property test for seeded randomness
    - **Property 21: Seeded randomness is reproducible**
    - **Validates: Requirements 15.5**

  - [x] 2.3 Implement Era ranges in `lib/story/ranges.ts`
    - `computeEraRanges(weights)` producing contiguous ranges from 0 to 1 with length ∝ weight
    - `eraIndexAt(ranges, p)` with binary search, half-open ranges, last range closed at 1, input clamped and `NaN` handled
    - _Requirements: 1.2, 1.5_

  - [ ]* 2.4 Write property test for Era ranges
    - **Property 1: Era ranges partition the story**
    - **Validates: Requirements 1.2, 1.5**

  - [x] 2.5 Implement scroll mapping and viewport fit
    - `lib/story/scroll-map.ts`: `progressToScroll(p, maxScroll)` and `scrollToProgress(y, maxScroll)` with clamping and `maxScroll ≤ 0 → 0`
    - `lib/story/fit.ts`: `fitScale(vw, vh, design, reservedBottom)` returning a centered uniform `{ scale, x, y }`
    - _Requirements: 10.8, 13.2, 13.3_

  - [ ]* 2.6 Write property test for scroll mapping
    - **Property 14: Scroll mapping round trip**
    - **Validates: Requirements 10.8, 13.3**

  - [ ]* 2.7 Write property test for viewport fit
    - **Property 20: Viewport fit is uniform and contained**
    - **Validates: Requirements 13.2**

- [x] 3. Implement the Era_Registry, profiles, Asset_Manifest, and themes
  - [x] 3.1 Create `data/profiles.ts` and `data/eras.ts`
    - `PROFILES` for `xp-ie6`, `xp-firefox2` (1024×768, controls right, status bar, taskbar) and `mac-chrome` (1280×800, controls left, no status bar, menu bar), with fonts, cursor sets, loading indicators, and status messages from the design
    - `ERAS` with every field for all ten Eras in story order (weight, year, sitePage, url, title, favicon, profile, fixed clock strings, holdMs, audioBed); `EraId` derived from `ERAS` and declared only here; `SitePageId`, `BedId`, and `STORY` constants
    - Use `import type { AssetId }` from `./assets` (completed in 3.2)
    - _Requirements: 1.1, 1.3, 4.1, 4.2, 4.3, 4.8, 13.1_

  - [x] 3.2 Create the Asset_Manifest in `data/assets.ts` and the asset folders
    - `AssetEntry`, `AssetDescription` (subject, apparentAge, setting, photoStyle), `AssetKind`, and `ASSETS` with `AssetId` derived from it
    - One entry, `approved: false`, for every favicon (16×16), MySpace profile photo (170×213) and Top 8 avatars (90×90), feed author avatars (48×48 or 40×40 by Era), feed post images (period sizes), reveal images (wallpaper 1280×800), audio beds (`audio.bed.<id>`), and sfx, with paths following the design's conventions and `alt` text derived from each description
    - Write descriptions detailed enough for the Owner to source or generate each image for its simulated year
    - Create `public/assets/{avatars,posts,favicons,myspace,reveal}/` and `public/audio/{beds,sfx}/` with `.gitkeep` files so the Owner can drop files in later
    - _Requirements: 4.7, 7.1, 7.6, 12.8_

  - [x] 3.3 Create Site_Page themes in `data/themes.ts`
    - `SiteTheme` objects for `loading-xp`, `myspace-2006`, `facebook-2010`, `facebook-2014`, `facebook-2019` with font stacks ending in a generic family, sizes (Facebook 2010 body 11px, MySpace 10px Verdana/Tahoma), colors, and spacing
    - Export a helper that converts a theme into `--t-*` CSS custom properties for a page root `style`
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 3.4 Implement `validateRegistry()` in `lib/story/validate.ts`
    - Report non-positive weights, missing fields, duplicate ids, reveal not last, Browser_Profile change without a Site_Page change, and URL typing span below 3% of the incoming Era
    - Throw at module load in development, log once in production
    - _Requirements: 1.1, 3.7, 4.6_

  - [ ]* 3.5 Write unit tests for registry, profiles, manifest, and themes
    - Canonical Era order and complete fields; every non-reveal Era has a year and profile; the three required profiles exist; XP width is 1024
    - Every favicon and asset id referenced by `ERAS` exists in `ASSETS`; every manifest entry has a `/public` path, Era, non-empty structured description, dimensions, and approval flag
    - Theme font stacks end in a generic family; `validateRegistry(ERAS)` returns no errors
    - _Requirements: 1.1, 4.1, 4.2, 4.7, 6.5, 7.1, 7.6, 13.1_

- [x] 4. Implement asset resolution and placeholders
  - [x] 4.1 Implement the pure resolver in `lib/assets/resolve.ts`
    - `resolveAsset(entry, present)` returning an image only when the entry is approved and present, otherwise an `avatar` or `box` placeholder, always carrying the entry's width, height, and alt
    - _Requirements: 7.3, 7.4, 7.5, 7.7_

  - [ ]* 4.2 Write property test for asset resolution
    - **Property 11: Asset resolution**
    - **Validates: Requirements 7.3, 7.4, 7.5, 7.7**

  - [x] 4.3 Implement the server-only presence check in `lib/assets/presence.server.ts`
    - `import 'server-only'`; compute `PRESENT_ASSET_IDS` with `existsSync(join(process.cwd(), 'public', path))` at module scope, per the caching guide's predictable-values rules
    - _Requirements: 7.3, 7.7, 12.8, 12.9_

  - [x] 4.4 Implement `Placeholder`, `StoryImage`, and the asset context
    - `components/story/StoryContext.tsx`: `'use client'` `AssetContext` providing the present-id set (extended in 17.2)
    - `components/story/Placeholder.tsx`: `role="img"`, `aria-label={alt}`, fixed width and height; grey silhouette for avatars, labelled box (asset id and dimensions) otherwise
    - `components/story/StoryImage.tsx`: `next/image` with `unoptimized`, explicit `width`/`height` and matching inline style, `alt`, `preload` or `loading="eager"` when `eager`; `onError` swaps to the placeholder
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.7_

  - [ ]* 4.5 Write unit tests for `StoryImage` and `Placeholder`
    - Approved and present renders `<img>` with manifest width, height, and alt; missing or unapproved renders a placeholder with the same size and accessible name; an `error` event swaps to the placeholder
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 5. Implement the timeline compiler
  - [x] 5.1 Create the cursor script in `data/cursor-script.ts`
    - `CursorActionDef`, `CursorEffect`, `TargetName`, `TargetKind` types and Era-relative actions for MySpace (hover Top 8, click comment box, type comment) and each feed Era (likes, expanding comments, typing replies), naming targets that components will mark with `data-cursor-target`
    - _Requirements: 11.1, 11.4, 11.5, 11.6_

  - [x] 5.2 Implement one-shot events in `lib/story/events.ts`
    - `TimelineEvent` type and `crossedEvents(events, prev, next)` returning forward-crossed events in order, empty when `next ≤ prev`
    - _Requirements: 12.7_

  - [x] 5.3 Implement `compileTimeline()` in `lib/story/compile.ts`
    - Ranges from weights; a `NavWindow` at each Site_Page change except into reveal; `pageSpans` with `scrollStart` at the end of the incoming navigation
    - Convert Era-relative cursor times to absolute `moveStart/arrive/pressStart/pressEnd/end` with seeds; insert an address-bar click at each `nav.start`; shift overlapping actions forward and collect errors
    - `nav-start` events at `typingEnd`, `mouse-click` events at each click `pressStart`; hold points at Era start or `nav.end`; `spacerVh = Σweight × vhPerWeight`
    - _Requirements: 1.2, 1.4, 3.1, 3.6, 5.1, 8.3, 10.3, 12.7_

  - [ ]* 5.4 Write property test for compiled positions
    - **Property 2: Compiled positions follow Era-relative definitions**
    - **Validates: Requirements 1.4**

  - [ ]* 5.5 Write property test for navigation placement
    - **Property 3: Navigations and profile changes occur only at Site_Page changes**
    - **Validates: Requirements 3.1, 3.6, 4.6, 5.1**

  - [ ]* 5.6 Write property test for one-shot events
    - **Property 19: One-shot events fire once per forward crossing**
    - **Validates: Requirements 12.7**

- [x] 6. Implement navigation, chrome, and dial-up state
  - [x] 6.1 Implement `lib/story/nav.ts` and `lib/story/dial-status.ts`
    - `navStateAt(navs, p)` with typing and loading phases; `paintStageAt(u)` with thresholds 0.15, 0.35, 0.55, 0.75, 0.95
    - `dialStatusAt(t)` with thresholds 0.30, 0.55, 0.80
    - _Requirements: 3.3, 3.5, 8.1, 8.2_

  - [x] 6.2 Implement `lib/story/chrome-state.ts`
    - `chromeStateAt(c, p)`: typed URL prefix with `ceil` reveal and caret during typing; loading flag, load progress, and profile status messages during loading; "Done" briefly after; registry URL otherwise
    - `chromeIdentityAt(c, p)`: outgoing Era's title and favicon until the navigation ends, then the active Era's
    - _Requirements: 3.2, 3.4, 3.6, 3.7_

  - [ ]* 6.3 Write property test for staged progress functions
    - **Property 9: Staged progress functions are monotonic**
    - **Validates: Requirements 3.3, 8.2**

  - [ ]* 6.4 Write property test for chrome state
    - **Property 8: Chrome state during and after navigation**
    - **Validates: Requirements 3.2, 3.4, 3.6, 3.7**

- [x] 7. Implement page scroll, cursor, interactions, and camera functions
  - [x] 7.1 Implement `lib/story/page-scroll.ts`
    - `pageAnchors(span, layout)` forced non-decreasing and clamped to `[0, contentHeight − viewportHeight]`
    - `pageOffsetAt(span, anchors, p, ranges)`: 0 before `scrollStart`, piecewise linear between anchors per Era, final offset held through reveal
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 7.2 Write property test for page offset
    - **Property 4: Page offset is monotonic and linear within an Era**
    - **Validates: Requirements 2.2, 2.3**

  - [x] 7.3 Implement `lib/story/cursor-path.ts`
    - `minimumJerk(t) = 10t³ − 15t⁴ + 6t⁵`; `cursorPathPoint(p0, p1, seed, t)` as a quadratic Bézier with seeded normal offset `k ∈ ±[0.12, 0.28]`; constant point when `p0 = p1`
    - _Requirements: 11.2_

  - [ ]* 7.4 Write property test for cursor paths
    - **Property 15: Cursor paths are curved and eased**
    - **Validates: Requirements 11.2**

  - [x] 7.5 Implement `lib/story/cursor.ts`
    - `TargetLayout` and `LayoutSnapshot` types (re-exported from `frame.ts` in 8.1) and a default zero layout
    - `resolveTarget(layout, name, p, c)` using the Page_Viewport origin and `pageOffsetAt` for page targets, fixed positions for chrome targets, `null` for unknown targets with a one-time development warning
    - `cursorAt(c, layout, p)`: rest point before the first action, curved tracking during moves, hand/ibeam/busy/arrow pointer rules, pressed flag
    - _Requirements: 11.1, 11.3, 11.4, 11.8_

  - [ ]* 7.6 Write property test for target resolution
    - **Property 16: Targets resolve at the current scroll offset**
    - **Validates: Requirements 11.3**

  - [x] 7.7 Implement `lib/story/interactions.ts`
    - `interactionStateAt(actions, p)` as a pure fold: hover in `[arrive, pressStart)`, pressed in `[pressStart, pressEnd)`, effects for `p ≥ pressEnd`, focus from `arrive` and typed prefix for type actions
    - _Requirements: 11.4, 11.5, 11.6, 11.7_

  - [ ]* 7.8 Write property test for interaction windows
    - **Property 17: Interaction windows**
    - **Validates: Requirements 11.4, 11.5, 11.6**

  - [x] 7.9 Implement `lib/story/camera.ts` and `lib/story/glitch.ts`
    - `CAMERA_KEYS` and `cameraAt(t, reduced)`: log-scale and focus interpolation with `power2.inOut` per segment; world opacity fade-in over the first 5%; reduced motion jumps to keyframes at segment midpoints with a `fadeToBlack` dip
    - `glitchFxAt(eraT, reduced)` using `mulberry32`; zero shift and skew under reduced motion
    - _Requirements: 9.1, 9.2, 9.3, 9.6, 14.1_

  - [ ]* 7.10 Write property test for camera and motion effects
    - **Property 12: Camera and motion effects**
    - **Validates: Requirements 9.2, 9.3, 9.6, 14.1**

- [x] 8. Implement `frameAt` and the autoplay plan
  - [x] 8.1 Implement `lib/story/frame.ts`
    - `FrameState` and `frameAt(c, layout, p, motion)` composing era, eraT, visible page (feed during reveal), page stages, page offsets, nav, chrome, identity, profile (last profile during reveal), dial status, cursor, interactions, glitch, and camera
    - _Requirements: 1.5, 2.2, 2.4, 2.8, 3.5, 9.3, 11.1, 11.8_

  - [ ]* 8.2 Write property test for Site_Page visibility
    - **Property 7: Exactly one Site_Page is visible outside navigation**
    - **Validates: Requirements 2.8**

  - [x] 8.3 Implement `lib/story/autoplay-plan.ts`
    - `buildAutoplayPlan(c, p0)`: travel steps to each hold point ahead of `p0`, a hold of `holdMs` after each, a final travel to 1; empty at 1
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6_

  - [ ]* 8.4 Write property test for the autoplay plan
    - **Property 13: Autoplay plan is continuous and holds at every Era ahead**
    - **Validates: Requirements 10.2, 10.3, 10.5, 10.6**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement the Audio_Engine
  - [x] 10.1 Implement the pure mixer in `lib/audio/mixer.ts`
    - `planCrossfade(active, target, now, crossfadeMs)`: at most two beds, latest target gain 1, others 0, same-bed request returns no change, oldest fading bed stopped on a third request
    - _Requirements: 12.3, 12.4, 12.5_

  - [ ]* 10.2 Write property test for crossfade mixing
    - **Property 18: Crossfade mixing**
    - **Validates: Requirements 12.3, 12.4, 12.5**

  - [x] 10.3 Implement procedural beds and sfx in `lib/audio/procedural.ts`
    - `dialup`, `midi`, `feed-calm`, `feed-ads`, `feed-noise`, `glitch`, `server-hum` beds and `nav-start`/`mouse-click` sfx as Web Audio graphs with `start/fade/stop`, using `mulberry32` for any randomness and an injected shared scheduler for note sequencing
    - _Requirements: 12.9_

  - [x] 10.4 Implement `lib/audio/engine.ts`
    - `'use client'` `createAudioEngine(present)`: starts muted; unmute resumes `Howler.ctx`, starts the active bed, fades in over 500 ms; mute fades master to 0 over 200 ms then pauses; `setBed` applies `planCrossfade` with 1500 ms; `playSfx` ignored while muted
    - `selectBedSource(bed, present)` picks a looping Howl `FileBed` when the manifest entry is present, else the procedural bed; `onloaderror` falls back to procedural; procedural sources connect to `Howler.masterGain`
    - One 100 ms look-ahead scheduler; `dispose()` stops all sources, clears the scheduler, unloads Howls; a rejected `resume()` keeps the engine muted
    - _Requirements: 12.1, 12.2, 12.3, 12.6, 12.7, 12.8, 12.9, 12.10_

  - [ ]* 10.5 Write unit tests for the Audio_Engine
    - With mocked Howler and a fake `AudioParam`: starts muted; unmute ramps over 500 ms; mute ramps master over 200 ms; file bed when present, procedural when absent; `dispose()` clears timers (fake timers)
    - _Requirements: 12.1, 12.2, 12.6, 12.8, 12.9, 12.10_

- [x] 11. Implement the client runtime modules
  - [x] 11.1 Implement `lib/runtime/gsap.ts` and `lib/runtime/motion.ts`
    - Register `ScrollTrigger` and `useGSAP` once on the client
    - Reduced-motion store reading `matchMedia('(prefers-reduced-motion: reduce)')` only in effects, `false` on the server snapshot
    - _Requirements: 14.1, 14.2, 15.5_

  - [x] 11.2 Implement `lib/runtime/progress-store.ts` and `lib/runtime/discrete-store.ts`
    - `ProgressStore` with `setTarget`, `jump` (marks seek), and `tick(dtMs, smoothingMs)` exponential smoothing (0 ms under reduced motion), clamping and ignoring `NaN`
    - `DiscreteStore` with `getSnapshot`, `getServerSnapshot` (p = 0), `subscribe`, and `update` that replaces the snapshot only when era, visible page, profile, identity, or reduced flag changes; small autoplay and mute status stores for `useSyncExternalStore`
    - _Requirements: 2.5, 2.6, 13.3_

  - [ ]* 11.3 Write property test for the discrete store
    - **Property 6: Discrete snapshot changes only on discrete changes**
    - **Validates: Requirements 2.5, 2.6**

  - [x] 11.4 Implement `lib/runtime/frame-applier.ts`
    - `DomSink` interface (`setTransform`, `setVar`, `setAttr`, `setText`, `setValue`), a ref-backed sink with `bind(key)` React 19 ref callbacks returning cleanup, and an exported in-memory sink for tests
    - `createFrameApplier(sink)` diffing against the last applied frame and writing only transforms, `--s-*` vars, `data-s-*` attributes, typed text, and slider value/`aria-valuetext`; `reset()` clears the cache
    - _Requirements: 2.4, 2.5, 3.3, 3.5, 11.4, 11.5, 11.6, 11.7_

  - [ ]* 11.5 Write property test for frame determinism
    - **Property 5: Frame state depends only on progress**
    - Use random progress walks that go backward across clicks, typing, and navigations through the real applier and the in-memory sink
    - **Validates: Requirements 2.4, 3.5, 9.3, 11.1, 11.7, 11.8**

  - [x] 11.6 Implement `lib/runtime/layout-measure.ts`
    - `measureLayout(root)` reading page content heights, Page_Viewport heights, `[data-era-section]` tops, `[data-cursor-target]` rects, and viewport origins in design px (dividing out the fit and camera scale)
    - _Requirements: 2.2, 11.3, 13.3_

  - [x] 11.7 Implement `lib/runtime/autoplay-controller.ts` and `lib/runtime/input-interrupt.ts`
    - `AutoplayController` with `play/stop/toggle/subscribe/dispose`: one `gsap.timeline` of `power2.inOut` travel tweens on a proxy and empty hold tweens, durations `max(minSegment, Δp × secondsPerStory)`, `onUpdate` calling `window.scrollTo` via `progressToScroll`, `onComplete` setting status stopped; no auto-start
    - Interrupt listeners for `wheel`, `touchstart`, and navigation keys that call `stop()`; a Space handler that toggles and calls `preventDefault()` except in `input`, `textarea`, `select`, `button`, or `contenteditable` targets; all listeners removable
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 14.2, 14.4, 15.6_

  - [ ]* 11.8 Write unit tests for runtime controls
    - Wheel/touch/key interrupts stop autoplay without changing scroll; Space toggles outside fields and not inside an `input` or `button`; under mocked reduced motion, play is available and not running until activated; disposing removes listeners
    - _Requirements: 10.4, 10.5, 14.2, 14.4, 15.6_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Create feed and MySpace content data
  - [x] 13.1 Create `data/feed-posts.ts`
    - `FeedEraId`, `PostKind`, `FeedAuthor`, `FeedComment`, `FeedPost` types; six posts per feed Era with `k` non-organic posts where `k` is the Era's feed index; all dead-internet authors `isBot: true`; glitch posts with duplicated text across two authors, one avatar reused under three names, and a header/comment name mismatch
    - Fixed `timestampText` strings; avatars and images as `AssetId`s (add any missing entries to `data/assets.ts`)
    - `orderFeed(posts)` stable sort by Era_Registry order and `nonOrganicShare(posts, era)`
    - _Requirements: 5.2, 5.3, 5.5, 5.6, 5.7, 7.2, 15.5_

  - [x] 13.2 Create `data/feed-styles.ts` and `data/myspace-profile.ts`
    - `FEED_STYLES` exactly per the design table (at most one changed key per boundary)
    - MySpace profile content: header links, profile photo asset, Details and Interests rows, Top 8 friends with avatar assets, Friends Comments
    - _Requirements: 5.4, 6.1_

  - [ ]* 13.3 Write property test for feed ordering
    - **Property 10: Feed ordering follows Era order**
    - **Validates: Requirements 5.2**

  - [ ]* 13.4 Write unit tests for feed data
    - Non-organic share strictly increasing and equal to `k/6`; adjacent `FEED_STYLES` differ in at most one key; dead-internet authors all bots; glitch cues present; every post has all required fields and its asset ids exist in the manifest
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 7.1_

- [x] 14. Build the OS frames, browser chrome, and Browser_Window
  - [x] 14.1 Implement `components/os/XpFrame.tsx`, `XpTaskbar.tsx`, `MacFrame.tsx`, `MacMenuBar.tsx`
    - XP Luna title bar with minimize, maximize, close on the right and a taskbar clock; macOS title bar with close, minimize, zoom on the left and a menu-bar clock; clock text from the Era_Registry only; title from the discrete identity
    - _Requirements: 4.3, 4.4, 4.5, 4.8, 15.5_

  - [x] 14.2 Implement `components/chrome/Ie6Chrome.tsx`, `Firefox2Chrome.tsx`, `ChromeMac.tsx`, `cursors.tsx`
    - Period toolbars, address bars with an empty `[data-s-typed]` span and caret bound to the applier, profile loading indicators driven by `data-s-loading`, status bar (IE6, Firefox 2) or status bubble (Chrome), favicon via `StoryImage`, `chrome.address` cursor target
    - `cursors.tsx`: arrow, hand, ibeam, and busy sprites for the `xp` and `mac` cursor sets
    - _Requirements: 3.2, 3.4, 3.6, 3.7, 4.3, 4.7, 11.4_

  - [x] 14.3 Implement `components/story/BrowserWindow.tsx` and `components/story/PageViewport.tsx`
    - Select OS frame and chrome from the discrete profile; lay out at the profile's design size; `PageViewport` clips the Site_Pages and keeps all three mounted with visibility from `data-s-*` attributes
    - _Requirements: 2.1, 2.8, 4.3, 4.6, 13.1_

  - [ ]* 14.4 Write unit tests for OS frames and chrome
    - XP frame renders window controls on the right and macOS on the left; clocks render the registry strings; chrome favicon renders through `StoryImage`
    - _Requirements: 4.4, 4.5, 4.7, 4.8_

- [x] 15. Build the Site_Pages and runtime-driven CSS
  - [x] 15.1 Implement `components/pages/LoadingPage.tsx` and `DialUpDialog.tsx`
    - Blank IE6 page and XP "Connect Dial-up Connection" dialog with modem icon and all four status lines in JSX, shown by `data-s-dial`, with "Dialing…" visible when no attribute is set
    - _Requirements: 8.1, 8.2_

  - [x] 15.2 Implement `components/pages/MySpacePage.tsx`
    - 2006 header with search and nav links, profile photo, Details and Interests tables, "ashley's Friend Space" Top 8 grid, Friends Comments table, comment box target; `myspace-2006` theme vars; `data-paint` on header, layout, text, and image elements; `data-cursor-target`/`data-cursor-kind` on scripted targets
    - _Requirements: 3.3, 6.1, 6.3, 6.4, 7.2, 11.3_

  - [x] 15.3 Implement the Continuous_Feed components in `components/pages/feed/`
    - `FeedHeader` and `FeedSidebar` styled from the active Era's `FEED_STYLES`; `FeedColumn` with one `<section data-era-section>` per feed Era from `orderFeed(FEED_POSTS)` plus a trailing "loading more stories" block at least one viewport tall
    - `FeedPost` rendering avatar and image via `StoryImage`, per-section post layout and reaction style, base and incremented like-count spans, comment box with `[data-s-typed]` and caret, cursor targets, glitch cue markup
    - `FeedPage` composing them with the Facebook theme (blue header, left sidebar, News Feed, 11px Lucida Grande/Tahoma) and `data-paint` attributes
    - _Requirements: 3.3, 5.1, 5.2, 5.4, 5.6, 6.2, 6.3, 6.4, 7.2, 11.3, 11.5, 11.6_

  - [x] 15.4 Write runtime-driven rules in `app/globals.css`
    - Tailwind v4 import and `@theme` tokens; `data-s-stage` progressive paint rules with top-down image `clip-path`; `data-s-dial` status lines; `data-s-cursor` hover and pressed styles; `data-s-liked`/`data-s-focused`/`data-s-posted` states; blinking caret animation; glitch `--s-glitch-*` vars; stage `visibility: hidden` until `data-s-ready`; fit and camera transforms from `--s-fit-*`
    - `prefers-reduced-motion` rules replacing zoom, shake, and glitch distortion with opacity changes
    - _Requirements: 3.3, 5.6, 8.2, 11.4, 11.5, 11.6, 13.2, 14.1_

  - [ ]* 15.5 Write unit tests for Site_Pages
    - MySpace renders header, profile photo, Details, Interests, Top 8, and comments; feed renders blue header, sidebar, and News Feed with 11px body theme; `FeedPost` renders `StoryImage` for avatar and image; dial-up dialog renders all status lines
    - _Requirements: 6.1, 6.2, 7.2, 8.1_

- [x] 16. Build the reveal world, cursor, camera, and controls
  - [x] 16.1 Implement `components/reveal/DeskScene.tsx`, `AgentPanel.tsx`, `ServerRoom.tsx`, `RevealWorld.tsx`
    - Monitor bezel around the Browser_Window, second monitor with `AgentPanel` log lines derived statically from compiled actions, Mac mini, keyboard and mouse; SVG server room with racks laid out by `mulberry32(REVEAL_SEED)` and the desk unit on a rack shelf; no `Date` or `Math.random`
    - _Requirements: 9.1, 9.2, 9.4, 15.5_

  - [x] 16.2 Implement `components/reveal/useLedTimeline.ts`
    - `useGSAP` building one `gsap.timeline({ repeat: -1, paused: true })` with seeded blink offsets per LED, playing only while the reveal is active, reverted on cleanup; no `setInterval`
    - _Requirements: 9.5, 15.6_

  - [x] 16.3 Implement `components/story/ScriptedCursor.tsx` and `components/story/Camera.tsx`
    - Cursor element bound to the applier transform and `data-s-pointer`, sprite set from the active profile, placed inside the Browser_Window within `Camera`
    - `Camera` wrapping the Browser_Window and `RevealWorld`, with world opacity var, black fade overlay, and `will-change: transform` only while the reveal is active
    - _Requirements: 9.1, 9.3, 11.1, 11.4, 11.9_

  - [x] 16.4 Implement `components/controls/PlayButton.tsx`, `MuteButton.tsx`, `ProgressSlider.tsx`, `ControlBar.tsx`
    - Play: `aria-label` "Play story"/"Pause story", `aria-pressed`; Mute: "Unmute sound"/"Mute sound", initial muted
    - Slider: native range 0–1000 with `aria-label="Story progress"`, value and `aria-valuetext` written by the applier, `input` calling `autoplay.stop()`, `progressStore.jump(p)`, and `window.scrollTo`; stops arrow-key propagation; visible Era label from the discrete snapshot
    - _Requirements: 10.6, 10.7, 10.8, 12.1, 14.3_

  - [ ]* 16.5 Write unit tests for LEDs and controls
    - LED hook creates one timeline and calls no `setInterval`; controls have accessible names, respond to Enter/Space and arrow keys, and the slider shows the Era label
    - _Requirements: 9.5, 10.7, 10.8, 14.3_

- [ ] 17. Wire the Scroll_Story together
  - [x] 17.1 Implement `lib/runtime/frame-loop.ts`
    - `createStoryRuntime(...)`: ScrollTrigger on the spacer feeding `progressStore.setTarget`; a `gsap.ticker` callback that ticks the store, calls `frameAt`, applies the frame, updates the discrete store, plays `crossedEvents` (discarded on seek), and sets the audio bed on Era change
    - Resize and ScrollTrigger refresh handling that saves progress, recomputes fit, restores scroll with `progressToScroll`, and re-measures layout; recompute fit when the discrete Browser_Profile changes (1024×768 XP vs 1280×800 macOS); `dispose()` removing everything
    - _Requirements: 2.4, 2.5, 2.6, 12.3, 12.7, 13.2, 13.3, 15.6_

  - [x] 17.2 Implement `components/story/ScrollStory.tsx` and extend `components/story/StoryContext.tsx`
    - `'use client'` root with the tall spacer, fixed stage, `Camera`, `BrowserWindow`, `ScriptedCursor`, and `ControlBar`; contexts for runtime binding, discrete snapshot (`useSyncExternalStore`), autoplay and mute status, and present assets
    - Create the runtime, autoplay controller, interrupts, and audio engine inside `useGSAP({ scope })`; re-measure after `document.fonts.ready` and after discrete re-renders via `useLayoutEffect`; set `data-s-ready` after the first frame; clean up all of it on unmount
    - _Requirements: 1.4, 2.1, 2.5, 2.6, 10.1, 12.1, 12.10, 13.3, 15.4, 15.6_

  - [ ] 17.3 Update `app/page.tsx`, `app/layout.tsx`, and `next.config.ts`
    - `page.tsx` as a Server Component importing `PRESENT_ASSET_IDS` and rendering `<ScrollStory presentAssetIds={...} />`
    - `layout.tsx` exporting `metadata` and `viewport` per the Next 16 docs; keep `cacheComponents: true` in `next.config.ts`
    - _Requirements: 7.7, 15.1, 15.4_

  - [ ]* 17.4 Write integration tests for the assembled story
    - React `<Profiler>` around `ScrollStory`: 200 progress values inside one Era produce zero commits
    - Cursor element is a descendant of the camera element
    - Unmount removes ticker callbacks, listeners, ScrollTrigger instances, and audio timers (spies and fake timers)
    - `renderToString` twice with different mocked `Date.now` and `Math.random` yields identical markup
    - _Requirements: 2.5, 4.8, 9.4, 11.9, 12.10, 15.5, 15.6_

- [ ] 18. Final checkpoint - Ensure all tests pass
  - Ensure `npm test`, `npm run build`, and `npm run lint` pass with zero errors, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Property tests use fast-check with at least 100 runs and carry the comment `// Feature: scroll-story-polish, Property N: <title>`.
- Every asset starts as `approved: false`, so the story renders same-size placeholders until the Owner adds a file under `/public` and flips the flag in `data/assets.ts`.
- Requirement 2.7 (≥ 55 fps) and the browser-console hydration check (15.4) are manual checks outside this task list. The diffed frame applier and the `renderToString` determinism test support them.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5", "3.1", "3.3"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "2.7", "3.2", "3.4"] },
    { "id": 3, "tasks": ["3.5", "4.1", "4.3", "5.1", "5.2"] },
    { "id": 4, "tasks": ["4.2", "4.4", "5.3"] },
    { "id": 5, "tasks": ["4.5", "5.4", "5.5", "5.6", "6.1", "7.1", "7.3", "7.7", "7.9", "8.3", "10.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "7.2", "7.4", "7.8", "7.10", "8.4", "10.2", "10.3"] },
    { "id": 7, "tasks": ["6.4", "7.5", "10.4"] },
    { "id": 8, "tasks": ["7.6", "8.1", "10.5", "11.1"] },
    { "id": 9, "tasks": ["8.2", "11.2", "11.4", "11.6", "11.7", "13.1"] },
    { "id": 10, "tasks": ["11.3", "11.5", "11.8", "13.2", "13.3"] },
    { "id": 11, "tasks": ["13.4", "14.1", "14.2", "15.1", "15.2", "16.1", "16.2", "16.4"] },
    { "id": 12, "tasks": ["14.4", "15.3", "16.5"] },
    { "id": 13, "tasks": ["14.3", "15.4", "15.5", "16.3", "17.1"] },
    { "id": 14, "tasks": ["17.2"] },
    { "id": 15, "tasks": ["17.3"] },
    { "id": 16, "tasks": ["17.4"] }
  ]
}
```
