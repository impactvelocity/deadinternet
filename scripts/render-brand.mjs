#!/usr/bin/env node
/**
 * Renders the site's icons and share image from the dead-internet mark (the
 * globe with its edge cut off by an ×, as in components/flow/FlowPage.tsx):
 *
 *   app/icon.svg              the favicon modern browsers use
 *   app/favicon.ico           16, 32 and 48px, for everything else
 *   app/apple-icon.png        180px, for home screens
 *   app/opengraph-image.png   1200×630, the card shown when the link is shared
 *
 * Next.js picks these up by file name and writes the <head> tags. Uses the
 * system Chrome through playwright-core, like render-film.mjs, so the share
 * image gets the same system font as the site.
 *
 *   npm run brand
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const APP = path.join(ROOT, 'app');

/** The mark, in its 24-unit box (it spans x 3–23, y 3–21). */
const MARK = [
  'M20.4 8.8A9 9 0 1 0 20.4 15.2M3 12h12M12 3c-4 4.5-4 13.5 0 18M12 3c2.2 2.5 3.2 5.5 3.2 9S14.2 18.5 12 21',
  'M19 10l4 4m0-4-4 4',
];
/**
 * At 16px the meridians blur together, so the smallest size keeps just the
 * outline, the equator and a bigger × in a wider gap.
 */
const MARK_SMALL = ['M19.4 7A9 9 0 1 0 19.4 17M3 12h10', 'M17 8.5l5.5 5.5m0-5.5-5.5 5.5'];
const NIGHT = '#0b0a0e';
const INK = '#ece8f1';

/**
 * The mark on a dark square, `box` units across. `fill` is the share of the
 * box the mark spans; `stroke` its line width in px at that size.
 */
function iconSvg({ size, fill, stroke, radius, mark = MARK }) {
  const k = (size * fill) / 20;
  const tx = size / 2 - 13 * k;
  const ty = size / 2 - 12 * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${NIGHT}"/>
  <g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${k.toFixed(4)})" fill="none" stroke="${INK}" stroke-width="${(stroke / k).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round">
    ${mark.map((d) => `<path d="${d}"/>`).join('\n    ')}
  </g>
</svg>
`;
}

/** An .ico holding PNGs (every current browser reads PNG entries). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = header.length + dir.length;
  images.forEach(({ size, png }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...images.map((i) => i.png)]);
}

/** The share card: the film's closing title over its screen of dots. */
function ogHtml() {
  const mark = `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#d6d0dd" stroke-width="1.5" stroke-linecap="round">${MARK.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; background: #050507; }
  .og { position: relative; width: 1200px; height: 630px; overflow: hidden; background: #050507;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: #f1eef6; }
  canvas { position: absolute; inset: 0; }
  .center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; text-shadow: 0 0 28px rgb(5 5 7 / 95%), 0 0 6px rgb(5 5 7 / 95%); }
  h1 { margin: 26px 0 0; font-size: 116px; font-weight: 650; line-height: 1; letter-spacing: -0.045em; }
  .credit { margin: 30px 0 0; font-size: 30px; color: #d9d4e2; letter-spacing: -0.01em; }
  .date { margin: 16px 0 0; font: 500 17px/1.4 ui-monospace, Menlo, monospace; letter-spacing: .16em; text-transform: uppercase; color: #8f899b; }
</style></head><body>
<div class="og">
  <canvas id="dots" width="2400" height="1260" style="width:1200px;height:630px"></canvas>
  <div class="center">
    ${mark}
    <h1>Dead Internet</h1>
    <p class="credit">A scrolling short film by Dylan Jones for Kiroween</p>
    <p class="date">2026 — the year the internet died</p>
  </div>
</div>
<script>
  // Rows of small dots of light, a few brighter than the rest, quieter in the
  // middle where the title sits. Seeded, so every render is the same.
  const c = document.getElementById('dots');
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pitch = 14;
  for (let y = pitch / 2; y < 630; y += pitch) {
    for (let x = pitch / 2; x < 1200; x += pitch) {
      const dx = (x - 600) / 600;
      const dy = (y - 315) / 315;
      const edge = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const r = rand();
      const light = (0.05 + 0.13 * r + (r > 0.985 ? 0.35 : 0)) * (0.35 + 0.65 * edge * edge);
      ctx.fillStyle = 'rgba(226, 233, 255, ' + light.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
</script>
</body></html>`;
}

async function shoot(page, html, width, height, transparent) {
  // Headless Chrome tiles screenshots of very small viewports, so draw in a
  // roomy one and clip to the image.
  await page.setViewportSize({ width: Math.max(width, 640), height: Math.max(height, 640) });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page.screenshot({ clip: { x: 0, y: 0, width, height }, omitBackground: transparent, type: 'png' });
}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const bare = (svg) => `<!doctype html><html><body style="margin:0;background:transparent"><div style="display:flex">${svg}</div></body></html>`;

  // Favicons: the mark nearly fills a rounded dark square, lines thick enough for 16px.
  const favicon = (size) =>
    size < 24
      ? iconSvg({ size, fill: 0.8, stroke: 1.5, radius: size * 0.22, mark: MARK_SMALL })
      : iconSvg({ size, fill: 0.72, stroke: Math.max(1.25, size / 14), radius: size * 0.22 });
  await writeFile(path.join(APP, 'icon.svg'), favicon(32));
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const size of sizes) pngs.push({ size, png: await shoot(page, bare(favicon(size)), size, size, true) });
  await writeFile(path.join(APP, 'favicon.ico'), ico(pngs));

  // Home screen: full-bleed square (the phone rounds it), the mark a little smaller.
  const apple = iconSvg({ size: 180, fill: 0.58, stroke: 9, radius: 0 });
  await writeFile(path.join(APP, 'apple-icon.png'), await shoot(page, bare(apple), 180, 180, false));

  // The share card.
  await writeFile(path.join(APP, 'opengraph-image.png'), await shoot(page, ogHtml(), 1200, 630, false));
  console.log('wrote app/icon.svg, app/favicon.ico, app/apple-icon.png, app/opengraph-image.png');
} finally {
  await browser.close();
}
