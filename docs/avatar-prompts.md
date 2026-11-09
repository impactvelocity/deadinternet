# Avatar prompts: every face in the feed

This lists every profile picture the feed at `/` can show, era by era: real friends, scam accounts, bots and pages. Each entry has a ChatGPT prompt, the file to save, and the **key** (or keys) the feed uses to find it.

The people come from `data/flow/posts.ts` (posts and comments) and `data/flow/eras.ts` (notifications, friend lists, suggestions). Images that already exist are listed at the end.

## How to use these

**Size.** Generate at **1024×1024**, then save a **160×160 JPG** in `public/assets/avatars/`. Avatars show at 20–52 px, so 160 px stays sharp everywhere.

**Framing.** Avatars are square until 2014 and round from 2017 on, and they're tiny. Keep the face centred and large (about 60% of the frame), with some margin so a circle crop doesn't cut off the chin or hair. Use simple, readable backgrounds.

**Make old eras look old.** For 2005–2012, save the JPEG at 60–70% quality. Shrinking a 1024 image to 160 px also helps.

**Same person in several eras.** Some names are the same person growing up (see the table below). Generate the earliest picture first, then upload it with the later prompt and add: *"Same person as the attached photo, now older."*

**One picture per key.** The feed shows one picture per key, so someone who appears in 2012 and 2024 under the same name gets the same picture in both. Entries marked **later look (optional)** need a small code change to show a second, older picture in later eras. Make them if you want that, and I'll wire it up.

**Hooking them up.** Drop the files in `public/assets/avatars/` and tell me. I'll add each key to `data/flow/images.ts`. Pages and brands without an image keep their letter badge, and everyone else keeps the drawn placeholder.

## Era photo styles

The prompts already include these. They're here so you can see the progression: real and messy, then filtered, then influencer-perfect, then AI.

| Era | Look |
|---|---|
| 2005 MySpace | 2–3 MP point-and-shoot or webcam, direct flash, high "MySpace angle", blown highlights, JPEG noise, oversaturated |
| 2008 Facebook | Compact digicam at parties, red-eye, Photo Booth webcam shots, cropped out of group photos, no filters |
| 2012 | iPhone 4S, early Instagram filters (Valencia, X-Pro II, Earlybird), vignette, faded blacks |
| 2014 | iPhone 5s, light VSCO-style fade, natural light, square crop |
| 2017 | iPhone 7, early portrait-mode blur, bright HDR, Snapchat-filter era |
| 2019 | Instagram influencer: portrait mode, ring-light catchlights, FaceTune-smooth skin, warm pastel preset |
| 2021 | TikTok era: front camera, ring light, beauty filter, bedroom backdrop |
| 2023 | AI-generated: waxy skin, perfectly symmetrical, soft bokeh, warped hair and ear edges |
| 2024 | AI headshot apps: grey studio backdrop, perfect corporate lighting, slightly uncanny |
| 2025 | Photoreal AI: hyper-smooth skin, teal-and-orange grade, identical head tilts |
| Scam accounts | Stolen photos: low-res, upscaled, oversharpened, cropped out of another context |

## People who grow up across eras

My reading of the names. Tell me if any of these aren't meant to be the same person.

| As a teen (2005) | Later | Notes |
|---|---|---|
| ashley ♥ | Ashley Parker / ashleyp | The viewer. Already done; two optional upgrades below. |
| jess ✿ | Jess Morgan (2008, 2021) | Her 2005 survey says "hair: brown (goin red tho)", so make her a redhead by 2008. |
| KAYLA | kaylafit (2019) | The 2005 photo exists; use it as the reference. |
| meg | Megan Foster (2012, 2014, 2024) → meg.foster (2019) | |
| priya | Priya Shah (2008, 2014) | |
| ~\*brit\*~ | ~\*brit\*~ in 2021 (face `brit-2021`) | |
| xXchrisXx | Chris Delgado (2012, 2017)? | A guess: the band kid grows into the "remember these 90s toys" guy. Skip the reference if not. |

Two people in 2025, **Mike Chen** and **Jess Morgan**, are bots that took real friends' names. They use bot faces (below), not their real photos. **Linda Parker** has a bot copy the same way.

---

## 2005 · MySpace

Avatars are square, 50 px.

### jess ✿
File `jess-2005.jpg` · key `jess ✿` · posts a "20 things about me" survey and sends a friend request

```
A 2005 MySpace profile picture, square crop, face large in frame.
Subject: Jess, a 16-year-old girl with long straight brown hair, choppy side bangs, a little shimmery eyeshadow, making a kissy face with a peace sign. Fully clothed, innocent teen selfie.
Setting: her bedroom, posters on the wall behind her.
Style: 2005 2-megapixel point-and-shoot held high above her head ("MySpace angle"), direct on-camera flash, blown-out highlights, oversaturated colors, visible JPEG noise.
Feel: amateur, real, unflattering. Not AI-smooth. No text.
```

### ~\*brit\*~
File `brit-2005.jpg` · key `~*brit*~` · posts "NEW PICS UP" from the Friday night football game

```
A 2005 MySpace profile picture, square crop, face large in frame.
Subject: Brit, a 16-year-old girl with straightened blonde hair with chunky highlights, school-color face paint stripes on her cheeks, huge grin, cheek to cheek with the camera.
Setting: high-school football game at night, stadium lights glaring behind her.
Style: 2005 point-and-shoot at arm's length, harsh direct flash, dark background, red-eye, oversaturated, JPEG noise.
Feel: candid teen night out. Not AI-smooth. No text.
```

### xXchrisXx
File `chris-2005.jpg` · key `xXchrisXx` · promotes his band "Static Hearts"

```
A 2005 MySpace profile picture, square crop, face large in frame.
Subject: Chris, a 17-year-old Latino scene kid with a black side-swept fringe, a studded belt and a band tee, holding the neck of an electric guitar, smirking.
Setting: a garage band practice space, amp and drum kit behind him.
Style: 2005 webcam or point-and-shoot, high angle, direct flash, washed-out skin, grainy, oversaturated. Slightly tilted.
Feel: wannabe rock star, amateur. Not AI-smooth. No text.
```

### danny
File `danny-2005.jpg` · key `danny` · in Ashley's Friend Space, comments "lmao drama"

```
A 2005 MySpace profile picture, square crop, face large in frame.
Subject: Danny, a 16-year-old skater boy with shaggy sandy hair under a flat-brim cap, throwing a shaka sign, goofy grin.
Setting: a concrete skate park, overcast afternoon.
Style: 2005 point-and-shoot with a fisheye-style wide angle, close to the lens, slight motion blur, washed-out sky, JPEG noise.
Feel: goofy, real. Not AI-smooth. No text.
```

### meg
File `meg-2005.jpg` · key `meg` · in Ashley's Friend Space (grows up into Megan Foster)

```
A 2005 MySpace profile picture, square crop, face large in frame.
Subject: Meg, a 16-year-old girl with dark hair with one bright purple streak, heavy black eyeliner, braces showing in a half smile, black hoodie.
Setting: dark bedroom, lit only by the camera flash.
Style: 2005 webcam-quality photo, high angle, converted to high-contrast with a pink tint, grainy, soft focus.
Feel: emo-lite teen, amateur. Not AI-smooth. No text.
```

### priya
File `priya-2005.jpg` · key `priya` · in Ashley's Friend Space (grows up into Priya Shah)

```
A 2005 MySpace profile picture, square crop, face large in frame.
Subject: Priya, a 16-year-old South Asian girl with long black hair in a side part, rhinestone headband, laughing, holding a flip phone up next to her face.
Setting: shopping-mall food court, bright fluorescent light.
Style: 2005 point-and-shoot, direct flash, slightly overexposed face, oversaturated colors, JPEG noise.
Feel: fun, candid, amateur. Not AI-smooth. No text.
```

---

## 2008 · Facebook "The Wall"

Avatars are square, 50 px.

### Jess Morgan
File `jess-morgan.jpg` · key `Jess Morgan` · "is so ready for the weekend!!" in 2008, posts the 2005 throwback carousel in 2021
*Upload `jess-2005.jpg` as a reference.*

```
Same person as the attached photo, now 19. A 2008 Facebook profile picture, square crop, face large in frame.
Subject: Jess, now with dyed copper-red hair, big smile, a sparkly going-out top, cropped out of a group photo (a friend's shoulder at the edge).
Setting: college house party, string lights behind.
Style: 2008 compact digital camera (Canon PowerShot style), direct flash, slight red-eye, flat colors, a bit soft. No filter.
Feel: real, fun, unposed. Not AI-smooth. No text.
```

**Later look (optional):** `jess-morgan-2021.jpg`. Jess at 32, soft waves, cosy sweater, 2021 iPhone portrait-mode selfie with natural light.

### Mike Chen
File `mike-chen.jpg` · key `Mike Chen` (the real one in 2008, not the 2025 bot) · posts the "Spring Break 08!!" album

```
A 2008 Facebook profile picture, square crop, face large in frame.
Subject: Mike, a 19-year-old Chinese-American guy with short black hair, cheap neon plastic sunglasses, sunburnt nose, huge grin, holding up a peace sign.
Setting: spring-break beach, bright midday sun.
Style: 2008 compact digital camera, harsh sunlight, squinting, flat colors, slightly blown sky, no filter. Cropped from a group shot.
Feel: carefree college kid, real. Not AI-smooth. No text.
```

### Kevin Walsh
File `kevin-walsh.jpg` · key `Kevin Walsh` · pokes Ashley, threatens to untag himself

```
A 2008 Facebook profile picture, square crop, face large in frame.
Subject: Kevin, a 19-year-old guy with messy red hair and freckles, raising a red plastic cup, mouth open mid-yell.
Setting: house party kitchen, crowded, harsh flash.
Style: 2008 compact digital camera, direct flash, red-eye, overexposed face, dark background, slightly blurry.
Feel: party animal, real and unflattering. Not AI-smooth. No text.
```

### Priya Shah
File `priya-shah.jpg` · key `Priya Shah` · takes "Which sitcom character are you?" quizzes, at Barton Springs in 2014
*Upload `priya-2005.jpg` as a reference.*

```
Same person as the attached photo, now 19. A 2008 Facebook profile picture, square crop, face large in frame.
Subject: Priya, long black hair, small nose stud, laughing with her tongue out, peace sign.
Setting: taken on a laptop webcam in a dorm room.
Style: 2008 Mac Photo Booth webcam photo: soft, slightly mirrored, cool white balance, low-res, a little noise.
Feel: silly, real. Not AI-smooth. No text.
```

---

## 2012 · Cards & likes

Avatars are square, 40 px.

### Rachel Kim
File `rachel-kim.jpg` · key `Rachel Kim` · sends a friend request in 2008, has a baby (Lily Grace) in 2012. The same picture shows in both eras, so no baby in it.

```
A 2012 Facebook profile picture, square crop, face large in frame.
Subject: Rachel, a 23-year-old Korean-American woman with a long dark ponytail and red lipstick, warm laugh, looking just off camera.
Setting: rooftop bar at dusk, string lights blurred behind.
Style: iPhone 4S photo with an early Instagram filter (Earlybird): warm cast, faded blacks, soft vignette.
Feel: real, candid. Not AI-smooth. No text.
```

### Tom Bauer
File `tom-bauer.jpg` · key `Tom Bauer` · pumpkin spice post (2012), ice bucket challenge (2014), "Warehouse Lead" offering Megan a job (2024)

```
A 2012 Facebook profile picture, square crop, face large in frame.
Subject: Tom, a 23-year-old guy with a full brown beard and a plaid flannel shirt, holding up a race finisher medal, big proud smile.
Setting: city half-marathon finish line, crowd blurred behind.
Style: iPhone 4S with an early Instagram filter (X-Pro II): punchy contrast, warm tones, dark vignette.
Feel: wholesome, real. Not AI-smooth. No text.
```

**Later look (optional):** `tom-bauer-2024.jpg`. Tom at 35, a little heavier, beard trimmed, high-vis work polo, plain 2024 phone photo in a warehouse.

### Nicole Adams
File `nicole-adams.jpg` · key `Nicole Adams` · "taco tuesday!!!" in Austin

```
A 2012 Facebook profile picture, square crop, face large in frame.
Subject: Nicole, a 23-year-old woman with a strawberry-blonde messy bun and oversized thick-rimmed glasses, laughing, holding a taco.
Setting: outdoor taco truck patio, picnic tables and string lights.
Style: iPhone 4S with a heavy Valencia-style Instagram filter: warm yellow cast, faded blacks, vignette.
Feel: hipster, real. Not AI-smooth. No text.
```

### Chris Delgado
File `chris-delgado.jpg` · key `Chris Delgado` · "LIKE if you remember these!!" (2012), "lol I got Paris" quiz result (2014)
*Optional: upload `chris-2005.jpg` as a reference.*

```
A 2012 Facebook profile picture, square crop, face large in frame.
Subject: Chris, a 24-year-old Latino man with short black hair and stubble, backwards cap, grinning, giving a thumbs up.
Setting: backyard barbecue, afternoon sun.
Style: iPhone 4S photo with an early Instagram filter (Lo-Fi): saturated, high contrast, vignette.
Feel: friendly, real. Not AI-smooth. No text.
```

### Megan Foster
File `megan-foster.jpg` · key `Megan Foster` · needs a truck to move (2014), laid off and #OpenToWork (2024)
*Upload `meg-2005.jpg` as a reference.*

```
Same person as the attached photo, now 23. A 2012 Facebook profile picture, square crop, face large in frame.
Subject: Megan, dark hair now dyed plum, small septum ring, half smile, denim jacket.
Setting: brick wall outside a music venue at night.
Style: iPhone 4S with an early Instagram filter: strong vignette, faded blacks, cool shadows.
Feel: indie, real. Not AI-smooth. No text.
```

**Later look (optional, recommended):** `megan-foster-2024.jpg`. Megan at 35 in a plain professional headshot she took herself against a white wall, wearing a blazer, with a green "#OpenToWork" ring around the photo (LinkedIn style). Real phone photo, not an AI headshot. That makes her the real person among the AI headshots.

---

## 2014 · Going viral

Avatars are square, 40 px.

### Jake Turner
File `jake-turner.jpg` · keys `Jake Turner`, `jake` · ice bucket challenge (2014), "invite me next time 😤" (2019)

```
A 2014 Facebook profile picture, square crop, face large in frame.
Subject: Jake, a 25-year-old guy with a buzz cut, soaking wet, mouth open in shock, an empty bucket over his head.
Setting: suburban backyard, friends' arms in frame.
Style: iPhone 5s photo, natural light, lightly faded VSCO-style edit, slight motion blur from the water.
Feel: goofy, real. Not AI-smooth. No text.
```

### Sarah Lin
File `sarah-lin.jpg` · key `Sarah Lin` · at Barton Springs Pool (2014), calls out Uncle Greg's fake news (2017), excited about Emily's engagement

```
A 2014 Facebook profile picture, square crop, face large in frame.
Subject: Sarah, a 25-year-old Chinese-American woman with a high bun, sunglasses pushed up on her head, sun-kissed, big smile.
Setting: a spring-fed swimming pool with grassy banks and trees, bright summer day.
Style: iPhone 5s photo, natural light, lightly faded VSCO-style edit, square crop.
Feel: sunny, real. Not AI-smooth. No text.
```

---

## 2017 · The algorithm

Avatars are round, 40 px. Keep the face centred for the circle crop.

### Greg Parker
File `greg-parker.jpg` · keys `Greg Parker` · Uncle Greg: "Wake up people!!!", "Do your research sweetie"

```
A 2017 Facebook profile picture, round crop, face centred and large.
Subject: Greg, a 55-year-old heavyset man with a grey goatee, wraparound sunglasses and a camo cap, holding up a large bass fish, serious expression.
Setting: fishing boat on a lake, overcast.
Style: 2017 smartphone photo taken by someone else, slightly too far away then cropped, HDR look, a little oversharpened.
Feel: proud uncle, real. Not AI-smooth. No text.
```

### Emily Rose
File `emily-rose.jpg` · key `Emily Rose` · "WE'RE ENGAGED!!! 💍😭"

```
A 2017 Facebook profile picture, round crop, face centred and large.
Subject: Emily, a 28-year-old woman with honey-brown hair, happy tears, holding her left hand up near her face to show an engagement ring.
Setting: golden-hour park, blurred trees.
Style: iPhone 7 portrait-mode photo, early fake-bokeh edges around her hair, bright and warm, slight HDR.
Feel: joyful, real. Not AI-smooth. No text.
```

---

## 2019 · Influencers

Avatars are round with a story ring, 32 px.

### kaylafit
File `kaylafit.jpg` · keys `kaylafit`, `kaylafit ✓` · detox-tea sponsored post, "use code KAYLA20"
*Upload `myspace-kayla.jpg` (already in the project) as a reference.*

```
Same person as the attached photo, now 30. A 2019 Instagram influencer profile picture, round crop, face centred and large.
Subject: Kayla, glossy blonde blowout, bronzed skin, perfect white teeth, pastel athleisure set, holding a pastel tea tumbler.
Setting: spotless white kitchen, plants.
Style: iPhone XS portrait mode, ring-light catchlights in her eyes, FaceTune-smooth skin, warm pastel Lightroom preset.
Feel: polished, sponsored, a little fake. No text.
```

### meg.foster
File `meg-foster-ig.jpg` · key `meg.foster` · the sourdough post
*Upload `megan-foster.jpg` as a reference.*

```
Same person as the attached photo, now 30. A 2019 Instagram profile picture, round crop, face centred and large.
Subject: Megan, hair back to natural dark brown in a low bun, gold hoop earrings, soft smile, cream knit sweater.
Setting: bright apartment kitchen, window light.
Style: iPhone XS portrait mode, warm pastel preset, gently smoothed skin.
Feel: curated but still real. No text.
```

### wanderwithjake
File `wanderwithjake.jpg` · key `wanderwithjake` · travel influencer, "link in bio for my packing list 🌴"
Regenerated with the built-in image tool using `public/assets/posts/stories-5.jpg` as Jake's identity reference. Saved at 512×512. Full prompt in `wanderwithjake-avatar-prompt.txt`.

```
A 2019 Instagram travel-influencer profile picture, round crop, face centred and large.
Subject: the same man as the moped travel photo, late twenties, sun-bleached wavy shoulder-length hair, light stubble, tanned skin, white linen shirt and cord necklace, relaxed half-smile with eyes visible.
Setting: tropical Bali coast, turquoise water and palms softly out of focus.
Style: friend's iPhone XS photo, natural skin texture, faded warm highlights and teal shadows from a 2019 travel preset.
Feel: casually curated travel bro. Face centred with room for a circular crop. No text.
```

---

## 2021 · Reels

Avatars are round, 40 px.

### dancequeen.22
File `dancequeen.jpg` · keys `dancequeen.22`, `dancequeen.22 ✓` · bedroom dance reel, 2.4M followers

```
A 2021 TikTok-style creator profile picture, round crop, face centred and large.
Subject: a 22-year-old woman with long dark curly hair in a claw clip, cropped hoodie, playful pose, ring light reflected in her eyes.
Setting: bedroom with LED strip lights glowing purple behind her.
Style: 2021 front-camera selfie, beauty filter smoothing, punchy contrast.
Feel: Gen Z creator, polished-casual. No text.
```

### ~\*brit\*~ in 2021
File `brit-2021.jpg` · key `brit-2021` · "WHO POSTED THIS" on the 2005 throwback
*Upload `brit-2005.jpg` as a reference.*

```
Same person as the attached photo, now 32. A 2021 Facebook profile picture, round crop, face centred and large.
Subject: Brit, still blonde with a shoulder-length lob, minimal makeup, warm smile, holding a coffee mug.
Setting: suburban living room, morning light.
Style: 2021 iPhone 12 portrait-mode photo, natural colors, soft background blur.
Feel: grown-up, real. Not AI-smooth. No text.
```

### Lisa 💋 (scam)
File `lisa-bot.jpg` · key `Lisa 💋` · scam message request

```
A fake social-media profile picture for a scam account, round crop, face centred and large.
Subject: a glamorous woman around 25 with long dark hair, heavy contour makeup, pouty lips, low-cut top (tasteful), looking over her shoulder at the camera.
Setting: indistinct hotel room.
Style: stolen photo: low-res, upscaled, oversharpened, slightly too orange skin, a faint watermark corner cut off by the crop.
Feel: obviously a catfish. No text.
```

### growth bot
File `growth-bot.jpg` · keys `growth-bot`, `free.followers.now` · "Check my bio for free followers 💯"

```
A fake social-media profile picture for a spam bot, round crop, face centred and large.
Subject: a generic stock-photo man in his 30s in mirrored sunglasses giving a thumbs up, with a gold "💯" emoji sticker in the corner.
Setting: plain bright stock-photo background.
Style: stolen stock photo: low-res, upscaled, oversharpened, overly saturated.
Feel: spammy, fake. No other text.
```

---

## 2023 · AI slop

Avatars are round, 40 px.

### AMEN bot face
File `amen-bot.jpg` · key `amen-bot` · used by Patricia Hill, Barbara Lee, Donna Ray, Carol Smith, Ruth Diaz and the Grateful Hearts page

```
An AI-generated profile picture for a bot account, round crop, face centred and large.
Subject: a sweet-looking woman around 70 with silver curls, pearl earrings and a pink cardigan, a perfectly serene smile.
Setting: soft glowing garden of roses, dreamy light.
Style: 2023 diffusion-model portrait: waxy poreless skin, perfectly symmetrical face, soft studio-like glow, slightly melted earring, hair merging into the background.
Feel: grandmotherly, and slightly uncanny once you notice. No text.
```

### Gen. James Miller (scam)
File `gen-james-miller.jpg` · key `Gen. James Miller` · scam friend request

```
A fake social-media profile picture for a romance-scam account, round crop, face centred and large.
Subject: a silver-haired man around 55 in a generic military dress uniform (no real insignia, no real flags), confident smile.
Setting: blurred outdoor base, harsh sun.
Style: stolen photo: cropped from a larger image, low-res upscaled, oversharpened, slightly washed-out colors.
Feel: trustworthy-looking, obviously fake on second look. No text.
```

### Anna · Crypto Mentor (scam)
File `anna-crypto.jpg` · key `Anna · Crypto Mentor` · "Hello dear, how was your day?"

```
A fake social-media profile picture for a crypto-scam account, round crop, face centred and large.
Subject: a glamorous woman around 30 with sleek blonde hair, designer sunglasses pushed up, white blazer.
Setting: deck of a yacht, turquoise sea.
Style: half stolen influencer photo, half AI: too-smooth skin, oversaturated sea, a gold "₿" sticker in the corner.
Feel: luxury bait. No other text.
```

---

## 2024 · Thought leadership

Avatars are round, 48 px.

### Brad Kowalski / bot Mike Chen
File `stock-m1.jpg` · key `stock-m1` · Brad Kowalski (Chief Synergy Officer @ Nexora AI) in 2024, then the bot posing as Mike Chen in 2025

```
An AI-generated corporate headshot for a fake professional-network account, round crop, face centred and large.
Subject: a square-jawed man around 38 with perfect stubble, styled brown hair, navy quarter-zip over a white collar, confident closed-mouth smile.
Setting: seamless soft grey studio backdrop.
Style: 2024 AI headshot app: impossibly even lighting, poreless skin, perfectly symmetrical, ears and collar edges very slightly warped.
Feel: generic thought leader, uncanny. No text.
```

### Kai Lindqvist
File `stock-m2.jpg` · key `stock-m2` · "Top Voice ✦ | Building in public | Ex-Nothing"

```
An AI-generated headshot for a fake "top voice" account, round crop, face centred and large.
Subject: a Scandinavian-looking man around 32, blond swept hair, black turtleneck, calm intense stare, head tilted slightly.
Setting: minimal beige studio backdrop.
Style: 2024 AI headshot: hyper-clean, poreless skin, perfectly symmetrical, soft rim light, a strand of hair dissolving into the background.
Feel: minimalist founder cosplay, uncanny. No text.
```

### Thought Leader Daily
File `thought-leader.jpg` · key `Thought Leader Daily` · "Helping 10K+ founders scale with AI | DM GROWTH"

```
An AI-generated headshot for an engagement-farming account, round crop, face centred and large.
Subject: a man around 45 with a shaved head and a short grey beard, arms crossed, navy blazer over a black tee, knowing smile.
Setting: blurred glass office.
Style: 2024 AI headshot: over-perfect lighting, teeth too white, waxy skin, slightly melted text on a background whiteboard.
Feel: self-proclaimed guru. No text.
```

### Growth Hacker (scam)
File `growth-hacker.jpg` · key `Growth Hacker` · spam connection request

```
An AI-generated headshot for a spam account, round crop, face centred and large.
Subject: a man around 28 with a fade haircut, white AirPods-style earbuds (no logo), fitted black tee, pointing at the camera, grinning.
Setting: neon-lit "startup" backdrop, blurred.
Style: 2024 AI generation: plastic skin, oversaturated neon, fingers slightly wrong.
Feel: hustle-bro spam. No text.
```

---

## 2025 · Dead internet

Avatars are round, 40 px. The two shared bot faces (`stock-f1` as Sarah Mitchell, Emma Johnson, Olivia Brown and bot Jess Morgan; `stock-f2` as bot Linda Parker) are already done. `stock-m1` is above.

---

## Ashley upgrades (optional)

Ashley currently reuses her 2010 photo for 2014 and her 2020 photo for 2023. For a clearer ageing arc:

### Ashley in 2014
File `ashley-2014.jpg` · key `ashley-2014`
*Upload `ashley-2010.jpg` as a reference.*

```
Same person as the attached photo, now 25. A 2014 Facebook profile picture, square crop, face large in frame.
Subject: Ashley, long dark-brown hair with soft waves, light makeup, genuine smile, chunky knit scarf.
Setting: outdoor café patio in autumn.
Style: iPhone 5s photo, natural light, lightly faded VSCO-style edit.
Feel: real, happy. Not AI-smooth. No text.
```

### Ashley in 2023
File `ashley-2023.jpg` · key `ashley-2023` (also the face of the bot posing as her in 2025)
*Upload `ashley-2020.jpg` as a reference.*

```
Same person as the attached photo, now 34. A 2023 profile picture, round crop, face centred and large.
Subject: Ashley, shoulder-length dark-brown hair, a few fine lines, calm small smile, black crewneck.
Setting: plain window light at home.
Style: 2023 iPhone 14 portrait-mode selfie, natural color, real skin texture.
Feel: real, slightly tired. Not AI-smooth. No text.
```

---

## Pages and brands (logos)

These show as letter badges today. Each is a logo avatar: generate at 1024×1024 and save at 160×160, centred mark, readable at 32 px, no tiny text. All are made-up names; avoid real brands.

| File | Key(s) | Era | Prompt |
|---|---|---|---|
| `page-freshkicks.jpg` | `FreshKicks` | 2012 | White sneaker silhouette with three speed lines on a glossy orange square, 2012 web-2.0 gloss and drop shadow. |
| `page-the-night-show.jpg` | `The Night Show` | 2014 | Late-night TV show logo: crescent moon and a microphone in white on deep navy, glossy 2014 broadcast style. |
| `page-heartfelt-stories.jpg` | `Heartfelt Stories` | 2014 | Red heart with a small tear drop, white background, soft gradient, viral-video-page style. |
| `page-daily-hacks.jpg` | `Daily Hacks` | 2014 | White lightbulb with a wrench inside on a bright teal square, flat 2014 design. |
| `page-mindprint.jpg` | `MindPrint Personality Quiz`, `MindPrint` | 2017 | Stylised brain drawn as fingerprint swirls, white line art on a teal-to-purple gradient. |
| `page-heartland-voice.jpg` | `Heartland Voice` | 2017 | Clip-art bald eagle head over red and white stripes, slightly pixelated from reuse. |
| `page-viral-clips.jpg` | `Viral Clips` | 2017 | White play button inside a flame, bright red square, flat. |
| `page-dailydosememes.jpg` | `dailydosememes` | 2019 | Crying-laughing face drawn in thick black marker on yellow, meme-account style. |
| `page-lumen.jpg` | `lumen.co` | 2019 | Minimal lowercase "l" with a tiny star, white on soft lilac, 2019 DTC-brand minimalism. |
| `page-detoxdaily.jpg` | `detoxdaily` | 2019 | A single green leaf in a teacup, line art on pastel mint, wellness-brand style. |
| `page-brand-collab.jpg` | `brand.collab.247` | 2019 | Generic gold handshake icon on black, cheap Canva-template look. |
| `page-glowskin.jpg` | `glowskin` | 2021 | Glossy dewy water droplet on blush pink, skincare-brand style. |
| `page-storytime.jpg` | `storytime.reddit` | 2021 | Speech bubble with "…" over a game-controller silhouette, white on orange. |
| `page-motivation-ai.jpg` | `motivation.daily.ai` | 2021 | Golden sunrise over mountains with a lens flare, AI-generated, overly glossy. |
| `page-promo-growth.jpg` | `promo.growth.hub` | 2019 | Upward arrow with a rocket, neon green on black, spammy. |
| `page-amazing-crafts.jpg` | `Amazing Crafts World` | 2023 | Glossy AI globe with a carving knife and wood shavings, oversaturated, a little melted. |
| `page-freedom-eagle.jpg` | `Freedom Eagle Page` | 2023 | AI-generated eagle with too many feathers over a glowing sunset, glossy, uncanny. |
| `page-cozy-crafts.jpg` | `Cozy Crafts Shop` | 2023 | Tiny wooden cat figurine in a warm glow, AI product-photo look. |
| `page-page-support.jpg` | `Page Support` | 2023 | Scam "support" badge: a blue shield with a white check mark, slightly off-brand, low-res. |
| `page-real-patriots.jpg` | `Real Patriots Unite` | 2024 | AI-generated waving flag (made-up flag, no real nation's) with an eagle silhouette, oversaturated. |
| `page-nexora.jpg` | `Nexora AI` | 2024 | Abstract purple gradient orb with a sparkle, 2024 AI-startup logo, rounded square. |
| `page-nature-amazing.jpg` | `Nature Is Amazing` | 2025 | AI-generated peacock feather glowing iridescent, hyper-detailed, impossible colours. |

The platform's own features (`Memories`, `Reels`, `Search`) and the 2025 machine era (`usr_88213`, `svc-outreach-04`, `cron`) can stay as letter badges. The machine era draws everything as wireframe boxes on purpose.

---

## Already done

| Key | File |
|---|---|
| `ashley-2005` | `myspace/profile.jpg` |
| `ashley-2008`, `ashley-2014` | `avatars/ashley-2010.jpg` |
| `ashley-2019`, `ashley-2023` | `avatars/ashley-2020.jpg` |
| `mikey` | `avatars/myspace-mikey.jpg` |
| `KAYLA` | `avatars/myspace-kayla.jpg` |
| `Linda Parker` | `avatars/linda-parker.jpg` |
| `stock-f1` | `avatars/bot-emma-hart.jpg` |
| `stock-f2` | `avatars/bot-grace-miller.jpg` |
