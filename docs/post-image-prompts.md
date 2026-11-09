# Post and ad image prompts: every image in the feed

This lists every image slot in the feed at `/`, era by era: post photos, videos (thumbnails), reels, link previews, check-in maps, sponsored posts and sidebar ads. Each slot has a ChatGPT prompt, the size to generate at, the size to save, and a file name.

Avatars are in `docs/avatar-prompts.md`. Images that already exist, or can reuse another image, are listed at the end.

## How to use these

**File names.** Save everything in `public/assets/posts/`. Each file is named after its post id (for example `cards-1.jpg`), so it's clear which post it belongs to.

**Sizes.** ChatGPT makes 1024×1024, 1536×1024 or 1024×1536. Each entry says which to pick, what shape to crop to, and what to save.
- **Feed images:** save **1000 px wide**, since feed posts show at up to 600 px.
- **Reels:** save **720×1280**.

**Wide crops.** Several slots are very wide (link previews, maps, the album strip, the memory card). For those, tell ChatGPT to keep the subject in the middle band, because the top and bottom get cropped off.

**What the app draws for you:**
- Play buttons on videos and reels, the "1/7" counter on carousels, and the map pin on check-ins.
- Post captions, link-preview titles and ad text.

So don't put captions in the picture unless the prompt asks for in-image text, as ads and memes do.

**Make old eras look old.** Save 2005–2012 JPEGs at 60–70% quality. Memes and reposts can go lower for the "screenshot of a screenshot" crunch.

**Hooking them up.** Post photos just need a `src` added in `data/flow/posts.ts`. Link previews, the reels shelf, the sidebar ads and the endless 2025 feed don't take images yet, so I'll add that when you send the files.

## Era photo styles

The prompts already include these:

| Era | Look |
|---|---|
| 2005 MySpace | 2–3 MP point-and-shoot, harsh direct flash, blown highlights, JPEG noise, oversaturated |
| 2008 Facebook | Compact digicam, flash, red-eye, slightly crooked, no filters |
| 2012 | iPhone 4S, early Instagram filters (Valencia, X-Pro II), vignette, faded blacks |
| 2014 | iPhone 5s, VSCO-style fade; clickbait sites use glossy stock photos |
| 2017 | iPhone 7 HDR; partisan memes are recompressed and grainy |
| 2019 | Instagram: ring light, pastel presets, FaceTune-smooth, flat-lay perfection |
| 2021 | Vertical phone video stills: ring lights, burned-in captions, beauty filters |
| 2023 | AI slop: waxy, oversaturated, too many fingers, melted details |
| 2024 | AI-made corporate graphics and dashboards |
| 2025 | Photoreal AI: hyper-smooth, teal and orange, physically impossible |

---

## 2005 · MySpace

### profile-3 · ~\*brit\*~ · "from the game friday!!! click my pics <3"
Photo, 4:3 · generate **1536×1024** → crop 4:3 → save **1000×750** as `profile-3.jpg`
Jess's 2021 throwback carousel (reels-4) reuses this photo, so keep the three girls in the centre so a square crop also works.

```
A 2005 photo posted to a MySpace profile, 4:3 landscape.
Subject: three 16-year-old girls in school-color face paint and team hoodies, squished together cheek to cheek, screaming and laughing, one doing a peace sign. One is blonde with chunky highlights, one has brown hair, one has long dark hair.
Setting: high-school football stadium bleachers at night, stadium lights glaring, black sky.
Style: 2005 2-megapixel point-and-shoot at arm's length, harsh direct flash, red-eye, blown-out faces, black background, slight motion blur, oversaturated, JPEG noise. Keep all three faces in the centre.
Feel: real teen memory, unflattering, joyful. Not AI-smooth. No text.
```

---

## 2012 · Cards & likes

### cards-1 · Rachel Kim · "Welcome to the world, Lily Grace"
Photo, 3:2 · generate **1536×1024** → save **1000×667** as `cards-1.jpg`

```
A 2012 baby announcement photo shared to Facebook, 3:2 landscape.
Subject: a close-up of a sleeping newborn's tiny hand wrapped around an adult's finger, a striped hospital blanket and the edge of a knit cap visible.
Setting: hospital bassinet, soft window light.
Style: iPhone 4S photo with an early Instagram filter (Earlybird): warm cream cast, faded blacks, soft vignette.
Feel: tender, real. No text.
```

### cards-3 · Nicole Adams · "taco tuesday!!!" (check-in map)
Map, very wide 2.6:1 · generate **1536×1024** → crop to 1536×591 → save **1000×385** as `cards-3.jpg`
The app draws the red pin on top, so leave the centre clear.

```
A 2012-style web map tile for a check-in, very wide 2.6:1 landscape (the top and bottom will be cropped, so keep everything readable in the middle band).
Subject: a flat street map of a city neighbourhood: a main avenue running diagonally, a grid of side streets, a small green park, a sliver of river in one corner. No pin, no labels, no logos.
Style: 2012 web map look: pale beige blocks, white roads, yellow arterial road, soft green parks, light blue water, flat and clean.
Feel: generic, believable map. No text.
```

### cards-5 · Chris Delgado · "LIKE if you remember these!! :D"
Meme, 6:5 · generate **1536×1024** → crop to 1229×1024 → save **1000×833** as `cards-5.jpg`

```
A 2012 nostalgia meme image reposted to Facebook, 6:5.
Subject: a cluttered collage of generic 1990s toys and gadgets on a bright background: a pastel egg-shaped virtual-pet keychain, slap bracelets, a furry owl-like talking robot toy, colourful cardboard milk caps, a translucent purple handheld game, a yo-yo. No real brand names or logos.
Text in image: "LIKE IF YOU REMEMBER THESE" in white Impact font with a black outline across the top.
Style: low-res collage stitched together in MS Paint, jagged edges, heavy JPEG compression, a fake meme-site watermark in the bottom corner.
Feel: cheap viral repost.
```

---

## 2014 · Going viral

### viral-1 · Jake Turner · ice bucket challenge (video)
Video thumbnail, 16:9 · generate **1536×1024** → crop to 1536×864 → save **1000×563** as `viral-1.jpg`
*Upload `jake-turner.jpg` from the avatars as a reference.*

```
A still frame from a 2014 phone video, 16:9 landscape.
Subject: the guy in the attached photo (25, buzz cut) standing in a backyard in a t-shirt, a friend pouring a big bucket of ice water over his head mid-splash, ice cubes flying, his face mid-gasp. Two friends laughing at the edge of frame.
Setting: suburban backyard, wooden fence, sunny afternoon.
Style: 2014 iPhone video frame, slight motion blur, overexposed sky, soft focus, video compression.
Feel: goofy, real. No text.
```

### viral-2 · Heartfelt Stories · link preview
Link image, 2.1:1 · generate **1536×1024** → crop to 1536×731 → save **1000×476** as `viral-2-link.jpg`
Shown with the title "She Thought No One Was Watching. What Happened Next Will Restore Your Faith In Humanity."

```
A candid 2014 smartphone photograph, wide 2.1:1.
Subject: an elderly woman seated at a rainy bus stop, a young stranger holding an umbrella over her. Ordinary expressions and worn clothing, photographed by a passerby from several steps away at a slightly imperfect angle.
Style: flat grey overcast daylight, cool white balance, modest dynamic range, slight motion softness and early smartphone JPEG texture. Mundane shelter and wet street, natural skin and realistic anatomy.
Feel: an unplanned Facebook upload from 2014. No golden glow, cinematic lighting, HDR, glossy stock-photo posing, portrait-mode bokeh, text, or watermark.
```

### viral-3 · Sarah Lin · "at Barton Springs Pool" (check-in map)
Map, wide 2.2:1 · hand-authored **1000×455** SVG as `viral-3.svg`. The existing UI supplies the check-in pin.

```
A 2014-style illustrated check-in map of Barton Springs Pool in Zilker Park.
Pale green parkland, blue creek and pool, white local roads, pale yellow main road, dashed footpaths, small Arial place and street labels. Pool centered beneath the UI pin. Schematic geography, not a navigation map.
```

### viral-4 · Daily Hacks · link preview
Link image, 2.1:1 · generate **1536×1024** → crop to 1536×731 → save **1000×476** as `viral-4-link.jpg`
Title: "21 Life Hacks That Will Change Everything (#14 Is Genius)"

```
A 2014 BuzzFeed-style DIY listicle thumbnail, wide 2.1:1, generated with the built-in image tool.
Two casual overhead photos separated by a narrow white gutter, on an ordinary beige laminate kitchen table. Left: white bowl of cereal and milk with a metal spoon and a few crumbs. Right: open clear plastic food container with cereal at one end and milk at the other, tilted on a folded towel as a keep-cereal-crunchy hack, spoon beside it.
Cheap direct flash, warm white balance, modest digital noise and imperfect cropping. Bright amateur DIY blog photography. No bread, pouring, hands, arrows, text, branding, cinematic bokeh, HDR or glossy CGI surfaces.
```

### viral-5 · Chris Delgado · "lol I got Paris" (quiz link preview)
Link image, 2.1:1 · generate **1536×1024** → crop to 1536×731 → save **1000×476** as `viral-5-link.jpg`
Title: "Which City Should You Actually Live In?"

```
A 2014 BuzzFeed-style personality quiz RESULT card for fictional site BuzzQuiz, wide 2.1:1. Generated with the built-in image tool.
White background with a thin red top rule. Left 55%: Arial/Helvetica-like type, red “BuzzQuiz”, small “Which City Should You Actually Live In?”, dominant bold black headline “You got: Paris!” on two lines, and the blurb “You’re a romantic with great taste. You belong among cafés, art, and late-night adventures.”
Right 45%: single ordinary tourist photo of the Eiffel Tower and Paris rooftops in hazy daylight, natural 2014 consumer-camera colors.
Simple early-2010s editorial layout, legible at Facebook preview size. No other cities, neon sunset, rounded cards, shadows, gradients, emojis, buttons or extra text.
```

---

## 2017 · The algorithm

### algorithm-1 · Memories · "you have memories with Jess Morgan"
Memory card, very wide 2.4:1 · generate **1536×1024** → crop to 1536×640 → save **1000×417** as `algorithm-1.jpg`
*Upload `ashley-2010.jpg` and `jess-morgan.jpg` from the avatars as references.*

```
A 2008 photo resurfaced as a "memory" card, very wide 2.4:1 (keep both faces in the middle band).
Subject: the two young women in the attached photos (both about 19): Ashley with long dark-brown hair and Jess with copper-red hair, arms around each other, laughing at a party, red plastic cups.
Setting: college house party, string lights.
Style: 2008 compact digital camera, direct flash, red-eye, flat colours, slightly blurry.
Feel: nostalgic, real. Not AI-smooth. No text.
```

### algorithm-3 · Heartland Voice · "THEY don't want you to share this. 😡"
Sponsored meme, 1.9:1 · generate **1536×1024** → crop to 1536×808 → save **1000×526** as `algorithm-3.jpg`
The 2017 sidebar ad ("They don't want you to see this.") can reuse this same file.

```
A 2017 hyper-partisan sponsored meme, wide 1.9:1.
Subject: an ordinary smartphone snapshot of a slightly worn fictional flag with five broad red/off-white stripes and a blank navy canton, no stars or emblem. Familiar American-adjacent palette without the US design. Aluminum flagpole outside a small-town public building, pale overcast sky, natural fabric folds and muted colors. No lightning, dramatic sky, fantasy symbols or HDR.
Text in image: "THEY DON'T WANT YOU TO SEE THIS" in big white Impact font with a black outline across the top, and "SHARE BEFORE IT'S DELETED" across the bottom.
Style: 2017 Facebook repost, soft camera detail, modest JPEG compression and crunchy text edges, small Heartland Voice watermark. Built-in image generation; full revision prompt in `heartland-voice-prompt.txt`.
Feel: rage bait.
```

### algorithm-4 · Greg Parker · "Wake up people!!!" (link preview)
Link image, 2.1:1 · generate **1536×1024** → crop to 1536×731 → save **1000×476** as `algorithm-4-link.jpg`
Shown with "patriotdailynews.info · SHOCKING: What they found will make you furious"

```
A 2017 fake-news article thumbnail, wide 2.1:1 (keep the subject in the middle band).
Subject: a stock photo of a middle-aged man in a suit with his hands on his head in shock, next to a blurry photo of a warehouse full of boxes, a thick red circle and red arrow pointing at nothing in particular.
Style: cheap fake-news site graphic: oversaturated, mismatched stock images pasted together, JPEG artefacts.
Feel: conspiracy clickbait. No text.
```

### algorithm-5 · Viral Clips · dog reaction (video)
Video thumbnail, 16:9 · generate **1536×1024** → crop to 1536×864 → save **1000×563** as `algorithm-5.jpg`

```
A still frame from a 2017 viral phone video, 16:9 landscape.
Subject: a golden retriever spinning in excited circles in a narrow hallway, tail a blur, front door half open with a person's legs and a backpack in the doorway.
Style: shaky vertical phone video letterboxed into 16:9 with blurred copies of itself filling the sides, motion blur, warm indoor light.
Feel: wholesome viral clip. No text.
```

---

## 2019 · Influencers

### stories-1 · kaylafit · detox tea #ad
Sponsored photo, 1:1 · generate **1024×1024** → save **1000×1000** as `stories-1.jpg`
*Upload `kaylafit.jpg` from the avatars as a reference.*

```
A 2019 Instagram sponsored post, square 1:1.
Subject: the woman in the attached photo (30, glossy blonde blowout, pastel athleisure) holding a pastel pink detox tea tumbler up next to her face, perfect smile, eyes with ring-light catchlights.
Setting: spotless white marble kitchen, a monstera plant, a few lemons on the counter.
Style: iPhone XS portrait mode, warm pastel Lightroom preset, FaceTune-smooth skin, everything a little too perfect. Generic tumbler, no logos.
Feel: polished influencer ad. No text.
```

### stories-3 · dailydosememes · "tag someone who does this 😂😂"
Meme screenshot, 1:1 · generate **1024×1024** → save **1000×1000** as `stories-3.jpg`

```
A 2019 meme-account repost, square 1:1.
Subject: a screenshot of a generic text post (made-up social app, no real logos; plain avatar circle and a made-up username, partly blurred out) reading:
"me: i'm going to bed early tonight
me at 3am: watching a documentary about deep sea fish"
Style: screenshot of a screenshot: soft JPEG crunch, slightly off-centre crop, a faded meme-account watermark at the bottom, part of a phone status bar at the top.
Feel: relatable, overshared.
```

### stories-5 · wanderwithjake · "link in bio for my packing list 🌴" (carousel)
Carousel, 4:5 · generate **1024×1536** → crop to 1024×1280 → save **1000×1250** as `stories-5.jpg`
*Upload `wanderwithjake.jpg` from the avatars as a reference.*

```
A 2019 Instagram travel-bro carousel photo, vertical 4:5. Built-in image generation; full prompt in `wanderwithjake-prompt.txt`.
Subject: Jake, matching his avatar, sitting on a scuffed stationary rental moped, loose white linen shirt, faded shorts, worn sneakers, helmet hanging from scooter.
Setting: ordinary paved lane beside Bali rice paddies, coconut palms, low buildings and utility wires in hazy midday light.
Style: casual eye-level vacation photo taken by a friend, warm faded 2019 travel preset, muted olive greens, phone softness, real skin and imperfect framing.
Feel: slightly try-hard backpacker influencer, believable everyday travel photo. No text, epic sunset, cinematic light or fantasy landscape.
```

---

## 2021 · Reels

### reels-2 · dancequeen.22 · "learned this in 1 day 😮‍💨"
Reel still, 9:16 · generate **1024×1536** → crop to 864×1536 → save **720×1280** as `reels-2.jpg`
*Upload `dancequeen.jpg` from the avatars as a reference.*

```
A still from a 2021 vertical dance video, 9:16 portrait.
Subject: the young woman in the attached photo (22, dark curly hair in a claw clip, cropped hoodie, sweatpants) mid dance move, one arm up, playful face.
Setting: bedroom with purple LED strip lights, a ring light visible at the edge of frame, phone on a tripod.
Text in image: a burned-in caption in the middle: "learned this in 1 day 😮‍💨" in white rounded sans-serif with a black outline.
Style: front-facing phone video frame, beauty filter, slight motion blur on the raised arm.
Feel: Gen Z creator.
```

### reels-3 · glowskin · "this changed my skin in 3 days 😳" (sponsored reel)
Reel still, 9:16 · generate **1024×1536** → crop to 864×1536 → save **720×1280** as `reels-3.jpg`

```
A still from a 2021 sponsored skincare video, 9:16 portrait.
Subject: a split-screen before/after of a young woman's cheek: left side with redness and texture, right side impossibly glassy and smooth. A hand holds a small blush-pink serum bottle (no logo) up to the camera in front.
Text in image: "BEFORE" and "AFTER" labels in white bold sans-serif.
Style: ring-lit phone video, the "after" side obviously filtered, high saturation.
Feel: too good to be true.
```

### reels-5 · storytime.reddit · "AITA… (part 1)"
Reel still, 9:16 · generate **1024×1536** → crop to 864×1536 → save **720×1280** as `reels-5.jpg`

```
A still from a 2021 "storytime" video, 9:16 portrait.
Subject: top half: a screenshot of a text post on a plain grey background (made-up forum, no real logos) titled "AITA for refusing to give my sister my wedding date?". Bottom half: footage from a generic colourful 3D endless-runner mobile game, a cartoon character jumping between rooftops.
Text in image: a big bouncing subtitle across the middle: "SO MY SISTER" in white bold sans-serif with a black outline.
Style: low-effort content farm, compressed, oversaturated game footage.
Feel: brain-rot content.
```

### reels-6 · motivation.daily.ai · "Your future self is watching you right now through memories. 🧠"
AI image, 1:1 · generate **1024×1024** → save **1000×1000** as `reels-6.jpg`

```
An AI-generated motivational quote image from 2021, square 1:1.
Subject: a glowing sunrise over misty mountains, a lone silhouetted figure on a peak, god rays.
Text in image: "Your future self is watching you right now through memories." in an elegant serif font, centred.
Style: AI-generated stock look, oversaturated orange and purple, lens flare, perfectly smooth gradients, faintly melted mountain edges.
Feel: hollow inspiration.
```

### Reels shelf · motivation.daily.ai thumbnail
Reel thumbnail, 9:16 · generate **1024×1536** → crop to 864×1536 → save **360×640** as `reels-shelf-motivation.jpg`
The other three thumbnails on the 2021 "Reels and short videos" shelf can reuse `reels-2.jpg`, `reels-3.jpg` and `reels-5.jpg`.

```
A thumbnail for a 2021 AI-narrated motivational short video, 9:16 portrait.
Subject: a dramatic sunrise over a calm ocean, a silhouetted man standing on a rock with arms raised, glowing waveform shape across the middle.
Style: AI stock footage look, teal and orange, lens flare, overly smooth.
Feel: generic hustle content. No text.
```

---

## 2023 · AI slop

### slop-1 · Amazing Crafts World · "Made this with my own hands 🥺 nobody likes it"
AI image, 1:1 · generate **1024×1024** → save **1000×1000** as `slop-1.jpg`

```
An AI-generated engagement-bait image from 2023, square 1:1.
Subject: an older man with a grey beard proudly standing beside a giant, impossibly detailed wooden cat sculpture taller than him, wood shavings on the ground. One of his hands, resting on the sculpture, has six fingers.
Setting: rustic barn workshop, warm glowing light.
Style: early-2023 diffusion output enlarged from low resolution: soft smeary texture, waxy pink skin, uneven eyes and teeth, awkward six-fingered hand, illogical apron straps, repetitive grain blending into fur, poorly resolved paws and melted background tools. Warm orange midtones and muddy shadows, no crisp cinematic polish. Built-in image generation; full prompt in `early-2023-crafts-prompt.txt`.
Feel: sentimental AI slop. No text.
```

### slop-4 · Cozy Crafts Shop · "Only 2 left! Handcrafted by our artisans 🐈"
AI product photo, 6:5 · generate **1536×1024** → crop to 1229×1024 → save **1000×833** as `slop-4.jpg`
The 2023 sidebar ad ("Hand-carved wooden cats 🐈") can reuse this same file.

```
An AI-generated product photo for a dropshipping ad, 2023, 6:5.
Subject: a small "hand-carved" wooden cat figurine sitting on a knitted blanket. The wood grain flows in impossible directions, one paw is fused into the base, and the ears don't match.
Setting: cosy windowsill, soft warm bokeh, a candle.
Style: 2023 AI product render: too smooth, glossy, warm, uncanny on a second look.
Feel: exaggerated fake handmade. Large gold-edged artisan seal reads “HAND CRAFTED”, “MADE IN UZA” (intentional UZA spelling), “WITH LOVE”. Small kraft label reads “100% ARTISAN MADE” and “Every piece tells a story”. Built-in image generation; full edit prompt in `cozy-crafts-badge-prompt.txt`.
```

---

## 2024 · Thought leadership

### pro-3 · Nexora AI · "Deploy 1,000 AI agents that prospect, post and comment for you" (sponsored)
Ad graphic, 1.91:1 · generate **1536×1024** → crop to 1536×804 → save **1000×524** as `pro-3.jpg`

```
A 2024 B2B SaaS sponsored post graphic, wide 1.91:1.
Subject: a sleek dark-mode software dashboard showing a dense grid of hundreds of tiny identical AI-generated profile pictures, each with a small green "active" dot, plus a big counter reading "1,000 agents active" and a rising line chart.
Style: polished 2024 AI-startup marketing render: purple and indigo gradients, glassmorphism panels, soft glow, made-up UI, no real company logos.
Headline: “IT’S OVER. YOUR TEAM IS REPLACED.” Supporting copy: “1,000 AI agents. Zero employees.” CTA: “Deploy your AI workforce →”. Dominant white/lavender headline on the left, avatar dashboard on the right.
Feel: slick, dystopian 2024 replacement hype. Built-in image generation; full edit prompt in `nexora-hype-prompt.txt`.
```

### pro-5 · Kai Lindqvist · "10 lessons from waking up at 4:30am for 365 days 📄" (document slide)
Document slide, 1:1 · generate **1024×1024** → save **1000×1000** as `pro-5.jpg`

```
Slide 1 of a 2024 professional-network "document" carousel, square 1:1.
Subject: a warm beige slide with burnt-orange “LESSON 01 / 10” label. Bold headline: “Your competition hits snooze. You build your unfair advantage.” Supporting line: “Win the first hour. Own the rest of the day.” Footer: “365 days. 4:30 AM. No excuses.” Small round blond-man headshot and @kai signature. Built-in image generation; full prompt in `kai-linkedin-quote-prompt.txt`.
Style: clean Canva-style typography slide, generous whitespace.
Feel: hollow thought leadership.
```

---

## 2025 · Dead internet

### dead-4 · Nature Is Amazing · "Rare white peacock spotted in Brazil 😍"
AI image, 1:1 · generate **1024×1024** → save **1000×1000** as `dead-4.jpg`

```
A 2025 AI-generated viral image that has been recompressed several times, square 1:1.
Subject: a pure white peacock with its tail fanned out, the feathers impossibly detailed and glowing with rainbow iridescence, eye-spots repeating in wrong patterns, standing in a misty jungle clearing with light rays.
Style: hyper-photoreal 2025 AI, teal-and-orange grade, then visibly degraded: blocky JPEG artefacts, colour banding, slightly too sharp, an AI image of an AI image.
Feel: fake nature wonder. No text.
```

### Endless feed · tail-2 · Nature Is Amazing
AI image, 1.6:1 · generate **1536×1024** → crop to 1536×960 → save **1000×625** as `tail-2.jpg`
The bot posts that repeat forever at the bottom of the 2025 feed.

```
A 2025 AI-generated "nature" image, wide 1.6:1.
Subject: a waterfall pouring out of a floating island into a glowing turquoise lake, with rainbow mist and two suns in the sky.
Style: hyper-photoreal 2025 AI, teal-and-orange, impossible physics, overly crisp.
Feel: infinite slop. No text.
```

### Endless feed · tail-3 · Amen Daily 🙏
AI image, 1.6:1 · generate **1536×1024** → crop to 1536×960 → save **1000×625** as `tail-3.jpg`

```
A 2025 AI-generated "blessing" image, wide 1.6:1.
Subject: two white doves flying over a field of golden wheat at sunrise, giant beams of light breaking through the clouds, a sparkling rainbow.
Style: hyper-smooth 2025 AI, oversaturated gold and teal, the doves' wings slightly merging, impossible light.
Feel: engagement bait. No text.
```

---

## Already done or reusing another image

| Slot | File |
|---|---|
| wall-2 · Mike Chen's "Spring Break 08!!" album | `posts/facebook-2.jpg` (done) |
| cards-2 · Tom Bauer's pumpkin spice latte | `posts/early-ads-4.jpg` (done) |
| cards-4 · FreshKicks sponsored post | `posts/early-ads-6.jpg` (2012 Web 2.0 retail banner; built-in image generation; see `freshkicks-banner-prompt.txt`) |
| 2012 sidebar ad · FreshKicks | reuse `posts/early-ads-6.jpg` |
| algorithm-2 · MindPrint quiz ad | `posts/cambridge-2.jpg` (done) |
| 2017 sidebar ad · "They don't want you to see this." | reuse `algorithm-3.jpg` |
| stories-2 · meg.foster's sourdough | `posts/glitch-1.jpg` (done) |
| stories-4 · lumen.co star projector ad | `posts/algo-hell-3.jpg` (2019 Instagram promotion, coral 50% OFF label and handwritten caption; built-in image generation; see `lumen-ad-prompt.txt`) |
| reels-4 · Jess's 2005 throwback carousel | reuse `profile-3.jpg` |
| Reels shelf · dancequeen, glowskin, storytime | reuse `reels-2.jpg`, `reels-3.jpg`, `reels-5.jpg` |
| slop-3 · Freedom Eagle's 100th-birthday grandma | `posts/ai-era-1.jpg` (early-2023 diffusion look, waxy face, malformed hands and smeared cake; built-in image generation; see `early-2023-grandma-prompt.txt`) |
| 2023 sidebar ad · wooden cats | reuse `slop-4.jpg` |
| Endless feed · tail-1 · Grateful Hearts | reuse `posts/dead-internet-1.jpg` (the unused soldier and dog) |

**No image needed:** the 2025 "machine" era (`machine-2` Grateful Hearts and `machine-4` Nature Is Amazing). It draws every post as a wireframe with crossed-out image boxes on purpose. The 2012 "Had a baby girl" life-event banner and the polls are drawn by the app.
