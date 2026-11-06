# Image prompts: starter set

These are the 17 main images to test the look of each era. They were written for the old scroll story, which has since been removed. The files are in `public/assets/`. In the feed at `/`, profile pictures are mapped in `data/flow/images.ts` (by face key or name), and post photos are set with `media.src` in `data/flow/posts.ts`. Anything without an image keeps its drawn placeholder. The soldier-and-dog post image and the wallpaper aren't used yet, because the feed has no matching slot for them.

## How to use these

**Sizes.** ChatGPT only generates at 1024×1024, 1536×1024 or 1024×1536. Each prompt says which one to pick ("Generate at"). Then crop and resize to the "Export" size. The browser window is CSS-scaled, so exporting at **2× the display size** keeps the images sharp, and the app still draws them at the display size. Save as `.jpg` at the exact path shown.

**Making old eras look old.** Generate clean, then shrink. Shrinking a 1024 image to 80–180 px does most of the work. For 2006–2012, save the JPEG at about 60–70% quality to get real compression artefacts.

**Keeping Ashley the same person.** Generate `myspace.profile` first. For `ashley-2010` and `ashley-2020`, upload that image and add: *"Same person as the attached photo, now older."*

**Keeping eras consistent.** Use one ChatGPT chat per era, so the camera look carries from image to image.

**No caption text in post photos.** The post text (for example "Today is my 100th birthday…") is already in the feed as HTML. Only ads and memes have text in the image itself, and those prompts say so.

**Resizing on macOS.** This example takes a 1024×1536 image, center-crops it to 4:5 (`-c` takes height, then width), then scales it to 1000×1250 as a 70%-quality JPEG:

```bash
sips -c 1280 1024 in.png --out tmp.png && sips -s format jpeg -s formatOptions 70 -z 1250 1000 tmp.png --out out.jpg
```

---

## Shot list

| # | Asset id | Era / year | Displays at | Generate at | Export (2×) | Path |
|---|---|---|---|---|---|---|
| 1 | `myspace.profile` | MySpace 2006 | 170×213 | 1024×1536 | 340×426 | `public/assets/myspace/profile.jpg` |
| 2 | `myspace.top8.2` | MySpace 2006 | 90×90 | 1024×1024 | 180×180 | `public/assets/avatars/myspace-kayla.jpg` |
| 3 | `myspace.top8.3` | MySpace 2006 | 90×90 | 1024×1024 | 180×180 | `public/assets/avatars/myspace-mikey.jpg` |
| 4 | `avatar.ashley-2010` | Facebook 2010 | 48×48 | 1024×1024 | 96×96 | `public/assets/avatars/ashley-2010.jpg` |
| 5 | `avatar.linda-parker` | Facebook 2010 | 48×48 | 1024×1024 | 96×96 | `public/assets/avatars/linda-parker.jpg` |
| 6 | `post.facebook.2` | Facebook 2010 | 398×299 | 1536×1024 | 796×598 | `public/assets/posts/facebook-2.jpg` |
| 7 | `post.early-ads.4` | Early ads 2012 | 403×403 | 1024×1024 | 806×806 | `public/assets/posts/early-ads-4.jpg` |
| 8 | `post.early-ads.6` | Early ads 2012 | 470×246 | 1536×1024 | 940×492 | `public/assets/posts/early-ads-6.jpg` |
| 9 | `post.cambridge.2` | Cambridge 2016 | 476×249 | 1536×1024 | 952×498 | `public/assets/posts/cambridge-2.jpg` |
| 10 | `post.algo-hell.3` | Algorithm 2018 | 500×500 | 1024×1024 | 1000×1000 | `public/assets/posts/algo-hell-3.jpg` |
| 11 | `avatar.ashley-2020` | Glitch 2020 | 40×40 | 1024×1024 | 80×80 | `public/assets/avatars/ashley-2020.jpg` |
| 12 | `post.glitch.1` | Glitch 2020 | 500×375 | 1536×1024 | 1000×750 | `public/assets/posts/glitch-1.jpg` |
| 13 | `avatar.bot-grace-miller` | AI content 2023 | 40×40 | 1024×1024 | 80×80 | `public/assets/avatars/bot-grace-miller.jpg` |
| 14 | `post.ai-era.1` | AI content 2023 | 500×500 | 1024×1024 | 1000×1000 | `public/assets/posts/ai-era-1.jpg` |
| 15 | `avatar.bot-emma-hart` | Dead internet 2025 | 40×40 | 1024×1024 | 80×80 | `public/assets/avatars/bot-emma-hart.jpg` |
| 16 | `post.dead-internet.1` | Dead internet 2025 | 500×625 | 1024×1536 | 1000×1250 | `public/assets/posts/dead-internet-1.jpg` |
| 17 | `reveal.wallpaper` | Reveal 2025 | 1280×800 | 1536×1024 | 1280×800 (crop to 16:10) | `public/assets/reveal/wallpaper.jpg` |

The arc these images need to show: **real, messy, flash-lit people (2006–2012) → polished, monetised, recompressed (2016–2020) → waxy, too-perfect AI (2023–2025).** Real-person photos should never look AI-made. AI-era images should look a little *too* AI-made.

---

## MySpace (2006)

### 1. `myspace.profile`: Ashley at 16, the story's main character
Generate at **1024×1536** (portrait) → crop to 4:5 → export **340×426**

```
A candid 2006 MySpace profile photo. Format: vertical 4:5 portrait.

Subject: Ashley, a 16-year-old girl with side-swept black emo bangs over one eye, heavy black eyeliner, wearing a pink-and-black striped hoodie. She's making a peace sign and a pouty "duck face". Fully clothed, innocent, typical teen selfie.

Setting: bedroom mirror selfie. Pink walls covered in band posters (made-up bands, no real logos), a messy dresser edge in frame.

Camera & era: shot on a 2006 3-megapixel point-and-shoot (Canon PowerShot / Sony Cyber-shot style) held high above her head (the classic "MySpace angle"). The silver camera is visible in her hand in the mirror. The direct on-camera flash bounces off the mirror as a bright starburst. Blown-out highlights, slight red-eye, saturated colors, visible JPEG noise, slightly soft focus.

Feel: authentic, unflattering, amateur. NOT professional, NOT cinematic, NOT AI-smooth. No text, no watermark.
```

### 2. `myspace.top8.2`: Kayla (Top 8 friend)
Generate at **1024×1024** → export **180×180**

```
A 2006 MySpace "Top 8" friend profile picture, square crop.

Subject: Kayla, a 16-year-old girl with flat-ironed straight blonde hair and a sparkly rhinestone headband, arm's-length selfie, cheek very close to the lens, big smile.

Setting: shopping-mall food court, harsh bright fluorescent overhead light.

Camera & era: 2006 3-megapixel point-and-shoot, direct flash, blown highlights, oversaturated colors, JPEG noise. A cheesy glittery "best friends" text sticker added in MS Paint style in a corner (pink, pixelated, Comic Sans–like).

Feel: amateur, 2006 teen internet. Not polished, not AI-smooth. Must read clearly when shrunk to 90×90 px: face large in frame.
```

### 3. `myspace.top8.3`: Mikey (Top 8 friend)
Generate at **1024×1024** → export **180×180**

```
A 2006 MySpace "Top 8" friend profile picture, square crop.

Subject: Mikey, a 17-year-old emo boy with a black side-swoop fringe covering one eye, a lip ring, black band tee, studded belt just visible.

Setting: dark bedroom lit by one desk lamp, posters behind (no real logos).

Camera & era: 2006 point-and-shoot photo converted to high-contrast black-and-white, crushed blacks, one visible eye sharp and the rest soft, grainy, moody, slightly overexposed skin. Taken from a high angle above.

Feel: dramatic emo selfie, amateur. No text. Face large in frame so it reads at 90×90 px.
```

---

## Facebook (2010)

### 4. `avatar.ashley-2010`: Ashley at 20
Generate at **1024×1024** → export **96×96**
*Upload image 1 as a reference.*

```
Same person as the attached photo, four years older (age 20). A 2010 Facebook profile picture, square crop.

Subject: Ashley, now a college sophomore. The emo bangs are gone; long, natural dark-brown hair, light makeup, genuine smile, wearing a grey college hoodie (no real university name or logo).

Setting: dorm room, warm white string lights blurred behind her.

Camera & era: 2010 compact digital camera or iPhone 3GS. Mild noise, flat colors, no filter, slightly soft, cropped square from a larger photo. Face centered and large so it reads at 48×48 px.

Feel: real, casual, slightly imperfect. Not professional, not AI-smooth. No text.
```

### 5. `avatar.linda-parker`: Linda, Ashley's mom
Generate at **1024×1024** → export **96×96**

```
A 2010 Facebook profile picture of a mom, square crop.

Subject: Linda Parker, 47, short brown bob, reading glasses pushed up on her head, smiling and holding a small scruffy terrier up next to her face.

Setting: suburban backyard garden, late-afternoon sun.

Camera & era: 2010 compact digital camera, mild noise, flat colors, no filter. Slightly off-center framing with a blurry thumb shadow intruding in one corner, as if a family member took it.

Feel: warm, ordinary, unposed. Not AI-smooth. No text. Faces large enough to read at 48×48 px.
```

### 6. `post.facebook.2`: spring-break beach photo
Generate at **1536×1024** → crop to 4:3 → export **796×598**

```
A 2010 Facebook photo post, 4:3 landscape.

Subject: five college friends (about 20–22, mixed genders and ethnicities) squeezed together on one beach towel, slightly sunburned, laughing. In the middle, Mike: a young Asian-American man with short black hair and wraparound sunglasses, grinning.

Setting: spring-break beach, midday sun, bright blue sky, harsh overhead light.

Camera & era: 2010 compact digital camera on a self-timer propped on a cooler. Slightly tilted horizon, someone half-cut at the edge of frame, flat colors, mild noise, squinting faces, no filter.

Feel: candid, real, happy, unglamorous. Not a stock photo, not AI-perfect. No text.
```

---

## Early ads (2012)

### 7. `post.early-ads.4`: pumpkin spice latte (Instagram era)
Generate at **1024×1024** → export **806×806**

```
A 2012 Instagram photo shared to Facebook, square 1:1.

Subject: a generic paper coffee-shop cup (no real brand logo) of pumpkin spice latte with whipped cream and cinnamon on top, held up by a hand next to a pile of orange autumn leaves.

Setting: outdoor café table on a sunny September afternoon, blurred sidewalk behind.

Camera & era: iPhone 4S photo with a heavy early-Instagram vintage filter (Valencia / X-Pro II style): warm yellow cast, faded blacks, strong dark vignette, thin black border frame around the image.

Feel: 2012 "basic autumn" post, slightly overprocessed, hipster. No text.
```

### 8. `post.early-ads.6`: the first sponsored ad (FreshKicks)
Generate at **1536×1024** → crop to 1.91:1 → export **940×492**

```
A 2012 Facebook Sponsored Story ad image, wide 1.91:1 landscape.

Subject: three bright running shoes (neon orange, electric blue, lime green), generic designs with no real brand logos, floating at dynamic angles with soft drop shadows. Bold white headline text: "40% OFF THIS WEEKEND". Small "FreshKicks" logo in the bottom-right corner (white sneaker silhouette with speed lines).

Setting: orange-to-yellow gradient studio background.

Style & era: glossy 2012 web-2.0 product render: shiny gradients, reflections under the shoes, slight lens glare. Typography in a bold condensed sans-serif with a subtle drop shadow.

Feel: an early, slightly cheesy online retail ad. Clean, commercial, clearly an ad.
```

---

## Cambridge Analytica (2016)

### 9. `post.cambridge.2`: personality-quiz link preview
Generate at **1536×1024** → crop to 1.91:1 → export **952×498**

```
A 2016 social-media link preview image for a personality quiz app, wide 1.91:1 landscape.

Subject: on the right, a glowing stylised brain made of fingerprint swirl lines (white line art with a soft glow). On the left, a large friendly rounded sans-serif headline: "What does your profile say about your personality?" and a smaller line: "Take the 2-minute test". Below it, a mock blue rounded button that says "Log in to start". Small "MindPrint" wordmark in a corner.

Setting: smooth teal-to-purple gradient background.

Style & era: 2016 flat design: clean vector shapes, long soft shadows, bright friendly palette, startup marketing aesthetic.

Feel: harmless, fun, inviting, and quietly sinister in hindsight. No real company logos.
```

---

## The algorithm (2018)

### 10. `post.algo-hell.3`: galaxy-projector drop-shipping ad
Generate at **1024×1024** → export **1000×1000**

```
A 2018 sponsored drop-shipping product ad, square 1:1.

Subject: a cheap plastic "galaxy star projector" gadget on a nightstand, projecting swirling purple-and-blue nebula light and stars across a bedroom ceiling. A bright yellow circular price badge in the corner: "50% OFF — TODAY ONLY" in bold red-and-black type.

Setting: dark teenage bedroom lit only by the projector glow.

Style & era: 2018 low-budget Facebook/Instagram ad. The glow is obviously composited, a bit too bright, slightly mismatched with the room. Oversaturated, mildly recompressed with JPEG artefacts around the text.

Feel: cheap, tempting, scammy. No real brand names.
```

---

## Glitch (2020)

### 11. `avatar.ashley-2020`: Ashley at 30, lockdown
Generate at **1024×1024** → export **80×80**
*Upload image 1 or 4 as a reference.*

```
Same person as the attached photo, now age 30. A 2020 Facebook profile picture, square crop.

Subject: Ashley, shoulder-length dark-brown hair, no makeup, a tired but kind smile, wearing a soft grey sweater.

Setting: home office during the 2020 lockdown, at night. Her face is lit by cool blue laptop-screen glow, with a dim warm lamp behind her.

Camera & era: 2020 smartphone or webcam selfie, portrait-mode background blur, slightly soft from social-media recompression, a little grain in the shadows.

Feel: real, worn-out, human. Not AI-smooth. No text. Face large so it reads at 40×40 px.
```

### 12. `post.glitch.1`: lockdown sourdough
Generate at **1536×1024** → crop to 4:3 → export **1000×750**

```
A 2020 Facebook photo post, 4:3 landscape, shot from directly overhead.

Subject: a lopsided homemade sourdough loaf with one deep dramatic "ear", cut open to show an uneven, gummy, holey crumb. A bread knife and crumbs on the board, a little flour dust.

Setting: wooden cutting board on a kitchen counter, spring 2020 lockdown, natural window light from one side.

Camera & era: 2020 smartphone photo (iPhone 11 era), slightly soft from Facebook recompression, true-to-life colors, a little imperfect white balance.

Feel: proud amateur baker, real and unstyled. Not food-magazine perfect. No text.
```

---

## AI content (2023)

### 13. `avatar.bot-grace-miller`: AI-face bot account
Generate at **1024×1024** → export **80×80**

```
A profile picture for a fake social-media bot account, square crop.

Subject: "Grace Miller", an AI-generated young woman (about 28) with flowing glossy auburn waves and a perfect symmetrical smile.

Setting: blurred golden-hour park background, creamy bokeh.

Style & era: 2023 diffusion-model portrait. Waxy flawless skin with no pores, perfectly symmetrical face, soft studio-like lighting outdoors, slight warping where hair meets ears and shoulders, one earring subtly malformed.

Feel: pretty but uncanny: obviously AI-generated if you look twice. No text.
```

### 14. `post.ai-era.1`: "100th birthday" AI grandma
Generate at **1024×1024** → export **1000×1000**

```
An AI-generated "engagement bait" Facebook image from 2023, square 1:1.

Subject: a very elderly woman (meant to be 100) sitting behind a huge frosted birthday cake with the number "100" on it in icing (the digits slightly malformed). An impossible number of lit candles. She smiles sweetly. Her hands, resting on the table, have six fingers.

Setting: an overly cosy kitchen with a warm orange glow, too many decorations, everything a bit too perfect.

Style & era: 2023 diffusion-model image: waxy smooth skin, soft dreamy glow, plastic-looking textures, garbled background details, slightly melted candles.

Feel: sentimental AI slop designed to farm likes. No caption text overlaid.
```

---

## Dead internet (2025)

### 15. `avatar.bot-emma-hart`: dead-internet bot account
Generate at **1024×1024** → export **80×80**

```
A profile picture for a fake social-media bot account, square crop.

Subject: "Emma Hart", an AI-generated blonde woman (about 27) with glossy beach waves, identical dimples on both cheeks, head tilted slightly to the left, a perfect commercial smile.

Setting: soft beige seamless studio blur.

Style & era: 2025 photorealistic AI generation: hyper-smooth skin, cinematic teal-and-orange color grade, impossibly even lighting, tiny uncanny details (mismatched earrings, hair strands that dissolve into the background).

Feel: almost real, and too perfect. It should look like one of a hundred clones. No text.
```

### 16. `post.dead-internet.1`: soldier and dog at the airport
Generate at **1024×1536** (portrait) → crop to 4:5 → export **1000×1250**

```
An AI-generated viral Facebook image from 2025, vertical 4:5 portrait.

Subject: a young soldier in generic camouflage fatigues (no real insignia) kneeling on an airport floor, hugging a golden retriever that appears to be crying real tears. A duffel bag beside them.

Setting: airport terminal gate area. The gate signs and departure boards have melted, unreadable lettering. Glowing windows behind.

Style & era: 2025 photorealistic AI generation: hyper-smooth skin, cinematic teal-and-orange grade, impossibly even lighting, dramatic lens bloom. Subtle tells: the dog's paw merges into the soldier's sleeve, background people have smeared faces.

Feel: manipulative, tear-jerking engagement bait, almost convincing. No caption text overlaid.
```

---

## Reveal (2025)

### 17. `reveal.wallpaper`: desktop wallpaper
Generate at **1536×1024** → crop to 16:10 (1536×960) → export **1280×800**

```
A desktop wallpaper in the style of a modern macOS default wallpaper, wide 16:10 landscape.

Subject: smooth, abstract, flowing gradient waves in deep blue, indigo and violet, with soft light where the folds overlap. No objects, no text, no logos.

Style: clean, high-end, soft gradients with subtle grain, calm and slightly cold. Overall dark enough that white UI windows and text sit comfortably on top.

Feel: the quiet, clinical, empty screen behind the story, seen at 3 AM.
```
