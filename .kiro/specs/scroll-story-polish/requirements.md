# Requirements Document

## Introduction

The "dead internet" site is a single-page scroll story that walks the viewer through the history of social media, from dial-up and MySpace through the Facebook years to an internet filled with bots and AI content, ending with a reveal that the viewer has been watching an AI agent on a Mac mini inside a server farm.

This feature rebuilds the story so that it reads as one continuous, believable browser session. The viewer looks at a fixed browser window inside a period-accurate operating system window. Scrolling moves the page content inside that window. Moves between sites look like real page navigations, and the browser and OS evolve with the year (Internet Explorer 6 on Windows XP, then Firefox, then Chrome on macOS). All Facebook eras form one long feed that changes gradually as the viewer scrolls. Emoji placeholders are replaced with photo avatars and post images served from `/public`, tracked in an asset manifest that the owner fills with approved stock or AI-generated images.

The era lineup stays the same: dial-up loading, MySpace, Facebook, early ads, Cambridge Analytica, algorithmic feed, glitch/bot reveal, AI content, dead internet, and the reveal. Autoplay, the scripted cursor, and era audio are kept and rebuilt so they follow the same scroll timeline.

The existing UI may be discarded. Current defects this feature addresses: all scenes render as stacked absolute layers with fixed 700 ms opacity crossfades; React state updates on every scroll event; scenes compute local progress but their content does not scroll; the browser chrome supports only two styles and mixes macOS and Windows controls; era scroll positions are hard-coded in four places; avatars are emoji; audio hard-stops on era change and duplicates the Era type; the cursor interpolates linearly and clicks unreliably; the reveal scene reads the current time during render and runs one interval timer per LED.

Stack constraints: Next.js 16.4.5 (conventions differ from earlier versions; the bundled docs in `node_modules/next/dist/docs/` are authoritative), React 19.3, Tailwind CSS v4, GSAP 3.15 with `@gsap/react`, howler, framer-motion, TypeScript.

## Glossary

- **Scroll_Story**: The complete single-page experience rendered at the site root, including all eras, the Browser_Window, controls, cursor, and audio.
- **Story_Progress**: A number from 0 to 1 that represents the viewer's position in the Scroll_Story, where 0 is the start of the Loading_Scene and 1 is the end of the Reveal_Scene.
- **Story_Timeline**: The single ordered mapping from Story_Progress to era, page content scroll offset, navigation events, cursor actions, and audio cues.
- **Era**: One named segment of the Scroll_Story. The Eras, in order, are: loading, myspace, facebook, early-ads, cambridge, algo-hell, glitch, ai-era, dead-internet, reveal.
- **Era_Registry**: The single source-code definition that lists every Era with its order, relative length, simulated year, site, URL, page title, favicon, Browser_Profile, autoplay hold time, and audio cue.
- **Browser_Profile**: The combination of OS_Window style and Browser_Chrome style used for a given simulated year (for example, Windows XP with Internet Explorer 6).
- **OS_Window**: The rendered operating system window frame around the browser, including title bar, window controls, and taskbar or menu bar where applicable.
- **Browser_Chrome**: The rendered browser user interface: tabs or title, toolbar, navigation buttons, address bar, status bar, and loading indicator.
- **Browser_Window**: The fixed on-screen composition of the OS_Window, the Browser_Chrome, and the Page_Viewport.
- **Page_Viewport**: The content area inside the Browser_Chrome where web page content is displayed and scrolled.
- **Site_Page**: The full-height content of one simulated website (the loading screen, the MySpace profile, or the Continuous_Feed) that scrolls inside the Page_Viewport.
- **Navigation_Transition**: The simulated page load shown when the Scroll_Story moves from one Site_Page to another, including address bar change, loading indicator, blank or partial paint, and progressive rendering of the new Site_Page.
- **Continuous_Feed**: The single Facebook Site_Page that spans the facebook, early-ads, cambridge, algo-hell, glitch, ai-era, and dead-internet Eras.
- **Feed_Post**: One item in the Continuous_Feed, such as a status update, photo post, ad, sponsored post, or bot-generated post.
- **Loading_Scene**: The dial-up connection sequence shown in the loading Era.
- **Reveal_Scene**: The final Era, in which the view zooms out from the Browser_Window to an AI agent running on a Mac mini, then further out to a room of server racks.
- **Asset_Manifest**: A single file that lists every image and audio asset used by the Scroll_Story, with its file path under `/public`, Era, intended content description, pixel dimensions, and approval status.
- **Placeholder_Asset**: A neutral stand-in image (for example, a grey silhouette or labelled box) shown when an asset listed in the Asset_Manifest is missing or not yet approved.
- **Autoplay_Controller**: The component that advances Story_Progress automatically when the viewer presses play.
- **Era_Hold**: The time, in milliseconds, that the Autoplay_Controller pauses at the start of an Era before continuing.
- **Scripted_Cursor**: The on-screen mouse pointer that simulates a person browsing: moving, hovering, clicking, and typing.
- **Cursor_Action**: One entry in the Story_Timeline that tells the Scripted_Cursor to move to a target element, hover, click, or type text.
- **Audio_Engine**: The module that plays and mixes era background audio and one-shot sound effects.
- **Era_Bed**: The looping or sustained background audio associated with one or more Eras.
- **Viewer**: The person viewing the Scroll_Story in a web browser.
- **Owner**: The person who maintains the site and supplies or approves image assets.

## Requirements

### Requirement 1: Single source of truth for the story timeline

**User Story:** As the Owner, I want every era's position, length, and metadata defined in one place, so that I can reorder or resize eras without editing several files.

#### Acceptance Criteria

1. THE Era_Registry SHALL define every Era in story order with its relative length, simulated year, URL, page title, favicon path, Browser_Profile, Era_Hold, and audio cue.
2. THE Scroll_Story SHALL derive the Story_Progress start and end of each Era from the relative lengths in the Era_Registry.
3. THE Scroll_Story SHALL define the Era identifier type once and import that type wherever an Era identifier is used.
4. WHEN the Owner changes the relative length of an Era in the Era_Registry, THE Story_Timeline SHALL update the Story_Progress ranges of all Eras, the Cursor_Action timings, the audio cue positions, and the Autoplay_Controller targets without edits to any other file.
5. THE Story_Timeline SHALL return exactly one Era for every Story_Progress value from 0 to 1 inclusive.

### Requirement 2: Continuous browser session with real scrolling

**User Story:** As a Viewer, I want scrolling to move the web page inside a fixed browser window, so that it feels like I am browsing rather than watching slides swap.

#### Acceptance Criteria

1. THE Browser_Window SHALL remain fixed in the browser viewport while the Viewer scrolls through the loading Era to the dead-internet Era.
2. WHILE an Era other than reveal is active, THE Page_Viewport SHALL display the active Site_Page at a vertical scroll offset determined by Story_Progress.
3. WHEN Story_Progress increases within a single Site_Page, THE Page_Viewport SHALL move the Site_Page content upward by a distance proportional to the Story_Progress change.
4. WHEN Story_Progress decreases, THE Page_Viewport SHALL move the Site_Page content downward, so that scrolling backward reproduces the earlier view at the same Story_Progress.
5. WHILE the Viewer scrolls, THE Scroll_Story SHALL update the Page_Viewport scroll offset, Scripted_Cursor position, and animated visuals without re-rendering the React component tree on each scroll event.
6. THE Scroll_Story SHALL re-render React components only when the active Era, the active Site_Page, or a discrete UI state (such as mute or autoplay status) changes.
7. WHILE the Viewer scrolls on a device that reports a display refresh rate of 60 Hz, THE Scroll_Story SHALL render at an average of at least 55 frames per second measured over any 5-second scroll interval on a 2020-or-newer laptop.
8. THE Scroll_Story SHALL render exactly one Site_Page inside the Page_Viewport at any Story_Progress outside a Navigation_Transition.

### Requirement 3: Era changes as real page navigations

**User Story:** As a Viewer, I want moving between sites to look like a real page load, so that the jump from one era to the next feels like something I did in the browser.

#### Acceptance Criteria

1. WHEN Story_Progress crosses from one Site_Page to a different Site_Page, THE Browser_Chrome SHALL perform a Navigation_Transition.
2. WHILE a Navigation_Transition is in progress, THE Browser_Chrome SHALL show the new URL in the address bar, the loading indicator of the active Browser_Profile, and a status bar message where the active Browser_Profile has a status bar.
3. WHILE a Navigation_Transition is in progress, THE Page_Viewport SHALL render the incoming Site_Page progressively in the order: blank page, page header, page layout, text content, images.
4. WHEN a Navigation_Transition completes, THE Browser_Chrome SHALL display the page title and favicon of the new Era from the Era_Registry.
5. THE Navigation_Transition SHALL be driven by Story_Progress, so that scrolling backward through a Navigation_Transition plays the transition in reverse to the previous Site_Page.
6. WHEN Story_Progress crosses from one Era to another Era on the same Site_Page, THE Browser_Chrome SHALL update the address bar and page title to the values from the Era_Registry without performing a Navigation_Transition.
7. WHEN the address bar URL changes during a Navigation_Transition, THE Browser_Chrome SHALL display the URL as if typed, revealing characters in sequence over a span of at least 3% of the incoming Era's Story_Progress range.

### Requirement 4: Browser and operating system evolve by year

**User Story:** As a Viewer, I want the browser and operating system window to match the year being shown, so that the passage of time is visible in the tools themselves.

#### Acceptance Criteria

1. THE Era_Registry SHALL assign each Era other than reveal a simulated year and one Browser_Profile.
2. THE Scroll_Story SHALL provide at least these Browser_Profiles: Windows XP with Internet Explorer 6, Windows XP or Windows 7 with Firefox 2 or 3, and macOS with Google Chrome.
3. THE Browser_Window SHALL render window controls, title bar, fonts, and colors from one operating system per Browser_Profile.
4. IF a Browser_Profile specifies a Windows operating system, THEN THE OS_Window SHALL render Windows minimize, maximize, and close buttons on the right side of the title bar.
5. IF a Browser_Profile specifies macOS, THEN THE OS_Window SHALL render the close, minimize, and zoom buttons on the left side of the title bar.
6. WHEN the Browser_Profile changes between two consecutive Eras, THE Browser_Window SHALL switch to the new Browser_Profile at a Navigation_Transition boundary.
7. THE Browser_Chrome SHALL render favicons as image files listed in the Asset_Manifest.
8. WHERE the active Browser_Profile includes an OS taskbar or menu bar, THE OS_Window SHALL display a clock showing a time consistent with the simulated year's Era and a value that is identical on server and client render.

### Requirement 5: One continuous Facebook feed

**User Story:** As a Viewer, I want the Facebook years to be one long feed that slowly changes as I scroll, so that I notice the decay gradually instead of through hard cuts.

#### Acceptance Criteria

1. THE Continuous_Feed SHALL be a single Site_Page that spans the facebook, early-ads, cambridge, algo-hell, glitch, ai-era, and dead-internet Eras without a Navigation_Transition between those Eras.
2. THE Continuous_Feed SHALL order Feed_Posts so that posts from earlier Eras appear above posts from later Eras.
3. WHILE Story_Progress advances through the Continuous_Feed, THE Continuous_Feed SHALL increase the share of ads, sponsored posts, and bot-generated posts per Era in this order: facebook, early-ads, cambridge, algo-hell, glitch, ai-era, dead-internet.
4. WHILE Story_Progress advances through the Continuous_Feed, THE Continuous_Feed SHALL change the Facebook interface style (header bar, sidebar, post layout, reaction controls) at no more than one element per Era boundary, matching the simulated year of each Era.
5. WHEN the dead-internet Era is active, THE Continuous_Feed SHALL display Feed_Posts in which every author is a bot or AI-generated account.
6. WHEN the glitch Era is active, THE Continuous_Feed SHALL display visual cues that reveal bot accounts, such as duplicated text, repeated faces, and inconsistent names.
7. THE Feed_Post data SHALL store author name, avatar asset path, timestamp text, body text, optional image asset path, reaction counts, comment list, post kind, and Era.

### Requirement 6: Period-accurate site design

**User Story:** As a Viewer, I want each site to look like it really did in that year, so that the story is believable.

#### Acceptance Criteria

1. WHEN the myspace Era is active, THE Site_Page SHALL render a MySpace profile layout with the period MySpace header, profile photo, "Details" and "Interests" tables, Top 8 friends grid, and comments section using Verdana or Tahoma fonts.
2. WHEN the facebook Era is active, THE Continuous_Feed SHALL render the period Facebook layout with the blue header bar, left navigation sidebar, and News Feed column using Lucida Grande or Tahoma fonts at 11 px body size.
3. THE Scroll_Story SHALL define each Era's font stack, color palette, and spacing values in one theme definition per Site_Page style.
4. THE Scroll_Story SHALL render all text in Site_Pages as HTML text, so that period fonts and sizes apply.
5. IF a period font is unavailable on the Viewer's device, THEN THE Scroll_Story SHALL fall back to a visually similar font listed in the theme definition.

### Requirement 7: Photo assets and asset manifest

**User Story:** As the Owner, I want a manifest of every image the story needs with placeholders until I supply real files, so that I can source and approve images without editing components.

#### Acceptance Criteria

1. THE Asset_Manifest SHALL list every avatar, post image, favicon, profile photo, and Reveal_Scene image used by the Scroll_Story, with file path under `/public`, Era, content description, pixel dimensions, and approval status.
2. THE Scroll_Story SHALL render avatars and post images as image files referenced from the Asset_Manifest, in place of emoji.
3. IF an asset listed in the Asset_Manifest is missing from `/public` or marked not approved, THEN THE Scroll_Story SHALL render a Placeholder_Asset with the same pixel dimensions.
4. THE Scroll_Story SHALL render every image with the width and height from the Asset_Manifest, so that loading an image causes no layout shift.
5. THE Scroll_Story SHALL render every image with alt text taken from the Asset_Manifest content description.
6. THE Asset_Manifest SHALL contain a content description detailed enough for the Owner to source or generate the image, including subject, apparent age, setting, and photo style for the simulated year.
7. WHEN the Owner adds an approved file at a path listed in the Asset_Manifest, THE Scroll_Story SHALL display that file without code changes other than updating the approval status.

### Requirement 8: Dial-up loading scene

**User Story:** As a Viewer, I want the story to open with a believable dial-up connection, so that the first moment sets the era.

#### Acceptance Criteria

1. WHEN Story_Progress is within the loading Era, THE Loading_Scene SHALL display a Windows XP-era dial-up connection dialog inside the OS_Window with connection status text that advances through dialing, verifying username and password, and connected.
2. THE Loading_Scene SHALL tie connection status text to Story_Progress, so that scrolling backward returns to earlier status text.
3. WHEN the loading Era ends, THE Scroll_Story SHALL perform a Navigation_Transition to the MySpace Site_Page.

### Requirement 9: Reveal scene

**User Story:** As a Viewer, I want the ending to zoom out and show that an AI agent was browsing all along, so that the story lands its point.

#### Acceptance Criteria

1. WHEN Story_Progress enters the reveal Era, THE Reveal_Scene SHALL scale the Browser_Window down to show it as the display of a monitor attached to a Mac mini with an AI agent interface visible.
2. WHEN Story_Progress advances past the Mac mini view, THE Reveal_Scene SHALL continue zooming out to show the Mac mini as one machine among rows of server racks.
3. THE Reveal_Scene SHALL tie the zoom scale and camera position to Story_Progress, so that scrolling backward zooms back in to the Browser_Window.
4. THE Reveal_Scene SHALL produce identical markup on the server render and the first client render.
5. THE Reveal_Scene SHALL animate server rack status LEDs from a single animation timeline rather than one timer per LED.
6. WHEN the reveal Era reaches Story_Progress 1, THE Reveal_Scene SHALL hold the final server room view.

### Requirement 10: Autoplay

**User Story:** As a Viewer, I want to press play and watch the whole story scroll by itself, so that I can experience it without scrolling.

#### Acceptance Criteria

1. WHEN the Viewer activates play, THE Autoplay_Controller SHALL advance Story_Progress from the current value toward 1 using the same Story_Timeline as manual scrolling.
2. WHILE autoplay is running, THE Autoplay_Controller SHALL advance Story_Progress with eased acceleration and deceleration around each Era_Hold, with no visible jump in Page_Viewport position.
3. WHEN autoplay reaches the start of an Era, THE Autoplay_Controller SHALL pause for that Era's Era_Hold from the Era_Registry before continuing.
4. WHEN the Viewer scrolls with a wheel, trackpad, touch, or keyboard while autoplay is running, THE Autoplay_Controller SHALL stop autoplay and leave Story_Progress at the Viewer's position.
5. WHEN the Viewer activates play after stopping autoplay, THE Autoplay_Controller SHALL resume from the current Story_Progress.
6. WHEN Story_Progress reaches 1 during autoplay, THE Autoplay_Controller SHALL stop and show the play control in its stopped state.
7. THE Autoplay_Controller SHALL display a progress indicator showing Story_Progress and the active Era label.
8. WHEN the Viewer selects a point on the progress indicator, THE Autoplay_Controller SHALL set Story_Progress to the selected value.

### Requirement 11: Scripted cursor behaves like a person

**User Story:** As a Viewer, I want the on-screen cursor to move, hover, click, and type like a real person, so that it feels like someone is actually using the browser.

#### Acceptance Criteria

1. THE Scripted_Cursor SHALL derive its position, pointer shape, and action state from Story_Progress through the Cursor_Actions in the Story_Timeline.
2. WHEN the Scripted_Cursor moves between two targets, THE Scripted_Cursor SHALL follow a curved path with eased acceleration and deceleration.
3. THE Scripted_Cursor SHALL resolve the on-screen position of each Cursor_Action target, identified by a named UI element, at the current Page_Viewport scroll offset.
4. WHEN the Scripted_Cursor hovers over a link or button, THE Scroll_Story SHALL show the hand pointer of the active Browser_Profile on the Scripted_Cursor and the hover style on the target element.
5. WHEN the Scripted_Cursor performs a click Cursor_Action, THE Scroll_Story SHALL show the pressed style on the target element and then apply the resulting UI state change, such as a like count increment or a comment box gaining focus.
6. WHEN the Scripted_Cursor performs a type Cursor_Action, THE Scroll_Story SHALL display in the target comment box the Cursor_Action text one character at a time with a blinking text caret.
7. WHEN Story_Progress decreases past a click or type Cursor_Action, THE Scroll_Story SHALL revert the UI state change made by that Cursor_Action.
8. WHEN Story_Progress is the same value, THE Scripted_Cursor SHALL produce the same position, pointer shape, and UI state regardless of whether autoplay or manual scrolling reached that value.
9. WHILE the Reveal_Scene is zooming out, THE Scripted_Cursor SHALL scale with the Browser_Window.

### Requirement 12: Era audio crossfades

**User Story:** As a Viewer, I want the audio to blend from one era to the next, so that sound changes feel smooth instead of cutting off.

#### Acceptance Criteria

1. THE Audio_Engine SHALL start muted, and THE Scroll_Story SHALL display a mute control.
2. WHEN the Viewer unmutes, THE Audio_Engine SHALL start the Era_Bed of the active Era, fading in over 500 ms.
3. WHEN the active Era changes to an Era with a different Era_Bed, THE Audio_Engine SHALL fade out the outgoing Era_Bed and fade in the incoming Era_Bed over a crossfade duration between 1000 ms and 2000 ms.
4. WHEN the active Era changes to an Era that shares the same Era_Bed, THE Audio_Engine SHALL continue the Era_Bed without interruption.
5. WHEN the active Era changes several times within one crossfade duration, THE Audio_Engine SHALL play at most two Era_Beds at once and fade toward the Era_Bed of the latest active Era.
6. WHEN the Viewer mutes, THE Audio_Engine SHALL fade master volume to zero over 200 ms.
7. WHEN a Navigation_Transition or a click Cursor_Action occurs while unmuted, THE Audio_Engine SHALL play the matching one-shot sound effect, such as a page-load click or mouse click.
8. WHERE an Era_Bed audio file is listed in the Asset_Manifest and present in `/public`, THE Audio_Engine SHALL play that file as the Era_Bed.
9. IF an Era_Bed audio file listed in the Asset_Manifest is absent from `/public`, THEN THE Audio_Engine SHALL play the procedurally generated Era_Bed for that Era.
10. WHEN the Scroll_Story unmounts, THE Audio_Engine SHALL stop all sounds and release all timers it created.

### Requirement 13: Viewport sizing

**User Story:** As a Viewer on any screen, I want the browser window to fit my screen, so that the period layouts stay intact.

#### Acceptance Criteria

1. THE Browser_Window SHALL lay out Site_Pages at a fixed design width per Browser_Profile that matches the period screen resolution (for example, 1024 px for Windows XP Eras).
2. WHEN the browser viewport width is between 360 px and 2560 px, THE Browser_Window SHALL scale uniformly to fit within the browser viewport while preserving its aspect ratio.
3. WHEN the browser viewport is resized, THE Browser_Window SHALL recompute its scale and THE Scroll_Story SHALL keep the same Story_Progress.

### Requirement 14: Reduced motion and keyboard access

**User Story:** As a Viewer who is sensitive to motion or uses a keyboard, I want to control and follow the story comfortably.

#### Acceptance Criteria

1. WHERE the Viewer's system reports a reduced-motion preference, THE Scroll_Story SHALL replace zoom, shake, and glitch distortion effects with opacity changes.
2. WHERE the Viewer's system reports a reduced-motion preference, THE Autoplay_Controller SHALL remain available and SHALL start only when the Viewer activates play.
3. THE Scroll_Story SHALL make the play, mute, and progress controls operable with the keyboard and SHALL give each of those controls an accessible name.
4. WHEN the Viewer presses the Space key outside a text field, THE Autoplay_Controller SHALL toggle autoplay.

### Requirement 15: Build and render correctness

**User Story:** As the Owner, I want the rebuilt story to build cleanly and render without hydration errors, so that it deploys reliably.

#### Acceptance Criteria

1. THE Scroll_Story SHALL follow the Next.js 16.4.5 conventions documented in `node_modules/next/dist/docs/`.
2. WHEN `npm run build` runs, THE Scroll_Story SHALL compile with zero TypeScript errors.
3. WHEN `npm run lint` runs, THE Scroll_Story SHALL report zero lint errors.
4. WHEN the site root loads in a browser, THE Scroll_Story SHALL log zero hydration mismatch warnings to the browser console.
5. THE Scroll_Story SHALL compute every displayed date, time, and random value from fixed seeds or Era_Registry values, so that server and client renders match.
6. WHEN any Scroll_Story component unmounts, THE Scroll_Story SHALL remove its scroll listeners, GSAP animations, and timers.
